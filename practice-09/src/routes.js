import { Router } from 'express';
import { ApiError } from './errors.js';
import { parsePositiveId, parseFilters } from './validation.js';

export function createRouter(store) {
  const router = Router({ caseSensitive: true });

  router.get('/health', (req, res) => res.json({ data: { status: 'ok' } }));

  router.get('/categories', (req, res) => {
    const categories = store.listCategories();
    res.json({ data: categories, meta: { total: categories.length } });
  });

  router.get('/tasks', (req, res) => {
    const url = new URL(req.originalUrl, 'http://localhost');
    const filters = parseFilters(url.searchParams);
    const tasks = store.listTasks(filters);
    res.json({ data: tasks, meta: { total: tasks.length, filters } });
  });

  router.get('/tasks/:id', (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (id === null) {
      throw new ApiError(400, 'INVALID_ID', 'id задачи должен быть положительным целым числом.');
    }
    const task = store.getTask(id);
    if (!task) {
      throw new ApiError(404, 'TASK_NOT_FOUND', `Задача с id ${id} не найдена.`, { id });
    }
    res.json({ data: task });
  });

  const methodNotAllowed = (req, res, next) => {
    res.set('Allow', 'GET, HEAD, OPTIONS');
    next(new ApiError(405, 'METHOD_NOT_ALLOWED', 'Для этого ресурса доступны только GET, HEAD и OPTIONS.'));
  };

  for (const path of ['/health', '/categories', '/tasks', '/tasks/:id']) {
    router.all(path, methodNotAllowed);
  }

  return router;
}