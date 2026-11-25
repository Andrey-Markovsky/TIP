import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

const REQUIRED_API_METHODS = [
  "loadInitialData",
  "getTasks",
  "createTask",
  "updateTask",
  "setTaskCompleted",
  "deleteTask",
  "resetDemoData",
];

const REQUIRED_VIEW_METHODS = [
  "setListState",
  "setTasks",
  "setCategories",
  "setTotal",
  "setFormTask",
  "showFormErrors",
  "setMutationPending",
  "notify",
];

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

function assertDependencies(api, view, validateDraft) {
  if (!api || typeof api !== "object") {
    throw new TypeError("Контроллеру требуется объект api.");
  }
  for (const method of REQUIRED_API_METHODS) {
    if (typeof api[method] !== "function") {
      throw new TypeError(`В api отсутствует обязательный метод ${method}.`);
    }
  }

  if (!view || typeof view !== "object") {
    throw new TypeError("Контроллеру требуется объект view.");
  }
  for (const method of REQUIRED_VIEW_METHODS) {
    if (typeof view[method] !== "function") {
      throw new TypeError(`В view отсутствует обязательный метод ${method}.`);
    }
  }

  if (typeof validateDraft !== "function") {
    throw new TypeError("validateDraft должен быть функцией.");
  }
}

export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  assertDependencies(api, view, validateDraft);

  let currentTasks = [];
  let currentCategories = [];
  let categoriesLoaded = false;
  let currentFilters = {};
  let editingId = null;
  let activeController = null;
  let loadSequence = 0;

  async function loadCurrentTasks(filters = currentFilters) {
    currentFilters = { ...filters };

    if (activeController) {
      activeController.abort();
    }
    const controller = new AbortController();
    activeController = controller;
    loadSequence += 1;
    const requestId = loadSequence;

    view.setListState("loading");
    const startedAt = performance.now();

    try {
      let tasks;
      let total;

      if (!categoriesLoaded) {
        const result = await api.loadInitialData(currentFilters, { signal: controller.signal });
        if (requestId !== loadSequence) return;
        currentCategories = result.categories;
        categoriesLoaded = true;
        view.setCategories(currentCategories);
        tasks = result.tasks;
        total = result.meta?.total ?? tasks.length;
      } else {
        const result = await api.getTasks(currentFilters, { signal: controller.signal });
        if (requestId !== loadSequence) return;
        tasks = result.tasks;
        total = result.meta?.total ?? tasks.length;
      }

      const elapsedMs = performance.now() - startedAt;
      currentTasks = tasks;
      view.setTasks(currentTasks, currentCategories);
      view.setTotal(total);
      view.setLastDuration?.(elapsedMs);
      view.setListState(currentTasks.length > 0 ? "ready" : "empty");
    } catch (error) {
      if (requestId !== loadSequence) return;
      if (error instanceof ApiError && error.kind === "aborted") return;
      view.setListState("error", messageForError(error));
    } finally {
      if (activeController === controller) {
        activeController = null;
      }
    }
  }

  async function runMutation(action, successMessage) {
    view.setMutationPending(true);
    view.notify("", "");

    try {
      await action();
      view.notify(successMessage, "success");
      await loadCurrentTasks(currentFilters);
    } catch (error) {
      if (
        error instanceof ApiError
        && error.kind === "http"
        && error.code === "VALIDATION_ERROR"
        && error.details
        && typeof error.details === "object"
      ) {
        view.showFormErrors(error.details);
      }
      view.notify(messageForError(error), "error");
    } finally {
      view.setMutationPending(false);
    }
  }

  function start(filters = {}) {
    return loadCurrentTasks(filters);
  }

  function applyFilters(filters = {}) {
    return loadCurrentTasks(filters);
  }

  function refresh() {
    return loadCurrentTasks(currentFilters);
  }

  async function submit(draft) {
    const validation = validateDraft(draft, currentCategories);
    if (!validation.valid) {
      view.showFormErrors(validation.errors);
      return;
    }

    view.showFormErrors({});

    if (editingId !== null) {
      const targetId = editingId;
      await runMutation(async () => {
        await api.updateTask(targetId, validation.value);
        editingId = null;
        view.setFormTask(null);
      }, "Изменения сохранены.");
    } else {
      await runMutation(async () => {
        await api.createTask(validation.value);
        view.setFormTask(null);
      }, "Задача добавлена.");
    }
  }

  function beginEdit(id) {
    const task = currentTasks.find((item) => item.id === id);
    if (!task) {
      view.notify("Задача не найдена в текущем списке.", "error");
      return;
    }
    editingId = task.id;
    view.showFormErrors({});
    view.setFormTask(task);
  }

  function cancelEdit() {
    editingId = null;
    view.showFormErrors({});
    view.setFormTask(null);
  }

  async function toggleTask(id) {
    const task = currentTasks.find((item) => item.id === id);
    if (!task) {
      view.notify("Задача не найдена в текущем списке.", "error");
      return;
    }

    await runMutation(async () => {
      await api.setTaskCompleted(id, !task.completed);
    }, "Статус задачи обновлён.");
  }

  async function deleteTask(id) {
    await runMutation(async () => {
      await api.deleteTask(id);
      if (editingId === id) {
        editingId = null;
        view.setFormTask(null);
        view.showFormErrors({});
      }
    }, "Задача удалена.");
  }

  async function resetData() {
    await runMutation(async () => {
      await api.resetDemoData();
      editingId = null;
      view.setFormTask(null);
      view.showFormErrors({});
    }, "Учебные данные восстановлены.");
  }

  function destroy() {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    loadSequence += 1;
  }

  return {
    start,
    applyFilters,
    refresh,
    submit,
    beginEdit,
    cancelEdit,
    toggleTask,
    deleteTask,
    resetData,
    destroy,
  };
}