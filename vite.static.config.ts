import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 정적판: `npx vite build -c vite.static.config.ts` → dist-static/ (깃허브 페이지 주소가 /budget-mbti-survey/ 아래라 base 를 맞춘다)
export default defineConfig({
  root: "static",
  base: "/budget-mbti-survey/",
  plugins: [react()],
  build: { outDir: "../dist-static", emptyOutDir: true },
});
