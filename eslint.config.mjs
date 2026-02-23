import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import compat from "eslint-plugin-compat";
import prettierConfig from "eslint-config-prettier/flat";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      ".astro/",
      "node_modules/",
      "**/*.d.ts",
      "src/components/ui/",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  ...astro.configs.recommended,
  ...astro.configs["jsx-a11y-recommended"],

  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],

  {
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  compat.configs["flat/recommended"],

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/prop-types": "off",
    },
  },

  {
    files: ["**/*.astro"],
    languageOptions: {
      parser: astro.parser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".astro"],
      },
      globals: {
        ImageMetadata: "readonly",
      },
    },
    rules: {
      "react/no-unknown-property": "off",
      "react/jsx-key": "off",
      "react/jsx-no-undef": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "astro/jsx-a11y/label-has-associated-control": "off",
    },
  },

  {
    files: ["**/*.astro/*.js", "**/*.astro/*.ts"],
    rules: {
      "no-var": "off",
      "prefer-rest-params": "off",
      "prefer-spread": "off",
    },
  },

  prettierConfig,
);
