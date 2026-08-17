import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Installed agent skills ship their own scripts. They are vendored third-party
    // code, not ours to lint — without this, `npm run lint` drowns our own findings
    // in ~300 warnings from them.
    ".claude/**",
    ".agents/**",
    ".codex/**",
  ]),
]);

export default eslintConfig;
