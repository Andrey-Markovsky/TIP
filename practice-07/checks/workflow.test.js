import test from 'node:test';
import assert from 'node:assert/strict';
import { categories, tasks as initialTasks } from '../src/data.js';
import {
  validateTaskDraft,
  selectTasks,
  getTaskStats,
  addTask,
  updateTask,
  toggleTask,
  removeTask,
} from '../src/domain/task-service.js';

test('полный цикл: создание → редактирование → переключение → удаление', () => {
  const createdDraft = validateTaskDraft(
    { title: '  Собрать React-интерфейс  ', priority: 'high', categoryId: '2' },
    categories,
  );
  assert.equal(createdDraft.valid, true);

  const nextId = Math.max(...initialTasks.map(task => task.id)) + 1;
  const afterAdd = addTask(initialTasks, createdDraft.value, nextId);
  assert.equal(afterAdd.length, 13);
  assert.deepEqual(getTaskStats(afterAdd), { total: 13, completed: 5, active: 8 });

  const afterToggle = toggleTask(afterAdd, nextId);
  assert.equal(afterToggle.find(task => task.id === nextId).completed, true);

  const editDraft = validateTaskDraft(
    { title: 'Проверить сборку Vite', priority: 'low', categoryId: '1' },
    categories,
  );
  assert.equal(editDraft.valid, true);

  const afterEdit = updateTask(afterToggle, nextId, editDraft.value);
  const edited = afterEdit.find(task => task.id === nextId);
  assert.deepEqual(edited, {
    id: nextId,
    title: 'Проверить сборку Vite',
    priority: 'low',
    categoryId: 1,
    completed: true,
  });

  const afterRemove = removeTask(afterEdit, nextId);
  assert.deepEqual(afterRemove, initialTasks);
  assert.deepEqual(getTaskStats(afterRemove), { total: 12, completed: 5, active: 7 });
});

test('вариант 1: завершение видимой задачи скрывает её из фильтра completed="false"', () => {
  const variantFilters = { q: '', completed: 'false', priority: '', categoryId: '' };
  assert.equal(selectTasks(initialTasks, variantFilters).length, 7);

  const updated = toggleTask(initialTasks, 4);
  const visible = selectTasks(updated, variantFilters);
  assert.equal(visible.length, 6);
  assert.equal(visible.some(task => task.id === 4), false);
  assert.deepEqual(getTaskStats(updated), { total: 12, completed: 6, active: 6 });
});

test('удаление всех задач и последующее создание задачи с id = 1', () => {
  let state = initialTasks;
  for (const task of initialTasks) {
    state = removeTask(state, task.id);
  }
  assert.deepEqual(getTaskStats(state), { total: 0, completed: 0, active: 0 });

  const draft = validateTaskDraft({ title: 'Первая после очистки', priority: 'medium', categoryId: '1' }, categories);
  const recreated = addTask(state, draft.value, 1);
  assert.deepEqual(recreated, [
    { id: 1, title: 'Первая после очистки', priority: 'medium', categoryId: 1, completed: false },
  ]);
});