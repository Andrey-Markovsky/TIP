import assert from "node:assert/strict";
import { createApiServer } from "../api/server.mjs";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { loadInitialDataPartial } from "../src/task-extra.js";
import { variantFilters, variantNumber } from "../src/variant.js";

let passed = 0;
let failed = 0;

async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error.stack ?? error.message);
  }
}

const server = createApiServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/api`;
const client = createApiClient({ baseUrl, timeoutMs: 1000 });
const api = createTaskApi(client);

try {
  await check("Собственная 1. Вариант 1 ({ completed: false }) и комбинация с priority + categoryId", async () => {
    assert.equal(variantNumber, 1);
    const variantUrl = buildUrl(baseUrl, "/tasks", variantFilters);
    assert.equal(variantUrl, `${baseUrl}/tasks?completed=false`);
    const variantRes = await api.getTasks(variantFilters);
    assert.deepEqual(variantRes.tasks.map((t) => t.id), [4, 7, 13, 19, 22, 28, 34]);
    assert.equal(variantRes.meta.total, 7);

    const combo = await api.getTasks({ completed: false, priority: "medium", categoryId: 3 });
    assert.deepEqual(combo.tasks.map((t) => t.id), [19]);
    assert.equal(combo.meta.total, 1);
  });

  await check("Собственная 2. HTTP-ошибка 404 для несуществующей категории (/categories/99)", async () => {
    let caught;
    try {
      await client.requestJson("/categories/99");
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof ApiError);
    assert.equal(caught.kind, "http");
    assert.equal(caught.status, 404);
    assert.equal(caught.code, "CATEGORY_NOT_FOUND");
  });

  await check("Собственная 3. Заранее отменённый AbortSignal и проверка дубликатов id в категориях", async () => {
    const controller = new AbortController();
    controller.abort();
    let abortedError;
    try {
      await client.requestJson("/tasks", { signal: controller.signal });
    } catch (error) {
      abortedError = error;
    }
    assert.ok(abortedError instanceof ApiError);
    assert.equal(abortedError.kind, "aborted");

    const dupCatApi = createTaskApi({
      async requestJson() {
        return {
          data: [{ id: 1, name: "А" }, { id: 1, name: "Б" }],
          meta: { total: 2 },
        };
      },
    });
    let schemaError;
    try {
      await dupCatApi.getCategories();
    } catch (error) {
      schemaError = error;
    }
    assert.ok(schemaError instanceof ApiError);
    assert.equal(schemaError.kind, "invalid-response");
  });

  await check("Расширение А-1. loadInitialDataPartial: успех обоих запросов", async () => {
    const res = await loadInitialDataPartial(api, variantFilters);
    assert.equal(res.ok, true);
    assert.equal(res.tasks.length, 7);
    assert.equal(res.categories.length, 3);
    assert.deepEqual(res.errors, { tasks: null, categories: null });
  });

  await check("Расширение А-2. loadInitialDataPartial: ошибка задач при доступных категориях", async () => {
    const mockApi = createTaskApi({
      async requestJson(path) {
        if (path === "/tasks") {
          throw new ApiError("Сервис задач недоступен", { kind: "http", status: 503, code: "SERVICE_UNAVAILABLE" });
        }
        return { data: [{ id: 1, name: "Учёба" }], meta: { total: 1 } };
      },
    });
    const res = await loadInitialDataPartial(mockApi);
    assert.equal(res.ok, false);
    assert.equal(res.tasks, null);
    assert.equal(res.categories.length, 1);
    assert.equal(res.errors.tasks.kind, "http");
    assert.equal(res.errors.tasks.status, 503);
    assert.equal(res.errors.categories, null);
  });

  await check("Расширение А-3. loadInitialDataPartial: ошибка категорий при доступных задачах", async () => {
    const mockApi = createTaskApi({
      async requestJson(path) {
        if (path === "/categories") {
          throw new ApiError("Сетевая ошибка", { kind: "network" });
        }
        return {
          data: [{ id: 1, title: "Задача", completed: false, priority: "low", categoryId: 1 }],
          meta: { total: 1, filters: {} },
        };
      },
    });
    const res = await loadInitialDataPartial(mockApi);
    assert.equal(res.ok, false);
    assert.equal(res.tasks.length, 1);
    assert.equal(res.categories, null);
    assert.equal(res.errors.tasks, null);
    assert.equal(res.errors.categories.kind, "network");
  });

  await check("Расширение А-4. loadInitialDataPartial: ошибка обоих запросов", async () => {
    const mockApi = createTaskApi({
      async requestJson() {
        throw new ApiError("Тайм-аут", { kind: "timeout" });
      },
    });
    const res = await loadInitialDataPartial(mockApi);
    assert.equal(res.ok, false);
    assert.equal(res.tasks, null);
    assert.equal(res.categories, null);
    assert.equal(res.errors.tasks.kind, "timeout");
    assert.equal(res.errors.categories.kind, "timeout");
  });

  console.log("\n=== Замер задержки 2 × /debug/delay?ms=100 (3 прогона) ===");
  for (let i = 1; i <= 3; i += 1) {
    const tSeq = performance.now();
    await client.requestJson("/debug/delay", { query: { ms: 100 } });
    await client.requestJson("/debug/delay", { query: { ms: 100 } });
    const seqMs = performance.now() - tSeq;

    const tPar = performance.now();
    await Promise.all([
      client.requestJson("/debug/delay", { query: { ms: 100 } }),
      client.requestJson("/debug/delay", { query: { ms: 100 } }),
    ]);
    const parMs = performance.now() - tPar;

    console.log(`Прогон ${i}: последовательно ${seqMs.toFixed(1)} мс | Promise.all ${parMs.toFixed(1)} мс`);
  }
} finally {
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

console.log(`\nИтог собственных и доп. проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;