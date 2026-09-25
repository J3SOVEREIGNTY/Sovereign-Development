import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";

export const runtime = "nodejs";

const MAX_DURATION_MS = 60 * 60 * 1000;
const EVENT_ID_PATTERN = /^[a-zA-Z0-9-]{16,64}$/;

function isDuration(value: unknown): value is number | null {
  return value === null || (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_DURATION_MS
  );
}

export async function POST(request: Request) {
  if (process.env.COST_PILOT_ENABLED !== "true") {
    return new NextResponse(null, { status: 404 });
  }

  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const event = body as Record<string, unknown>;
  const installExitCode = event.npmInstallExitCode;
  if (
    typeof event.eventId !== "string" ||
    !EVENT_ID_PATTERN.test(event.eventId) ||
    event.eventType !== "editor_session" ||
    !isDuration(event.elapsedMs) ||
    event.elapsedMs === null ||
    !isDuration(event.npmInstallMs) ||
    !(installExitCode === null || (
      typeof installExitCode === "number" &&
      Number.isInteger(installExitCode) &&
      installExitCode >= 0 &&
      installExitCode <= 255
    )) ||
    (event.outcome !== "success" && event.outcome !== "failure")
  ) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    return NextResponse.json({ error: "pilot_unavailable" }, { status: 503 });
  }

  try {
    const [account] = await db
      .select({ tier: users.tier })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!account || (account.tier ?? "free") !== "free") {
      return new NextResponse(null, { status: 204 });
    }

    const occurredAt = new Date();
    const month = occurredAt.toISOString().slice(0, 7);
    const actorMonthKey = createHmac("sha256", clerkSecret)
      .update("peregrine-cost-pilot-v1:" + month + ":" + userId)
      .digest("hex");

    console.info("PEREGRINE_COST_PILOT_V1", JSON.stringify({
      eventId: event.eventId,
      eventType: "editor_session",
      actorMonthKey,
      month,
      occurredAt: occurredAt.toISOString(),
      elapsedMs: event.elapsedMs,
      npmInstallMs: event.npmInstallMs,
      npmInstallExitCode: installExitCode,
      outcome: event.outcome,
      appRevision: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    }));

    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "pilot_unavailable" }, { status: 503 });
  }
}
