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
    return reply_(GameServer.serve('POST', e, book_()));
  } finally {
    lock.releaseLock();
  }
}

function book_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function reply_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
