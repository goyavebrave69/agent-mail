import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "_bmad/**",
      "_bmad-output/**",
      ".claude/**",
      ".windsurf/**",
      "design-artifacts/**",
      "*.tsx",  // root-level stray files
      "supabase/functions/**",  // Deno Edge Functions — not linted by Node/Next.js ESLint
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["tailwind.config.ts", "postcss.config.mjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
