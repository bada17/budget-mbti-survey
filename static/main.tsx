// 저장·서버 없이 설문만 도는 정적판(후원주점 테이블 QR 용). 깃허브 페이지에 올린다.
import { createRoot } from "react-dom/client";
import SurveyApp from "../app/SurveyApp";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<SurveyApp />);
