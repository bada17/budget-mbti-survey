/*
  앱스 스크립트 웹 앱 입구 — 규칙은 server.js(= server/gas.ts 를 npm run build:gas 로 묶은 것)의 GameServer.serve.
  웹 앱 배포: 실행 = 나(배포한 사람), 액세스 = 모든 사용자(로그인 없이). 시트는 이 스크립트가 붙은 스프레드시트.
  쓰는 요청은 한 번에 하나씩(LockService) — 두 사람이 같은 줄을 동시에 고치지 않게.
*/
function doGet(e) {
  return reply_(GameServer.serve('GET', e, book_()));
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return reply_({ status: 503, body: { error: 'busy' } });
  try {
    return reply_(GameServer.serve('POST', e, book_(), Date.now(), deps_()));
  } finally {
    lock.releaseLock();
  }
}

/**
 * 처음 한 번 — 앱스 스크립트 편집기에서 이 함수를 골라 「실행」 하면 시트 권한을 허용하는 창이 뜬다.
 * 주인이 한 번 허용해야 웹 앱이 열린다(안 하면 누구에게나 「액세스 거부됨」 403). 탭도 미리 만든다.
 */
function setup() {
  GameServer.serve('GET', { parameter: { p: '/stats' } }, book_());
  // 로그인 계정 해시에 치는 소금 — 한 번 만들면 바꾸지 않는다(바꾸면 모두 처음 온 사람이 된다).
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ACCOUNT_SALT')) props.setProperty('ACCOUNT_SALT', Utilities.getUuid() + Utilities.getUuid());
  UrlFetchApp.fetch('https://kauth.kakao.com', { muteHttpExceptions: true }); // 바깥 주소 부르기 권한도 이때 함께 허용받는다
  return book_().getName();
}

/**
 * 로그인 키 — 스크립트 속성이 비었을 때 쓴다(사용자가 속성 칸을 채우지 않아도 되게, 10-15).
 * 둘 다 공개판 화면 주소(카카오·구글로 가는 길)에 어차피 드러나는 값이라 여기 둬도 된다. 비밀(KAKAO_SECRET)은 넣지 않는다.
 */
var LOGIN_ = {
  KAKAO_REST_KEY: '',
  GOOGLE_CLIENT_ID: '',
  LOGIN_REDIRECTS: 'https://bada17.github.io/budget-mbti-survey/game/',
};

/** 로그인 확인에 쓰는 바깥 것들(server/gas.ts 의 Deps). */
function deps_() {
  var props = PropertiesService.getScriptProperties();
  // 소금이 없으면 처음 로그인 때 만든다(setup 을 다시 안 돌려도 되게). 쓰는 요청은 doPost 가 잠금을 잡고 부른다.
  if (!props.getProperty('ACCOUNT_SALT')) props.setProperty('ACCOUNT_SALT', Utilities.getUuid() + Utilities.getUuid());
  return {
    fetch: function (url, options) {
      var o = options || {};
      var r = UrlFetchApp.fetch(url, { method: o.method || 'get', payload: o.payload, headers: o.headers, muteHttpExceptions: true });
      return { status: r.getResponseCode(), text: r.getContentText() };
    },
    // 카카오 클라이언트 시크릿처럼 비밀인 것은 Secret.js(깃 무시, clasp push 로만 올라감)의 SECRET_ 에 — 있으면 쓴다.
    prop: function (name) { return props.getProperty(name) || LOGIN_[name] || (typeof SECRET_ !== 'undefined' && SECRET_[name]) || null; },
    sha256: function (text) {
      return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
        .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
    },
    random: function () { return parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16) / Math.pow(16, 12); },
  };
}

function book_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function reply_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
