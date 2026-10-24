import{A as e}from"./village-BH8QLP8x.js";import{n as t,t as n}from"./contact-CVSrJxR6.js";var r=`<!-- 홈페이지 공통 하단 — scripts/port-footer.mjs 가 만든다. 손으로 고치지 말 것 -->\r
<!-- ═══════════════════════════════════════════════════════════════════\r
     캠페이너스 공통 맨 아래 — 후원 띠 + 푸터\r
\r
     ★ 이 파일 전체를 캠페이너스 코드 위젯 하나에 붙이고, 그 위젯이 든 섹션을\r
        '섹션 반복'으로 설정합니다. 그러면 모든 페이지 하단에 한 번씩 나타납니다.\r
     ★ 각 페이지의 index.html · activity-*.html 등에 이 코드를 다시 넣지 마세요.\r
        페이지 코드와 반복 하단에 둘 다 있으면 같은 하단이 두 번 보입니다.\r
     ★ 하단을 고칠 때는 이 파일과 캠페이너스 반복 섹션 한 곳만 고칩니다.\r
\r
     2026-08-31 신설. 사용자 지시:\r
       · 활동의 '알려 주실 것이 있나요' 칸은 의미가 없어 삭제\r
       · 그 자리에 홈 맨 아래 화면을 그대로 넣어 통일\r
       · 그 위에 후원하기 알약과 띠를 둔다\r
\r
     범위가 #ah-foot 으로 따로인 이유:\r
       화면마다 뿌리 이름이 달라(#act, #iss, #lib, #pb) 뿌리에 기대면 CSS 가\r
       안 먹습니다. 그래서 색·글꼴을 자기 안에 다시 정의합니다.\r
       값은 DESIGN.md 와 같습니다 — 홈(#action-home-v2)의 푸터와 한 글자도 다르지 않습니다.\r
\r
     2026-09-01 사용자 결정: 하단은 페이지별 코드에서 완전히 분리합니다.\r
     로컬·GitHub 검토본은 preview.py · build-static.py 가 이 파일을 화면 끝에 붙이고,\r
     실제 캠페이너스는 반복 섹션이 붙입니다.\r
     ═══════════════════════════════════════════════════════════════════ -->\r
<style>\r
\r
  #ah-foot,#ah-foot *{box-sizing:border-box}\r
  #ah-foot{\r
    --brand:#00afec;          /* 시민행동 하늘색 */\r
    --brand-deep:#0087b8;     /* 흰 바탕 위 글자에 쓰는 진한 쪽 */\r
    --ink:#0d1c26;--ink-soft:#47606f;--line:#dde7ec;\r
\r
    background:#fff;color:var(--ink);line-height:1.6;\r
    font-family:'Pretendard Variable',Pretendard,'Noto Sans KR',-apple-system,sans-serif;\r
    word-break:keep-all;-webkit-font-smoothing:antialiased\r
  }\r
  #ah-foot a{color:inherit;text-decoration:none}\r
  /* 키보드로 옮겨 다닐 때 지금 어디인지 보이게 합니다. 머리띠·본문과 같은 규칙입니다. */\r
  #ah-foot :focus-visible{outline:2.5px solid var(--brand);outline-offset:3px}\r
  #ah-foot h2,#ah-foot h3,#ah-foot p{margin:0}\r
  #ah-foot .wrap{width:min(1120px,calc(100% - 48px));margin:0 auto}\r
\r
  /* ───────── 후원 띠 ─────────\r
     홈의 CTA 와 같은 부품입니다(브랜드 색 바탕 + 흰 알약). 홈은 두 칸이지만\r
     여기는 한 칸으로 길게 놓습니다 — 활동 화면 맨 아래는 갈래가 하나뿐입니다. */\r
  #ah-foot .give{background:var(--brand);color:#fff}\r
  #ah-foot .give-in{\r
    display:flex;align-items:center;justify-content:space-between;gap:clamp(20px,3vw,48px);\r
    flex-wrap:wrap;padding:clamp(36px,4.4vw,60px) 0\r
  }\r
  #ah-foot .give h2{\r
    font-family:GmarketSans,sans-serif;font-weight:700;color:#fff;\r
    font-size:clamp(20px,2.2vw,31px);line-height:1.35;letter-spacing:-.02em\r
  }\r
  /* 하늘색 위의 작은 글씨입니다. 흐리게 하면 읽기가 더 어려워져 흰색 그대로 씁니다. */\r
  #ah-foot .give p{margin-top:10px;font-size:14.5px;color:#fff}\r
  #ah-foot .give a{\r
    flex:none;background:#fff;color:var(--ink);border-radius:999px;\r
    padding:15px 30px;font-weight:700;font-size:16px;transition:transform .15s\r
  }\r
  #ah-foot .give a:hover{transform:translateY(-2px)}\r
\r
  /* ───────── 푸터 ─────────\r
     레퍼런스: 서울환경연합 — 왼쪽에 단체 정보, 오른쪽에 세로 버튼 목록 두 줄,\r
     맨 아래 약관 작은 버튼. 홈의 것을 그대로 옮긴 것입니다. */\r
  #ah-foot .ft{border-top:4px solid var(--brand);padding:clamp(40px,4.5vw,64px) 0 30px;font-size:14px;color:var(--ink-soft)}\r
  #ah-foot .ft-grid{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(2,minmax(0,.7fr));gap:clamp(28px,4vw,64px)}\r
  #ah-foot .ft-brand{font-size:18px;font-weight:800;color:var(--ink);margin-bottom:20px}\r
  /* 항목 이름과 값을 두 칸으로 맞춰 세우는 부분입니다. */\r
  #ah-foot .ft-org dl{display:grid;grid-template-columns:auto 1fr;gap:8px 20px;margin:0}\r
  #ah-foot .ft-org dt{font-weight:700;color:var(--ink);white-space:nowrap}\r
  #ah-foot .ft-org dd{margin:0;line-height:1.6}\r
  #ah-foot .ft-org a:hover{color:var(--brand-deep)}\r
  #ah-foot .ft-col h3{font-size:15px;font-weight:800;color:var(--ink);margin-bottom:14px}\r
  /* 테두리가 겹쳐 한 줄로 보이도록 아래쪽 여백을 -1px 줍니다. */\r
  #ah-foot .ft-btns{display:grid}\r
  #ah-foot .ft-btns a{\r
    display:flex;align-items:center;justify-content:space-between;gap:12px;\r
    border:1px solid var(--line);margin-bottom:-1px;padding:12px 16px;\r
    font-size:14px;font-weight:700;color:var(--ink);background:#fff\r
  }\r
  #ah-foot .ft-btns a:hover{border-color:var(--brand);color:var(--brand-deep);position:relative;z-index:1}\r
  /* 오른쪽 아이콘. 글꼴 문자(N · f · X …)로 그리면 기기마다 다른 글꼴이 잡혀\r
     모양·굵기가 제각각이고, 없는 글꼴이면 네모로 깨집니다. 그래서 SVG 를\r
     여기에 직접 그려 넣습니다 — 바깥 파일도, 아이콘 글꼴도 부르지 않습니다.\r
     색은 currentColor 라 아래 hover 규칙 하나로 글자와 함께 따라 변합니다. */\r
  /* 산하 센터는 이름 대신 로고를 넣습니다 — 로고 안에 이미 이름이 있어\r
     글자를 같이 두면 한 줄에 이름이 두 번 나옵니다. 그림이 안 뜨면 alt 의\r
     센터 이름이 그대로 보입니다. 주소는 지금 홈페이지가 쓰는 그 파일입니다\r
     (https 라 섞임 경고가 뜨지 않습니다). 세 로고는 비율이 서로 달라\r
     높이만 맞추면 가로가 긴 것만 커 보입니다. 높이와 폭에 각각 한계를 줘\r
     넣은 네모 안에 알아서 들어가게 합니다. */\r
  #ah-foot .ft-btns .ft-logo{flex:none;display:block;height:auto;width:auto;\r
    max-height:34px;max-width:118px}\r
  /* ⚠️ 캠페이너스 미리보기에서 로고 둘레에 노란 바탕이 깔렸습니다(2026-09-02).\r
     imweb 쪽 전역 CSS 가 img 에 바탕색을 주는 것입니다 — 로고 파일이 투명한\r
     PNG 라 그 색이 글자 사이로 그대로 비칩니다. 우리 코드에는 그런 규칙이\r
     없으므로, 남의 규칙을 덮는 것 말고는 방법이 없어 !important 를 씁니다\r
     (공통 상단이 #doz_header 를 숨길 때 쓰는 것과 같은 이유입니다).\r
     테두리·그림자·여백까지 같이 지웁니다 — 무엇을 입혔는지 볼 수 없어서입니다. */\r
  #ah-foot .ft-btns a .ft-logo,\r
  #ah-foot .ft-btns a img{\r
    background:none!important;background-color:transparent!important;\r
    border:0!important;outline:0!important;box-shadow:none!important;\r
    padding:0!important;border-radius:0!important;filter:none!important\r
  }\r
  /* 배지·말풍선을 가짜 요소로 붙이는 경우도 있어 함께 막습니다. */\r
  #ah-foot .ft-btns a .ft-logo::before,\r
  #ah-foot .ft-btns a .ft-logo::after{content:none!important;display:none!important}\r
  #ah-foot .ft-btns .mark{flex:none;display:flex;align-items:center;color:var(--ink-soft)}\r
  #ah-foot .ft-btns .mark svg{width:17px;height:17px;display:block;fill:currentColor}\r
  #ah-foot .ft-btns a:hover .mark{color:var(--brand-deep)}\r
  /* ⚠️ 2026-09-10 — 위 로고와 **똑같은 일이 새창 표시에도** 났습니다.\r
     캠페이너스에 이식하니 '관련 페이지' 넷의 오른쪽 표시 뒤에 노란 바탕이 깔렸습니다.\r
     imweb 전역 CSS 가 깔아 놓은 것이고, 새창 표시는 선으로만 그린 투명한 그림이라\r
     그 색이 그대로 비칩니다. 소셜 아이콘이 멀쩡해 보이는 것은 그쪽 그림에 꽉 찬\r
     네모(rect)가 있어 노란색을 덮기 때문이지, 안 깔린 것이 아닙니다.\r
     소셜과 관련 페이지가 같은 .ft-btns 라 한 규칙이 둘 다 덮습니다.\r
     남의 규칙이라 !important 말고는 방법이 없습니다. */\r
  #ah-foot .ft-btns a .mark,\r
  #ah-foot .ft-btns a .mark svg{\r
    background:none!important;background-color:transparent!important;\r
    border:0!important;outline:0!important;box-shadow:none!important;\r
    padding:0!important;border-radius:0!important;filter:none!important\r
  }\r
  #ah-foot .ft-btns a .mark::before,#ah-foot .ft-btns a .mark::after{\r
    content:none!important;display:none!important\r
  }\r
  #ah-foot .ft-policy{display:flex;flex-wrap:wrap;gap:6px;margin-top:22px}\r
  #ah-foot .ft-policy a{border:1px solid var(--line);padding:7px 12px;font-size:12.5px;font-weight:700;color:var(--ink-soft)}\r
  #ah-foot .ft-policy a:hover{border-color:var(--brand);color:var(--brand-deep)}\r
  #ah-foot .ft-copy{margin-top:clamp(30px,3.5vw,48px);font-size:13px}\r
\r
  @media(max-width:1100px){\r
    #ah-foot .ft-grid{grid-template-columns:1fr 1fr}\r
    #ah-foot .ft-org{grid-column:1/-1}\r
  }\r
  @media(max-width:820px){\r
    #ah-foot .wrap{width:min(100% - 36px,1120px)}\r
    #ah-foot .give-in{padding:clamp(30px,4vw,44px) 0}\r
    #ah-foot .ft-grid{grid-template-columns:1fr}\r
    #ah-foot .ft-org dl{grid-template-columns:1fr}\r
    #ah-foot .ft-org dt{margin-top:6px}\r
    /* 오른쪽 아래 떠 있는 후원 버튼에 가리지 않게 아래를 비웁니다. */\r
    #ah-foot .ft{padding-bottom:104px}\r
  }\r
  @media(max-width:430px){\r
    #ah-foot .wrap{width:min(100% - 28px,1120px)}\r
    #ah-foot .give a{width:100%;text-align:center}\r
  }\r
\r
  /* ── 여기부터 시민의 숲이 덧붙임(scripts/port-footer.mjs) — 게임의 h1~h3 둥근 글꼴이 하단에 새지 않게 ── */\r
  #ah-foot h2,#ah-foot h3{font-family:inherit}\r
  #ah-foot .give h2{font-family:GmarketSans,'Pretendard Variable',Pretendard,sans-serif}\r
</style>\r
\r
<div id="ah-foot">\r
\r
  <!-- ───────── 후원 띠 ───────── -->\r
  <section class="give"><div class="wrap"><div class="give-in">\r
    <div>\r
      <h2>당신이 낸 세금, 누가 지켜보고 있을까요?</h2>\r
      <p>시민행동은 정부와 기업의 돈을 감시합니다. 그 일은 시민의 후원으로만 굴러갑니다.</p>\r
    </div>\r
    <a href="https://secure.donus.org/withaction0909/pay/step1" target="_blank" rel="noopener">후원으로 함께하기 →</a>\r
  </div></div></section>\r
\r
  <!-- ───────── 푸터 ───────── -->\r
  <footer class="ft"><div class="wrap">\r
    <div class="ft-grid">\r
\r
      <div class="ft-org">\r
        <div class="ft-brand">함께하는 시민행동</div>\r
        <dl>\r
          <dt>대표</dt><dd>김주일</dd>\r
          <dt>고유번호</dt><dd>101-82-60646</dd>\r
          <dt>주소</dt><dd>(03969) 서울 마포구 월드컵로26길 39 시민공간 나루 5층</dd>\r
          <dt>전화</dt><dd><a href="tel:02-921-4709">02-921-4709</a></dd>\r
          <dt>이메일</dt><dd><a href="mailto:action@action.or.kr">action@action.or.kr</a></dd>\r
          <dt>후원계좌</dt><dd>신한 325-01-167213</dd>\r
        </dl>\r
      </div>\r
\r
      <div class="ft-col">\r
        <h3>소셜미디어</h3>\r
        <div class="ft-btns">\r
          <a href="https://blog.naver.com/together_action" target="_blank" rel="noopener">네이버 블로그 <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect width="24" height="24" rx="4"/><path fill="#fff" d="M7.4 6.9h3.5l2.8 4.4V6.9h3.1v10.2h-3.5l-2.8-4.4v4.4H7.4Z"/></svg></span></a>\r
          <a href="https://www.youtube.com/user/actionCANvideo" target="_blank" rel="noopener">유튜브 <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="1" y="4" width="22" height="16" rx="5"/><path fill="#fff" d="M10 8.4 16.2 12 10 15.6Z"/></svg></span></a>\r
          <a href="https://www.instagram.com/action.together.1999/" target="_blank" rel="noopener">인스타그램 <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect width="24" height="24" rx="6"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.4" fill="#fff"/></svg></span></a>\r
          <a href="https://www.facebook.com/withAction/" target="_blank" rel="noopener">페이스북 <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="10"/><path fill="#fff" d="M13.6 20.6V12.9h2.5l.4-3h-2.9V7.9c0-.8.3-1.2 1.4-1.2h1.6V3.9h-2.5c-2.7 0-3.7 1.6-3.7 3.8v2.2H8.2v3h2.2v7.7Z"/></svg></span></a>\r
          <a href="https://twitter.com/actioncan" target="_blank" rel="noopener">트위터 <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect width="24" height="24" rx="5"/><path fill="#fff" d="M6.4 5.2 10.9 11 6.1 18.8h2l3.7-6 4.2 6h4.2l-4.9-6.9 4.7-6.7h-2.1l-3.5 5.1-3.8-5.1Z"/></svg></span></a>\r
        </div>\r
      </div>\r
\r
      <!-- 좋은기업센터 — 2026-09-03 사용자 결정으로 단체 도메인(csr.action.or.kr)으로\r
           바꿨습니다. 예전에는 지금 홈에 걸린 그대로 csrcenter.cafe24.com 이었습니다.\r
           ⚠️ https 는 안 됩니다(TLS 에서 끊깁니다). http 로 두세요 —\r
              옆의 좋은예산센터·정보인권센터도 같은 이유로 http 입니다.\r
              시민행동 웹 담당이 인증서를 달면 그때 셋을 함께 https 로 올리세요. -->\r
      <div class="ft-col">\r
        <h3>관련 페이지</h3>\r
        <div class="ft-btns">\r
          <a href="http://www.goodbudget.kr" target="_blank" rel="noopener"><img class="ft-logo" src="https://cdn.imweb.me/thumbnail/20230216/c6bdf8489c62b.jpeg" alt="좋은예산센터" loading="lazy" decoding="async"> <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 13.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5h5.5"/><path d="M15 3.5h5.5V9"/><path d="M11.2 12.8 20.2 3.8"/></svg></span></a>\r
          <a href="http://csr.action.or.kr" target="_blank" rel="noopener"><img class="ft-logo" src="https://cdn.imweb.me/thumbnail/20230216/3a2115a51c49e.jpg" alt="좋은기업센터" loading="lazy" decoding="async"> <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 13.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5h5.5"/><path d="M15 3.5h5.5V9"/><path d="M11.2 12.8 20.2 3.8"/></svg></span></a>\r
          <a href="http://www.privacy.or.kr" target="_blank" rel="noopener"><img class="ft-logo" src="https://cdn.imweb.me/thumbnail/20230216/d3611c220acbd.png" alt="정보인권센터" loading="lazy" decoding="async"> <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 13.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5h5.5"/><path d="M15 3.5h5.5V9"/><path d="M11.2 12.8 20.2 3.8"/></svg></span></a>\r
          <a href="https://action.or.kr/74">후원 안내</a>\r
        </div>\r
        <div class="ft-policy">\r
          <a href="https://action.or.kr/34">이용약관</a>\r
          <a href="https://action.or.kr/37">단체 규약</a>\r
          <a href="https://action.or.kr/8">개인정보처리방침</a>\r
        </div>\r
      </div>\r
\r
    </div>\r
    <div class="ft-copy">© 함께하는 시민행동. All Rights Reserved.</div>\r
  </div></footer>\r
\r
</div>\r
`,i={top:{logo:``,line:`혼자 읽는 예산서 말고, 함께 걷는 우리 동네 살림`},hero:{title:`함께해요 시민의 숲`,text:`우리 동네 살림, 같이 들여다볼 이웃을 찾아요`,photo:`landing/hero.jpg`},intro:{title:`시민의 숲은`,text:`우리 동네 살림을 이웃과 함께 들여다보는 마을이에요. 걷기 게임으로 예산 고민을 먼저 해 보고, 마을에서 우리 동네 돈이 어디서 와서 어디에 쓰이는지 같이 따져 봐요.`,photo:`landing/intro.jpg`},what:{title:`시민의 숲에서는 무엇을 하나요?`,items:[{title:`걸으며 고민해요`,text:`둘 다 필요한데 하나만 골라야 한다면? 숲길에서 주민들의 바람을 듣고 열다섯 번 골라요. 다 걸으면 나의 예산 성향이 나와요.`,shot:`landing/phone-room.jpg`,icon:``},{title:`우리 동네 살림을 펼쳐 봐요`,text:`시·군·구를 고르면 우리 동네 돈이 어디서 와서 어디에 쓰이는지 보여요. ${e(`tax`)}과 ${e(`finance`)}에서 전국 243개 지방정부를 다 볼 수 있어요.`,shot:`landing/phone-village.jpg`,icon:``},{title:`이웃과 함께 따져 봐요`,text:`활동가가 올린 ${e(`cards`)}에 내 생각을 남기고, 궁금한 건 ${e(`counsel`)}에 바로 물어요. 예산이 새는 사업은 ${e(`dok`)}에서 함께 지켜봐요.`,shot:`landing/phone-end.jpg`,icon:``}]},why:{title:`왜 만들었나요?`,stories:[{title:`가장 가까운 돈인데, 가장 멀리 있어요`,text:`놀이터, 마을버스, 동네 도서관. 우리 생활에 닿는 많은 돈이 동네 예산에서 나와요. 그런데 동네 예산을 들여다보는 사람은 많지 않아요.`,photo:`landing/why-1.jpg`},{title:`예산에는 정답이 없어요`,text:`둘 다 필요한 것 중에 하나를 골라야 하는 게 예산이에요. 그래서 한 사람이 정하기보다 여럿이 따져 볼수록 나아져요. 시민의 숲은 그 고민을 나누는 자리예요.`,photo:``},{title:`혼자보다 함께 지켜보면 달라져요`,text:`27년 동안 정부와 기업의 돈을 감시해 온 함께하는 시민행동이 만들었어요. 시민의 숲은 그 일에 이웃을 초대하는 마을이에요.`,photo:`landing/why-2.jpg`}]},how:{title:`어떻게 하나요?`,steps:[{title:`걷기 게임하기`,text:`숲길에서 주민들의 바람을 듣고 열다섯 번 골라요.`,shot:``},{title:`내 동네 살림 살펴보기`,text:`시·군·구를 고르면 그 동네 예산이 열려요.`,shot:``},{title:`이웃·활동가와 이야기하기`,text:`문제 카드, 쪽지판, 상담소 질문으로 생각을 나눠요.`,shot:``},{title:`직접 나서기`,text:`예산이 새는 사업 감시에 이름을 보태요.`,shot:``}],note:`가입 없이 바로 시작해요. 로그인하면 내 동네를 저장하고 다른 기기에서도 이어 할 수 있어요.`},news:{title:`소식 받기`,text:`시민의 숲과 함께하는 시민행동의 예산 감시 소식을 메일로 보내 드려요.`},play:`게임 하러 가기`},a=`https://stibee.com/api/v1.0/lists/Iua2ta5S9VZbLfF-KD5oSdBTLiQu2g==/public/subscribers`,o=(e,t=``,n=``)=>{let r=document.createElement(e);return t&&(r.className=t),n&&(r.textContent=n),r};function s(e,t,n=`사진`){if(!e){let e=o(`div`,`${t} lp-empty`,n);return e.setAttribute(`aria-hidden`,`true`),e}let r=o(`img`,t);return r.src=e,r.alt=``,r.loading=`lazy`,r.decoding=`async`,r}function c(e){let t=o(`div`,`lp-phone`);return t.append(s(e,`lp-screen`,`게임 화면`)),t}var l=(e,t=`h2`)=>[o(t,`lp-title lp-${t}`,e.title),o(`p`,`lp-text`,e.text)],u=(e,t)=>{let n=o(`section`,`lp-sec ${e}`),r=o(`div`,`lp-wrap`);return t&&r.append(o(`h2`,`lp-title lp-h2 lp-up`,t)),n.append(r),{sec:n,inner:r}};function d(e,d){let f=o(`div`,`lp`);f.tabIndex=-1,f.setAttribute(`role`,`region`),f.setAttribute(`aria-label`,`소개`);let p=e=>{let t=o(`button`,e,i.play);return t.type=`button`,t.onclick=z,t},m=o(`div`,`lp-top`);m.append(i.top.logo?s(i.top.logo,`lp-logo`):o(`b`,`lp-brand`,`함께해요 시민의 숲`),o(`p`,`lp-top-line`,i.top.line));let h=o(`header`,`lp-sec lp-hero`),g=o(`div`,`lp-wrap lp-hero-in`),_=o(`div`,`lp-hero-words lp-up`);if(_.append(...l(i.hero,`h1`),p(`lp-play`)),d){let e=o(`button`,`lp-recall`,`전에 해 봤어요 — 내 시민증 불러오기`);e.type=`button`,e.onclick=()=>e.replaceWith(d()),_.append(e)}g.append(s(i.hero.photo,`lp-hero-art`,`마을 그림`),_),h.append(g);let v=o(`section`,`lp-intro`),y=o(`div`,`lp-intro-words lp-up`);y.append(...l(i.intro)),v.append(s(i.intro.photo,`lp-intro-art`,`그림`),y);let b=i.what.items.map((e,t)=>{let{sec:n,inner:r}=u(`lp-what${t%2?` lp-alt`:``}`,t===0?i.what.title:void 0),a=o(`div`,`lp-what-row lp-up${t%2?` lp-flip`:``}`),d=o(`div`,`lp-what-words`);return e.icon&&d.append(s(e.icon,`lp-icon`)),d.append(...l(e,`h3`)),a.append(c(e.shot),d),r.append(a),n}),x=u(`lp-why`,i.why.title);x.inner.append(...i.why.stories.map((e,t)=>{let n=o(`div`,`lp-story lp-up${t%2?` lp-flip`:``}`),r=o(`div`,`lp-story-words`);return r.append(...l(e,`h3`)),n.append(s(e.photo,`lp-photo`),r),n}));let S=u(`lp-how`,i.how.title),C=o(`ol`,`lp-steps`);C.append(...i.how.steps.map(e=>{let t=o(`li`,`lp-step lp-up`);return t.append(s(e.shot,`lp-step-shot`,`게임 화면`),o(`h3`,`lp-step-title`,e.title),o(`p`,`lp-text`,e.text)),t})),S.inner.append(C,o(`p`,`lp-text lp-how-note`,i.how.note));let w=u(`lp-news`,i.news.title),T=o(`form`,`lp-news-form lp-up`),E=o(`p`,`lp-text lp-news-sent`);T.action=a,T.method=`post`,T.target=`_blank`,T.acceptCharset=`utf-8`;let D=(e,t,n,r)=>{let i=o(`input`);return i.name=e,i.type=t,i.required=r,i.setAttribute(`aria-label`,n),i.placeholder=n,t===`email`?i.autocomplete=`email`:i.autocomplete=`name`,i},O=(e,t)=>{let n=o(`label`,`lp-news-agree`),r=o(`input`);if(r.type=`checkbox`,r.required=!0,n.append(r,` ${e}`),t){let e=o(`a`,``,`처리방침 보기`);e.href=t,e.target=`_blank`,e.rel=`noopener`,n.append(` `,e)}return n},k=o(`input`);k.type=`hidden`,k.name=`receiveMarketingMailAgreed`,k.value=`true`;let A=o(`button`,`lp-news-go`,`구독하기`);A.type=`submit`,T.append(D(`email`,`email`,`이메일 주소`,!0),D(`name`,`text`,`이름(선택)`,!1),k,O(`(필수) 이메일·이름을 소식 보내는 데 쓰는 것에 동의해요.`,t),O(`(필수) 시민행동의 활동·후원 소식을 받는 데 동의해요.`),A),T.addEventListener(`submit`,()=>{E.textContent=`새 창에서 구독을 마무리해 주세요. 메일함도 한 번 봐 주세요.`}),w.inner.append(o(`p`,`lp-text lp-up`,i.news.text),T,E);let j=o(`div`,`lp-foot`);j.innerHTML=r;let M=`

---
기기 정보(지우지 말아 주세요)
${navigator.userAgent}
화면 ${screen.width}×${screen.height} · 창 ${innerWidth}×${innerHeight}
${location.href}`,N=o(`p`,`lp-report`,`게임이 안 열리거나 이상하게 움직이나요? `),P=o(`a`,``,`오류 알리기`);P.href=`mailto:${n.mail}?subject=%5B%EC%8B%9C%EB%AF%BC%EC%9D%98%20%EC%88%B2%20%EC%98%A4%EB%A5%98%5D&body=${encodeURIComponent(`어떤 일이 있었나요?`+M)}`,N.append(P);let F=j.querySelector(`.ft-copy`);F?F.before(N):j.append(N);let I=o(`div`,`lp-bar`);I.append(p(`lp-play`)),f.append(m,h,v,...b,x.sec,S.sec,w.sec,j,I),document.body.append(f),f.focus({preventScroll:!0});let L=new IntersectionObserver(e=>e.forEach(e=>{e.isIntersecting&&(e.target.classList.add(`in`),L.unobserve(e.target))}),{root:f,threshold:.15});f.querySelectorAll(`.lp-up`).forEach(e=>L.observe(e));let R=new IntersectionObserver(([e])=>I.classList.toggle(`on`,!e.isIntersecting),{root:f,threshold:.1});R.observe(h);function z(){L.disconnect(),R.disconnect(),f.classList.add(`out`),setTimeout(()=>f.remove(),400),e()}}export{d as openLanding};