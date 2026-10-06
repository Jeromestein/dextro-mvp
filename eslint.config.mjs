import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/modules/**/*.{ts,tsx}", "src/shared/**/*.{ts,tsx}", "src/storage/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/server/**", "**/server/**", "node:*"],
          message: "Browser and shared modules must use API routes instead of importing server implementations.",
        }],
      }],
    },
  },
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "output/**"]),
]);
