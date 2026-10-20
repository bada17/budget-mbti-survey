import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// 게임(game/)·시트 서버(server/)·시험만 남았다 — 옛 설문(Next·React)은 10-20 지웠다.
export default defineConfig([
  globalIgnores(["dist*/**", "server/gas/server.js"]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
]);
