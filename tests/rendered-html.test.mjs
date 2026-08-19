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

test("renders the separated survey holding surface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>예산 성향 설문<\/title>/);
  assert.match(html, /질문을 천천히 읽고/);
  assert.match(html, /1부터 6까지, 더 가까운 쪽을 골라주세요/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
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
