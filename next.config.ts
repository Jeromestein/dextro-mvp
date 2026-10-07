import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  logging: { incomingRequests: { ignore: [/\/api\/chatgpt\/callback/] } },
  outputFileTracingExcludes: { "/*": ["./.dextro-chatgpt/**/*"] },
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
};
export default withWorkflow(nextConfig);
