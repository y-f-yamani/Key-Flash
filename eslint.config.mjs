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
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    // Architecture boundary (ADR-0001): src/core is pure TypeScript and must
    // never depend on React, Next.js, features or infrastructure.
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-*", "next", "next/*"], message: "src/core must stay framework-free (ADR-0001)." },
            { group: ["@/features/*", "@/lib/*", "@/app/*", "@/components/*", "@/content", "@/content/*"], message: "src/core must not depend on outer layers (ADR-0001)." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
