import { z } from "zod";
import { ServiceError, readBounded } from "../errors";

export function planError(status: number, code?: string) {
  if (status === 429 || code === "subscription_sharing_usage_limit_exceeded")
    return new ServiceError("ChatGPT usage limit reached. Open Manage usage to review your plan or app limit. No API billing fallback was used.", 429);
  if (status === 401 || code === "subscription_sharing_invalid_user")
    return new ServiceError("ChatGPT could not authorize this session. Continue with your saved account to sign in again.", 401);
  if (code === "subscription_sharing_user_not_eligible")
    return new ServiceError("ChatGPT plan usage is not available for this account or workspace. Check your Plus or Pro eligibility and account policy.", 403);
  if (status === 403)
    return new ServiceError("ChatGPT plan access is not permitted for this account, workspace, or region. Review your connection and permissions.", 403);
  if (code === "subscription_sharing_unsupported_capability")
    return new ServiceError("This ChatGPT model does not support the requested generation format. Choose another available model.", 400);
  return new ServiceError("ChatGPT plan usage is temporarily unavailable. Try later or continue writing manually. No API billing fallback was used.", 503);
}

export async function requireProviderOK(response: Response) {
  if (response.ok) return;
  let code: string | undefined;
  try {
    const data = JSON.parse(await readBounded(response.body, 30_000));
    code = typeof data.error?.code === "string" ? data.error.code : undefined;
  } catch { /* Do not expose raw upstream diagnostics or credentials. */ }
  throw planError(response.status, code);
}
export async function chatGPTModels(access: string, signal: AbortSignal) {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${access}` }, signal, cache: "no-store",
  });
  await requireProviderOK(response);
  const data = z.object({ models: z.array(z.object({ slug: z.string(), display_name: z.string(), visibility: z.string() })) }).parse(JSON.parse(await readBounded(response.body, 2_000_000)));
  return data.models.filter((model) => model.visibility === "list").map((model) => ({ id: model.slug, name: model.display_name }));
}

// The final event, not an output delta, establishes successful inference.
export async function readChatGPTStream(body: ReadableStream<Uint8Array> | null) {
  const raw = await readBounded(body, 1_000_000);
  let completed: unknown;
  const textParts = new Map<string, string>();
  let refused = false;
  for (const block of raw.split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (!data || data === "[DONE]") continue;
    let event;
    try { event = JSON.parse(data); } catch { throw new ServiceError("The ChatGPT stream was unreadable. No draft was saved."); }
    if (event.type === "response.failed" || event.type === "error")
      throw planError(502, event.response?.error?.code || event.error?.code || event.code);
    if (event.type === "response.incomplete") throw new ServiceError("ChatGPT returned an incomplete draft. Try a simpler idea.");
    const partKey = `${event.output_index ?? 0}:${event.content_index ?? 0}`;
    if (event.type === "response.output_text.delta" && typeof event.delta === "string")
      textParts.set(partKey, (textParts.get(partKey) || "") + event.delta);
    if (event.type === "response.output_text.done" && typeof event.text === "string")
      textParts.set(partKey, event.text);
    if (event.type === "response.refusal.delta" || event.type === "response.refusal.done") refused = true;
    if (event.type === "response.completed") completed = event.response;
  }
  if (!completed) throw new ServiceError("The ChatGPT stream ended before completion. No draft was saved.");
  const envelope = z.object({ status: z.string(), output: z.array(z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })).default([]) }).parse(completed);
  const content = envelope.output.flatMap((item) => item.content || []);
  // Plan streams can carry text only in incremental events. A completed event
  // establishes success but need not repeat that text in its output envelope.
  if (refused) envelope.output.push({ content: [{ type: "refusal" }] });
  if (!content.some((part) => part.type === "output_text" && part.text) && textParts.size)
    envelope.output.push({ content: [{ type: "output_text", text: [...textParts.values()].join("") }] });
  return envelope;
}
