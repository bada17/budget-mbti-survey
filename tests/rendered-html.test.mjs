import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("첫 화면이 설문 시작 화면으로 뜬다", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>예산 성향 설문<\/title>/);
  assert.match(html, /어떻게 쓰는 사람일까요/);
  assert.match(html, /시작하기/);
  assert.match(html, /이름도 이메일도 묻지 않습니다/);

  /*
    첫 화면에 질문이 미리 보이면 안 됩니다. 한 문항씩 넘기는 화면인데 소스에
    열다섯 개가 다 들어 있으면, 스크롤이나 브라우저 찾기로 앞질러 볼 수 있고
    무엇보다 "한 문항씩"이 무너진 것입니다.
  */
  assert.doesNotMatch(html, /정부 예산에 여유가 생겼습니다/);
  assert.doesNotMatch(html, /세금이 1조 원 더 걷혔습니다/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

/*
  예산 게임이 앞에 있다는 전제로 쓰인 문구가 남아 있으면 안 됩니다.

  떼어 온 화면에는 "1부", "초과세수 편성", "앞에서 만든 예산 편성표" 같은
  말이 곳곳에 있었습니다. 이 사이트에는 그 앞 단계가 없으므로, 하나라도
  남으면 참여자는 자기가 뭘 빠뜨렸다고 생각하게 됩니다.
*/
test("예산 게임을 전제한 문구가 화면에 남아 있지 않다", async () => {
  const html = await (await render()).text();
  for (const phrase of [
    "1부",
    "초과세수",
    "예산 편성표",
    "10만원 예산 편성 투표",
    "10만 원",
  ]) {
    assert.doesNotMatch(
      html,
      new RegExp(phrase),
      `첫 화면에 "${phrase}" 문구가 남아 있습니다`,
    );
  }
});

test("keeps the undecided response API unmounted", async () => {
  const response = await render("/api/responses");
  assert.equal(response.status, 404);
});

test("contains only the two requested D1 tables", async () => {
  const migration = await readFile(
    new URL("../drizzle/0000_soft_micromax.sql", import.meta.url),
    "utf8",
  );
  const tables = [...migration.matchAll(/CREATE TABLE `([^`]+)`/g)].map(
    ([, name]) => name,
  );
  assert.deepEqual(tables, ["responses", "validation_responses"]);
  assert.doesNotMatch(migration, /budget_responses|contacts|subscriptions/);
});
