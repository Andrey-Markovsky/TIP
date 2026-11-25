import { ApiError } from './errors.js';

const ALLOWED_PARAMS = new Set(['completed', 'priority', 'categoryId', 'q']);
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);

export function parsePositiveId(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseFilters(searchParams) {
  for (const key of new Set(searchParams.keys())) {
    if (!ALLOWED_PARAMS.has(key)) {
      throw new ApiError(400, 'INVALID_QUERY', `Неизвестный параметр запроса: ${key}.`);
    }
    if (searchParams.getAll(key).length > 1) {
      throw new ApiError(400, 'INVALID_QUERY', `Параметр ${key} нельзя передавать повторно.`);
    }
  }

  const filters = {
    completed: null,
    priority: null,
    categoryId: null,
    q: '',
  };

  if (searchParams.has('completed')) {
    const rawCompleted = searchParams.get('completed');
    if (rawCompleted !== 'true' && rawCompleted !== 'false') {
      throw new ApiError(400, 'INVALID_QUERY', 'Параметр completed должен быть true или false.');
    }
    filters.completed = rawCompleted === 'true';
  }

  if (searchParams.has('priority')) {
    const rawPriority = searchParams.get('priority');
    if (!ALLOWED_PRIORITIES.has(rawPriority)) {
      throw new ApiError(400, 'INVALID_QUERY', 'Параметр priority должен быть low, medium или high.');
    }
    filters.priority = rawPriority;
  }

  if (searchParams.has('categoryId')) {
    const rawCategoryId = searchParams.get('categoryId');
    const categoryId = parsePositiveId(rawCategoryId);
    if (categoryId === null) {
      throw new ApiError(400, 'INVALID_QUERY', 'Параметр categoryId должен быть положительным целым числом.');
    }
    filters.categoryId = categoryId;
  }

  if (searchParams.has('q')) {
    const q = searchParams.get('q').trim();
    if (q.length > 100) {
      throw new ApiError(400, 'INVALID_QUERY', 'Параметр q не должен превышать 100 символов.');
    }
    filters.q = q;
  }

  return filters;
}