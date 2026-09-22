import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Variável não usada já é erro no tsc (noUnusedLocals/noUnusedParameters);
      // ter a mesma checagem nas duas ferramentas só duplica o ruído.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // src/components/ui é o shadcn/ui vendorizado. Mantemos os arquivos o mais
    // próximo possível do upstream para poder atualizar; adaptá-los ao nosso
    // estilo de lint criaria um fork que ninguém quer manter.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Scripts e configuração rodam em Node, não no navegador.
    files: ["scripts/**/*.mjs", "*.config.{ts,js}", "vitest.config.ts"],
    languageOptions: { globals: globals.node },
  },
);
