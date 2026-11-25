import assert from "node:assert/strict";
import { createAppController } from "../src/app-controller.js";

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

function createViewDouble() {
  return {
    durations: [],
    setListState() {},
    setTasks() {},
    setCategories() {},
    setTotal() {},
    setFormTask() {},
    showFormErrors() {},
    setMutationPending() {},
    notify() {},
    setLastDuration(ms) { this.durations.push(ms); },
  };
}

function createApiDouble(overrides = {}) {
  const sample = { id: 4, title: "Задача", completed: false, priority: "high", categoryId: 1 };
  const cats = [{ id: 1, name: "Учёба" }];
  return {
    async loadInitialData() {
      await new Promise((r) => setTimeout(r, 15));
      return { tasks: [sample], categories: cats, meta: { total: 1, filters: {} } };
    },
    async getTasks() {
      await new Promise((r) => setTimeout(r, 10));
      return { tasks: [sample], meta: { total: 1, filters: {} } };
    },
    async createTask(draft) { return { id: 35, completed: false, ...draft }; },
    async updateTask(id, changes) { return { ...sample, id, ...changes }; },
    async setTaskCompleted(id, completed) { return { ...sample, id, completed }; },
    async deleteTask() { return null; },
    async resetDemoData() { return { reset: true, total: 12 }; },
    ...overrides,
  };
}

await check("Доп. 1. Длительность фиксируется при начальной загрузке через performance.now()", async () => {
  const view = createViewDouble();
  const controller = createAppController({ api: createApiDouble(), view });
  await controller.start({});
  assert.equal(view.durations.length, 1);
  assert.equal(typeof view.durations[0], "number");
  assert.ok(view.durations[0] >= 0);
});

await check("Доп. 2. Длительность обновляется при фильтрации и refresh", async () => {
  const view = createViewDouble();
  const controller = createAppController({ api: createApiDouble(), view });
  await controller.start({});
  await controller.applyFilters({ completed: false });
  await controller.refresh();
  assert.equal(view.durations.length, 3);
  assert.ok(view.durations.every((d) => typeof d === "number" && d >= 0));
});

await check("Доп. 3. Устаревший ответ не перезаписывает длительность актуального запроса", async () => {
  const view = createViewDouble();
  let resolveSlow;
  let calls = 0;
  const api = createApiDouble({
    loadInitialData() {
      calls += 1;
      if (calls === 1) {
        return new Promise((resolve) => { resolveSlow = resolve; });
      }
      return Promise.resolve({
        tasks: [],
        categories: [{ id: 1, name: "Учёба" }],
        meta: { total: 0, filters: {} },
      });
    },
  });
  const controller = createAppController({ api, view });
  const slow = controller.start({});
  await controller.applyFilters({ q: "быстрый" });
  assert.equal(view.durations.length, 1);
  resolveSlow({
    tasks: [],
    categories: [{ id: 1, name: "Учёба" }],
    meta: { total: 0, filters: {} },
  });
  await slow;
  assert.equal(view.durations.length, 1);
});

console.log(`\nИтог доп. проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;