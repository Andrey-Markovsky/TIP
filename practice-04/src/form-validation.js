const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  let normalizedId = null;

  if (editingId !== null) {
    if (
      typeof editingId !== "number" ||
      !Number.isSafeInteger(editingId) ||
      editingId <= 0 ||
      !tasks.some((task) => task.id === editingId)
    ) {
      errors.id = `Задача с id ${editingId} не найдена.`;
    } else {
      normalizedId = editingId;
    }
  } else {
    const rawId = draft?.id;
    let parsedId = NaN;

    if (typeof rawId === "number") {
      parsedId = rawId;
    } else if (typeof rawId === "string") {
      const trimmedId = rawId.trim();
      if (trimmedId.length > 0) {
        parsedId = Number(trimmedId);
      }
    }

    if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
      errors.id = "Идентификатор должен быть положительным целым числом.";
    } else if (tasks.some((task) => task.id === parsedId)) {
      errors.id = `Задача с id ${parsedId} уже существует.`;
    } else {
      normalizedId = parsedId;
    }
  }

  const rawTitle = draft?.title;
  let normalizedTitle = "";

  if (typeof rawTitle !== "string") {
    errors.title = "Название задачи должно быть строкой.";
  } else {
    normalizedTitle = rawTitle.trim();
    if (normalizedTitle.length < 1 || normalizedTitle.length > 100) {
      errors.title = "Название должно содержать от 1 до 100 символов.";
    }
  }

  const priority = draft?.priority;
  if (typeof priority !== "string" || !ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите допустимый приоритет: низкий, средний или высокий.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      id: normalizedId,
      title: normalizedTitle,
      priority,
    },
  };
}