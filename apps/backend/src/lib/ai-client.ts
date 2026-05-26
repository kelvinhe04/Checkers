// =========================================================================
// Cliente HTTP hacia el microservicio de IA. Propaga el correlation ID.
// =========================================================================

import type {
  AIMoveRequest,
  AIMoveResponse,
} from "@checkers/shared";
import { config } from "../config.js";

interface CallOpts {
  correlationId: string;
}

export async function requestAiMove(
  body: AIMoveRequest,
  opts: CallOpts,
): Promise<AIMoveResponse> {
  const url = `${config.ai.url.replace(/\/$/, "")}/move`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.ai.token}`,
      "x-correlation-id": opts.correlationId,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ai_service_error_${res.status}:${text}`);
  }

  return (await res.json()) as AIMoveResponse;
}
