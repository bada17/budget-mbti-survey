import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// 게임(game/)·시트 서버(server/)·시험만 남았다 — 옛 설문(Next·React)은 10-20 지웠다.
export default defineConfig([
  // .next 는 옛 설문 굽기 찌꺼기, review 는 GPT 시안, server/gas/*.js 는 앱스 스크립트 전역(SpreadsheetApp 등)이라 뺀다.
  globalIgnores(["dist*/**", ".next/**", "game/review/**", "server/gas/*.js"]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-control-regex": "off", // 이름·글에서 제어 문자를 걸러 내는 정규식이 일부러 쓴다
      "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }], // _was 처럼 버리려고 꺼낸 칸
    },
  },
]);
