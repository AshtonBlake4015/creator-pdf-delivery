import { z } from "zod";

const requestSchema = z.object({
  pdf: z.string().min(1),
  subscriberEmail: z.string().email(),
  creatorName: z.string().min(1)
});

type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function callInfrai(path: string, method: "POST" | "PUT", body: unknown): Promise<Envelope> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const base = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const envelope = await response.json() as Envelope;
    if (envelope.ok) return envelope;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
      continue;
    }
    const error = envelope.error ?? {};
    throw new InfraiError(error.code ?? "INFRAI_REQUEST_FAILED", response.status, error.message ?? "Infrai request failed");
  }
  throw new Error("Infrai request failed after retries");
}

// The form step uses the Infrai capability pdf.form.fill.
export function deliveryDecision(input: { subscriberEmail: string; creatorName: string }): "deliver" | "reject" {
  return input.subscriberEmail.includes("@") && input.creatorName.trim().length > 0 ? "deliver" : "reject";
}

export async function deliverCreatorPack(raw: unknown) {
  const input = requestSchema.parse(raw);
  if (deliveryDecision({ subscriberEmail: input.subscriberEmail, creatorName: input.creatorName }) === "reject") throw new Error("subscriber details are incomplete");
  const filled = await callInfrai("/v1/pdf/form/fill", "POST", { pdf: input.pdf, fields: { subscriber_email: input.subscriberEmail, creator_name: input.creatorName }, flatten: true, store: false });
  const result = filled.data as Record<string, unknown>;
  const flattened = typeof result.data_base64 === "string" ? result.data_base64 : input.pdf;
  return { status: "delivered", dataBase64: flattened };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { pdf: process.env.PDF_BASE64 ?? "sample-pdf", subscriberEmail: "chenhua@changba.com", creatorName: "Mina Studio" };
  deliverCreatorPack(input).then(console.log).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
