import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Temporary test files
      "analyze_pdf.js",
      "extract_40_transactions.js",
      "test-pdf-parser.js",
      "color-scale-test.html",
      "tests/**",
    ],
  },
  {
    rules: {
      // Allow unused vars in catch blocks and function params with underscore prefix
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      // Allow any types in specific contexts where typing is complex
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unescaped entities in JSX (common in financial text)
      "react/no-unescaped-entities": "off",
      // Allow require imports in server-only code with disable comments
      "@typescript-eslint/no-require-imports": "error",
    },
  },
];

export default eslintConfig;
