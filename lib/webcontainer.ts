import { configureAPIKey, WebContainer } from "@webcontainer/api";
import { recordCostPilotSession } from "./costPilot";

let containerPromise: Promise<WebContainer> | null = null;
let apiKeyConfigured = false;

function configureCommercialLicense(): void {
  if (apiKeyConfigured) return;

  const apiKey = process.env.NEXT_PUBLIC_WEB_CONTAINER_API_KEY;
  if (apiKey) {
    configureAPIKey(apiKey);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "A licensed WebContainer API key is required for production. Configure NEXT_PUBLIC_WEB_CONTAINER_API_KEY."
    );
  }

  apiKeyConfigured = true;
}

export async function getWebContainer(): Promise<WebContainer> {
  if (!containerPromise) {
    configureCommercialLicense();
    containerPromise = WebContainer.boot({
      coep: "credentialless",
      workdirName: "project",
    });
  }
  return containerPromise;
}

export async function bootProject(files: Record<string, string>): Promise<WebContainer> {
  const startedAt = performance.now();
  let npmInstallMs: number | null = null;
  let npmInstallExitCode: number | null = null;
  let outcome: "success" | "failure" = "failure";

  try {
    const container = await getWebContainer();
    await container.mount(
      Object.fromEntries(
        Object.entries(files).map(([path, content]) => [path, { file: { contents: content } }])
      )
    );
    if (files["package.json"]) {
      const installStartedAt = performance.now();
      try {
        const process = await container.spawn("npm", ["install"]);
        npmInstallExitCode = await process.exit;
      } finally {
        npmInstallMs = Math.round(performance.now() - installStartedAt);
      }
    }
    outcome = "success";
    return container;
  } finally {
    recordCostPilotSession({
      elapsedMs: Math.round(performance.now() - startedAt),
      npmInstallMs,
      npmInstallExitCode,
      outcome,
    });
  }
}
