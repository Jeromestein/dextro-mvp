import { NextResponse } from "next/server";
import { z } from "zod";
import { accountAction, chatGPTCredential, chatGPTStatus, SESSION_COOKIE, startSignIn } from "@/lib/chatgpt-auth";
import { chatGPTModels } from "@/lib/chatgpt-provider";
import { isLocalChatGPT, sameOrigin } from "@/lib/workshop";
import { ServiceError, readBounded } from "@/lib/server-errors";

export const runtime = "nodejs";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
const unavailable = () => json({ error: "ChatGPT plan sign-in is enabled only in the local studio at localhost or 127.0.0.1." }, 403);
const fail = (error: unknown) => json({ error: error instanceof ServiceError ? error.message : "The ChatGPT connection could not be completed. Try again." }, error instanceof ServiceError ? error.status : 502);

export async function GET(request: Request) {
  if (!isLocalChatGPT(request)) return unavailable();
  try { return json({ ...await chatGPTStatus(request), configured: true }); }
  catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  if (!isLocalChatGPT(request) || !sameOrigin(request)) return unavailable();
  try {
    const input = z.object({ action: z.enum(["signin", "select", "signout", "acknowledge", "models"]), profileId: z.string().max(200).optional() }).safeParse(JSON.parse(await readBounded(request.body, 1000)));
    if (!input.success) return json({ error: "Choose a supported connection action." }, 400);
    const { action, profileId } = input.data;
    if (action === "signin") {
      const result = await startSignIn(request, profileId);
      const response = json({ url: result.url });
      if (result.cookie) response.cookies.set(SESSION_COOKIE, result.cookie, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
      return response;
    }
    if (action === "models") {
      const { access } = await chatGPTCredential(request);
      return json({ models: await chatGPTModels(access, AbortSignal.any([request.signal, AbortSignal.timeout(15_000)])) });
    }
    return json(await accountAction(request, action, profileId));
  } catch (error) { return fail(error); }
}
