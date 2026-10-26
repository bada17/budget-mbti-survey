/*
  앱스 스크립트 웹 앱 입구 — 규칙은 server.js(= server/gas.ts 를 npm run build:gas 로 묶은 것)의 GameServer.serve.
  웹 앱 배포: 실행 = 나(배포한 사람), 액세스 = 모든 사용자(로그인 없이). 시트는 이 스크립트가 붙은 스프레드시트.
  쓰는 요청은 한 번에 하나씩(LockService) — 두 사람이 같은 줄을 동시에 고치지 않게.
*/
function doGet(e) {
  return reply_(GameServer.serve('GET', e, book_(), Date.now(), undefined, cheerRows_));
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return reply_({ status: 503, body: { error: 'busy' } });
  try {
    return reply_(GameServer.serve('POST', e, book_(), Date.now(), deps_(), cheerRows_));
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
  KAKAO_REST_KEY: '2c211b5e7341b2e654b07178f8c4a2e0',
  GOOGLE_CLIENT_ID: '923895140266-9s542791ibsnb8d8j0iouirhocovbi1f.apps.googleusercontent.com',
  // 새 주소(10-19 forest.action.or.kr)를 더했다 — 옛 주소는 깃허브가 새 주소로 넘겨주지만 지우지 않는다(카카오·구글 콘솔도 둘 다).
  // 10-20 게임을 첫 주소(forest.action.or.kr/)로 옮겼다 — 첫 주소를 더하고, 옮기기 전에 로그인하러 간 사람이 /game/ 으로 돌아오니 옛 둘도 둔다.
  LOGIN_REDIRECTS: 'https://forest.action.or.kr/,https://bada17.github.io/budget-mbti-survey/game/,https://forest.action.or.kr/game/',
};

/** 로그인 확인에 쓰는 바깥 것들(server/gas.ts 의 Deps). */
function deps_() {
  var props = PropertiesService.getScriptProperties();
  // 소금이 없으면 처음 로그인 때 만든다(setup 을 다시 안 돌려도 되게). 쓰는 요청은 doPost 가 잠금을 잡고 부른다.
  if (!props.getProperty('ACCOUNT_SALT')) props.setProperty('ACCOUNT_SALT', Utilities.getUuid() + Utilities.getUuid());
  return {
    cache: CacheService.getScriptCache(),
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
    quota: function (bucket, limit, seconds) {
      // ponytail: ScriptCache는 일찍 비워질 수 있다. 지속적인 남용이면 영구 카운터/서버 이전으로 바꾼다.
      var cache = CacheService.getScriptCache();
      var key = 'game-quota:' + bucket;
      var count = Number(cache.get(key) || 0);
      if (count >= limit) return false;
      cache.put(key, String(count + 1), seconds);
      return true;
    },
  };
}

/**
 * 창립행사 응원 폼(후원주점 행사 페이지)의 응답 시트 — 스크립트 속성 또는 Secret.js 의 CHEER_SHEET_ID(시트 주소 /d/ 와 /edit 사이).
 * 폼·시트는 사용자 개인 계정 것이라, 이 웹 앱을 배포한 계정에 시트 「보기」 공유가 있어야 열린다. 못 열면 빈 칸 — 응원판엔 바로 적은 응원만 보인다.
 * 시트 번호를 여기 적지 않는 건 이 저장소가 공개라서(열 권한은 없어도 비공개 시트 주소를 내놓지 않는다).
 */
function cheerRows_() {
  var id = PropertiesService.getScriptProperties().getProperty('CHEER_SHEET_ID') || (typeof SECRET_ !== 'undefined' && SECRET_.CHEER_SHEET_ID);
  if (!id) return [];
  try {
    var sheets = SpreadsheetApp.openById(id).getSheets(); // 폼이 응답 탭을 몇 번째에 넣을지 몰라 — 폼이 붙은 탭을 찾는다
    for (var i = 0; i < sheets.length; i++) if (sheets[i].getFormUrl()) return sheets[i].getDataRange().getValues();
    return [];
  } catch (err) {
    console.warn('응원 폼 시트를 못 열었다: ' + err);
    return [];
  }
}

function book_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function reply_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
