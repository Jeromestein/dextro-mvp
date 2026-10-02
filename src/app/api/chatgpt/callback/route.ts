import { NextResponse } from "next/server";
import { finishSignIn, SESSION_COOKIE, signInReturnURL } from "@/lib/chatgpt-auth";
import { isLocalChatGPT } from "@/lib/workshop";
import { ServiceError } from "@/lib/server-errors";

export const runtime = "nodejs";
export async function GET(request: Request) {
  let message = "ChatGPT is connected. Return to the Dextro studio and check the connection.";
  let token: string | undefined;
  let success = false;
  try {
    if (!isLocalChatGPT(request)) throw new ServiceError("Open sign-in from the local Dextro studio at localhost or 127.0.0.1.", 403);
    const returnURL = await signInReturnURL(request);
    if (returnURL) return NextResponse.redirect(returnURL, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    token = await finishSignIn(request);
    success = true;
  } catch (error) {
    message = error instanceof ServiceError ? error.message : "ChatGPT sign-in could not be verified. Return to Dextro and try again.";
  }
  const escaped = message.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const response = new NextResponse(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dextro — ChatGPT connection</title><style>body{font:17px/1.6 system-ui;background:#f7f5ef;color:#252a28;margin:0;padding:12vh 24px}main{max-width:520px;margin:auto}h1{font-family:Georgia,serif;font-size:36px}a{color:#375a43}p{margin:24px 0}</style><main><small>DEXTRO / CHATGPT</small><h1>${success ? "Connection complete." : "Let’s try that again."}</h1><p>${escaped}</p><a href="/settings?chatgpt=returned">Return to settings</a></main></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'" },
  });
  if (token) response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
  return response;
}
