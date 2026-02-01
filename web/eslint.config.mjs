import nextPlugin from "eslint-config-next";

const eslintConfig = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**"],
  },
  ...nextPlugin,
  {
    rules: {
      // Downgrade React strict rules to warnings to allow gradual migration
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
];

export default eslintConfig;
