import type { ApiEnvelope } from "@subradar/shared";

const defaultApiBaseUrl = "http://127.0.0.1:8787/api/v1";

export type BackendStatus = {
  connected: boolean;
  apiBaseUrl: string;
  phase?: string;
  capabilities: string[];
  serviceCount?: number;
  message: string;
};

export async function getBackendStatus(): Promise<BackendStatus> {
  const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? defaultApiBaseUrl;

  try {
    const [capabilitiesResponse, servicesResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/capabilities`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/services`, { cache: "no-store" })
    ]);

    if (!capabilitiesResponse.ok || !servicesResponse.ok) {
      return {
        connected: false,
        apiBaseUrl,
        capabilities: [],
        message: `Backend responded with HTTP ${capabilitiesResponse.status}/${servicesResponse.status}.`
      };
    }

    const capabilitiesEnvelope = await capabilitiesResponse.json() as ApiEnvelope<{
      phase: string;
      capabilities: string[];
    }>;
    const servicesEnvelope = await servicesResponse.json() as ApiEnvelope<{
      services: unknown[];
    }>;

    const status: BackendStatus = {
      connected: true,
      apiBaseUrl,
      capabilities: capabilitiesEnvelope.data?.capabilities ?? [],
      serviceCount: servicesEnvelope.data?.services.length ?? 0,
      message: "Web frontend is connected to the Fastify API."
    };

    if (capabilitiesEnvelope.data?.phase) {
      status.phase = capabilitiesEnvelope.data.phase;
    }

    return status;
  } catch (error) {
    return {
      connected: false,
      apiBaseUrl,
      capabilities: [],
      message: error instanceof Error ? error.message : "Backend connection failed."
    };
  }
}
