// Next may normalize the internal URL to localhost. Match the actual Host to
// an exact loopback hostname and the request port; never trust forwarded hosts.
function loopbackOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const allowed = ["127.0.0.1", "localhost"].map((name) => `${name}${url.port ? `:${url.port}` : ""}`);
  return url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname) && host && allowed.includes(host)
    ? `http://${host}` : null;
}
export function requestOrigin(request: Request) {
  return loopbackOrigin(request) || new URL(request.url).origin;
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === requestOrigin(request);
}
