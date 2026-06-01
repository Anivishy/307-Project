import js from "@eslint/js";

export default [
  { ignores: [".next", "node_modules"] },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
