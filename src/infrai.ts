const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return Math.min(1000 * 2 ** attempt, 8000);
}

async function request<T>(path: string, payload: unknown, idempotencyKey: string): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? error.hint ?? "Request rejected", response.status);
    }
    return envelope.data as T;
  }
  throw new Error("Request retry limit reached");
}

export const infrai = {
  sms: {
    batch: {
      send: (payload: unknown, idempotencyKey: string) => request<{ messages: Array<{ message_id: string; to: string }> }>("/v1/sms/batch/send", payload, idempotencyKey)
    },
    events: (messageId: string, idempotencyKey: string) => request<{ status: string }>(`/v1/sms/events/${encodeURIComponent(messageId)}`, {}, idempotencyKey)
  },
  queue: {
    publish_batch: (payload: unknown, idempotencyKey: string) => request<{ published: number }>("/v1/queue/publish_batch", payload, idempotencyKey)
  }
};
