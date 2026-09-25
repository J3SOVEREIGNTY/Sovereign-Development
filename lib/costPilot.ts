export type CostPilotSession = {
  elapsedMs: number;
  npmInstallMs: number | null;
  npmInstallExitCode: number | null;
  outcome: "success" | "failure";
};

function createEventId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

/**
 * Optional, fire-and-forget pilot telemetry. It sends durations and an outcome
 * only; no source code, project identifiers, file paths, or error text.
 */
export function recordCostPilotSession(sample: CostPilotSession): void {
  if (
    typeof window === "undefined" ||
    process.env.NEXT_PUBLIC_COST_PILOT_ENABLED !== "true"
  ) {
    return;
  }

  const payload = {
    eventId: createEventId(),
    eventType: "editor_session",
    elapsedMs: sample.elapsedMs,
    npmInstallMs: sample.npmInstallMs,
    npmInstallExitCode: sample.npmInstallExitCode,
    outcome: sample.outcome,
  };

  void fetch("/api/cost-pilot/events", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
