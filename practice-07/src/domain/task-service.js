const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function validateTaskDraft(draft, categories) {
  const errors = {};
  const categoryList = Array.isArray(categories) ? categories : [];

  const rawTitle = draft?.title;
  let title = '';
  if (typeof rawTitle !== 'string') {
    errors.title = 'Название должно быть строкой.';
  } else {
    title = rawTitle.trim();
    if (title.length < 1 || title.length > 100) {
      errors.title = 'Название должно содержать от 1 до 100 символов.';
    }
  }

  const priority = draft?.priority;
  if (typeof priority !== 'string' || !ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = 'Выберите допустимый приоритет: низкий, средний или высокий.';
  }

  const rawCategoryId = draft?.categoryId;
  let categoryId = NaN;
  if (typeof rawCategoryId === 'number') {
    categoryId = rawCategoryId;
  } else if (typeof rawCategoryId === 'string' && /^[1-9]\d*$/.test(rawCategoryId.trim())) {
    categoryId = Number(rawCategoryId.trim());
  }

  if (
    !isPositiveSafeInteger(categoryId)
    || !categoryList.some(category => category.id === categoryId)
  ) {
    errors.categoryId = 'Выберите существующую категорию.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, value: null, errors };
  }

  return {
    valid: true,
    value: { title, priority, categoryId },
    errors: {},
  };
}

export function selectTasks(tasks, filters = {}) {
  const needle = typeof filters?.q === 'string'
    ? filters.q.trim().toLocaleLowerCase('ru-RU')
    : '';
  const completed = filters?.completed ?? '';
  const priority = filters?.priority ?? '';
  const categoryId = filters?.categoryId ?? '';

  return tasks.filter(task => {
    if (completed === 'true' || completed === true) {
      if (!task.completed) return false;
    } else if (completed === 'false' || completed === false) {
      if (task.completed) return false;
    }

    if (priority && task.priority !== priority) {
      return false;
    }

    if (categoryId !== '' && categoryId !== null && categoryId !== undefined) {
      if (task.categoryId !== Number(categoryId)) return false;
    }

    if (needle && !task.title.toLocaleLowerCase('ru-RU').includes(needle)) {
      return false;
    }

    return true;
  });
}

export function getTaskStats(tasks) {
  let completed = 0;
  for (const task of tasks) {
    if (task.completed) completed += 1;
  }
  return {
    total: tasks.length,
    completed,
    active: tasks.length - completed,
  };
}

export function addTask(tasks, value, id) {
  if (!isPositiveSafeInteger(id)) {
    throw new TypeError('id должен быть положительным целым числом.');
  }
  if (tasks.some(task => task.id === id)) {
    throw new Error(`Задача с id ${id} уже существует.`);
  }

  const nextTask = {
    id,
    title: value.title,
    priority: value.priority,
    categoryId: value.categoryId,
    completed: false,
  };

  return [...tasks, nextTask];
}

export function updateTask(tasks, id, value) {
  return tasks.map(task => (
    task.id === id
      ? {
          ...task,
          title: value.title,
          priority: value.priority,
          categoryId: value.categoryId,
        }
      : task
  ));
}

export function toggleTask(tasks, id) {
  return tasks.map(task => (
    task.id === id ? { ...task, completed: !task.completed } : task
  ));
}

export function removeTask(tasks, id) {
  return tasks.filter(task => task.id !== id);
}