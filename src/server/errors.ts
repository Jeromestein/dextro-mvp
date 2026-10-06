export class ServiceError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

export async function readBounded(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ServiceError("The request or response was too large. Try a shorter idea.", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
