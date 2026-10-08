import { ServiceError } from "@/server/errors";

export async function publicResponse(operation: () => Promise<Response>) {
  try { return await operation(); }
  catch (error) {
    return Response.json({ error: error instanceof ServiceError && error.status < 500 ? error.message : "This story is temporarily unavailable. Try again." },
      { status: error instanceof ServiceError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}
export function mediaResponse(request: Request, bytes: Uint8Array, mimeType: string) {
  const headers = { "Content-Type": mimeType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes" };
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match?.[2]));
    const end = match?.[1] && match?.[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
    if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length)
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${bytes.length}` } });
    return new Response(new Blob([new Uint8Array(bytes.subarray(start, end + 1))]).stream(), { status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": String(end - start + 1) } });
  }
  return new Response(new Blob([new Uint8Array(bytes)]).stream(), { headers: { ...headers, "Content-Length": String(bytes.length) } });
}
