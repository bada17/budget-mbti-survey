import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 정적판: `npx vite build -c vite.static.config.ts` → dist-static/ (static/public/CNAME 이 같이 가서 gh-pages 를 통째로 갈아도 새 주소가 남는다)
export default defineConfig({
  root: "static",
  base: "./", // 10-19 forest.action.or.kr(뿌리에 설문) — 절대 경로 /budget-mbti-survey/ 면 새 주소에서 설문이 깨진다
  plugins: [react()],
  build: { outDir: "../dist-static", emptyOutDir: true },
});
