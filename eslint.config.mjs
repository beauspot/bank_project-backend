import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import eslintComments from "eslint-plugin-eslint-comments";
import eslintPluginImport from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier/recommended";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";

export default [
  pluginJs.configs.recommended,

  {
    files: [
      "**/*.{js,mjs,cjs,ts}",
      "**/__tests__/**/*.{js,ts}",
      "jest.setup.ts",
    ],

    languageOptions: {
      parser: typescriptParser,

      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: process.cwd(),
        experimentalDecorators: true,
      },

      globals: {
        ...globals.node,
        jest: true,
        process: "readonly",
        log: "readonly",
      },
    },

    plugins: {
      "@typescript-eslint": tseslint,
      unicorn,
      sonarjs,
      import: eslintPluginImport,
      "eslint-comments": eslintComments,
    },

    rules: {
      // ----------------
      // TypeScript rules
      // ----------------
      "@typescript-eslint/indent": "off",
      "@typescript-eslint/no-invalid-this": "error",
      "@typescript-eslint/explicit-member-accessibility": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
        },
      ],

      // ----------------
      // Import rules
      // ----------------
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: false,
          },
        },
      ],

      // ----------------
      // Base ESLint rules
      // ----------------
      "no-console": "warn",
      "no-restricted-syntax": "off",
      "no-unused-vars": "off",
      "no-underscore-dangle": "off",
      "spaced-comment": ["error", "always"],
      "no-const-assign": "error",
      "no-control-regex": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-empty-character-class": "error",
      "no-unreachable": "error",
      "valid-typeof": "error",
      "dot-notation": "error",
      "no-empty": "error",
      "no-redeclare": "error",
      "no-useless-catch": "error",
      curly: "error",
      "prefer-const": [
        "error",
        {
          ignoreReadBeforeAssign: true,
        },
      ],
      "lines-between-class-members": [
        "error",
        "always",
        { exceptAfterSingleLine: true },
      ],

      // ----------------
      // Formatting
      // ----------------
      quotes: ["error", "double"],
      eqeqeq: "error",

      // ----------------
      // Plugin rules
      // ----------------
      "import/no-cycle": "off",
      "import/prefer-default-export": "off",
      "import/no-extraneous-dependencies": "off",

      "unicorn/filename-case": "off",
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/prefer-export-from": "off",

      "no-constant-binary-expression": "off",

      "sonarjs/cognitive-complexity": "error",
      "sonarjs/no-identical-functions": "error",

      "eslint-comments/no-unused-disable": "off",
    },
  },

  prettierConfig,
  prettierPlugin,

  {
    ignores: [
      "coverage/**",
      "node_modules/*",
      ".idea/*",
      "logs/*",
      "dist/*",
      ".dist/*",
      ".vscode/*",
      "jots.ts",
      "testQueues.ts",
      "todos.ts",
    ],
  },
];
