const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

export function validateTaskDraft(draft, categories) {
  const errors = {};
  const categoryList = Array.isArray(categories) ? categories : [];

  const rawTitle = draft?.title;
  let normalizedTitle = "";

  if (typeof rawTitle !== "string") {
    errors.title = "Название должно быть строкой.";
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

  const rawCategoryId = draft?.categoryId;
  let parsedCategoryId = NaN;

  if (typeof rawCategoryId === "number") {
    parsedCategoryId = rawCategoryId;
  } else if (typeof rawCategoryId === "string" && rawCategoryId.trim().length > 0) {
    parsedCategoryId = Number(rawCategoryId.trim());
  }

  if (
    !Number.isSafeInteger(parsedCategoryId)
    || parsedCategoryId <= 0
    || !categoryList.some((category) => category.id === parsedCategoryId)
  ) {
    errors.categoryId = "Выберите существующую категорию.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, value: null, errors };
  }

  return {
    valid: true,
    value: {
      title: normalizedTitle,
      priority,
      categoryId: parsedCategoryId,
    },
    errors: {},
  };
}