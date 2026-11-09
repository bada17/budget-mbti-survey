/*
  앱스 스크립트 웹 앱 입구 — 규칙은 server.js(= server/gas.ts 를 npm run build:gas 로 묶은 것)의 GameServer.serve.
  웹 앱 배포: 실행 = 나(배포한 사람), 액세스 = 모든 사용자(로그인 없이). 시트는 이 스크립트가 붙은 스프레드시트.
  쓰는 요청은 한 번에 하나씩(LockService) — 두 사람이 같은 줄을 동시에 고치지 않게.
*/
function doGet(e) {
  // 통계는 1분 기억한다(11-09) — 페이지를 열 때마다 누구나 부르는데, 끝낸 사람 기록을 통째로 읽어 사람이 쌓일수록 느려진다.
  // 몰려도 시트는 1분에 한 번만 읽는다. 끝내고 받는 통계(POST /finish)는 따로라 늘 새것.
  if (e && e.parameter && e.parameter.p === '/stats') {
    var cache = CacheService.getScriptCache(), kept = cache.get('game-stats');
    if (kept) return reply_({ status: 200, body: JSON.parse(kept) });
    var fresh = GameServer.serve('GET', e, book_(), Date.now());
    if (fresh.status < 400) try { cache.put('game-stats', JSON.stringify(fresh.body), 60); } catch (err) { /* 100KB 를 넘으면 기억만 못 한다 */ }
    return reply_(fresh);
  }
  return reply_(GameServer.serve('GET', e, book_(), Date.now()));
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // 8초 — 화면은 12초에 포기한다(net.ts). 그보다 먼저 「busy」로 답해야 「실패」를 본 사람 몰래 저장돼 쪽지가 두 장 붙는 일이 없고,
  // 기다리는 요청도 동시 실행 30칸을 차지하니 빨리 비켜 준다(11-09).
  if (!lock.tryLock(8000)) return reply_({ status: 503, body: { error: 'busy' } });
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
    mail: function (to) { stibeeAdd_(to); }, // 로그인 메일 동의 → 스티비 「시민의 숲」 주소록 → 스티비 자동 이메일이 가입 환영(server/gas.ts rememberMail)
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

function book_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function reply_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

/*
  가입 환영 메일 = 스티비(11-09 사용자 「갈아끼우기 쉬우면 걍 스티비로」) — 로그인 칸의 [필수] 이메일 동의를 하고 로그인하면
  서버가 시트 「메일 명단」 에 남기고(server/gas.ts rememberMail) 처음 한 번 여기서 스티비 「시민의 숲」 주소록(528908)에 넣는다.
  메일은 스티비 자동 이메일(트리거 「구독자 추가」·관리자 추가 포함·중복 안 함·항상)이 보낸다 — 글·모양은 스티비에서 고친다.
  (처음엔 구글 MailApp 으로 보냈다 — 꾸미기·수신거부·통계 때문에 바꿨다.)
  구독자 API: POST https://api.stibee.com/v2/lists/{주소록 번호}/subscribers, 머리 AccessToken(스탠다드 이상, 2025-01-21 뒤에 만든 키).
  키·주소록 번호는 스크립트 속성 STIBEE_KEY · STIBEE_WELCOME_LIST 에(코드·깃에 안 남김). 광고성 동의는 false — 환영 메일은 정보성.
  API 로 넣은 구독자에게도 자동 이메일이 도는 것을 testStibee 로 확인했다(11-09, 문서엔 없다).
*/
function stibeeAdd_(email) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('STIBEE_KEY'), list = props.getProperty('STIBEE_WELCOME_LIST');
  if (!key || !list) throw new Error('스크립트 속성에 STIBEE_KEY · STIBEE_WELCOME_LIST 가 없다');
  var r = UrlFetchApp.fetch('https://api.stibee.com/v2/lists/' + encodeURIComponent(list) + '/subscribers', {
    method: 'post', contentType: 'application/json', headers: { AccessToken: key }, muteHttpExceptions: true,
    payload: JSON.stringify({ subscriber: { email: email, status: 'subscribed', marketingAllowed: false }, updateEnabled: true }),
  });
  var code = r.getResponseCode();
  if (code !== 200 && code !== 201) throw new Error('스티비 ' + code + ' ' + r.getContentText().slice(0, 300));
  return code; // 200 = 새로 넣음, 201 = 이미 있어 고침(이땐 자동 이메일이 안 돌 수 있다)
}

/** 편집기에서 실행 — 실행한 사람의 주소를 스티비 「시민의 숲 가입」 주소록에 넣는다. 자동 이메일이 오면 성공. */
function testStibee() {
  var me = Session.getEffectiveUser().getEmail(), code = stibeeAdd_(me);
  Logger.log('스티비에 넣음: ' + me + ' → ' + code + (code === 201 ? ' (이미 있던 주소라 고치기만 함 — 주소록에서 지우고 다시 해 볼 것)' : ' (새로 넣음 — 메일함을 볼 것)'));
}

