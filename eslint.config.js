import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import tailwindcss from "eslint-plugin-tailwindcss";

export default defineConfig([
  ...nextVitals,
  prettier,
  {
    plugins: {
      tailwindcss,
    },
    rules: {
      "tailwindcss/no-custom-classname": "off",
    },
    settings: {
      tailwindcss: {
        callees: ["cn", "cva"],
        config: "tailwind.config.ts",
      },
    },
  },
]);