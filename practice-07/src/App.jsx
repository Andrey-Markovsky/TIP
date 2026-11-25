import { useState } from 'react';
import { tasks as initialTasks, categories } from './data.js';
import { createInitialFilters, variant } from './variant.js';
import {
  selectTasks,
  getTaskStats,
  addTask,
  updateTask,
  toggleTask,
  removeTask,
} from './domain/task-service.js';
import StatusMessage from './components/StatusMessage.jsx';
import TaskForm from './components/TaskForm.jsx';
import TaskFilters from './components/TaskFilters.jsx';
import TaskList from './components/TaskList.jsx';
import TaskStats from './components/TaskStats.jsx';

export default function App() {
  const [tasks, setTasks] = useState(() => initialTasks.map(task => ({ ...task })));
  const [filters, setFilters] = useState(createInitialFilters);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState({ text: '', tone: 'info' });

  const visibleTasks = selectTasks(tasks, filters);
  const stats = getTaskStats(tasks);
  const editingTask = editingId === null
    ? null
    : tasks.find(task => task.id === editingId) ?? null;

  function handleSave(value) {
    if (editingId !== null) {
      if (!tasks.some(task => task.id === editingId)) {
        setEditingId(null);
        setNotice({ text: `Задача № ${editingId} уже отсутствует в списке.`, tone: 'error' });
        return false;
      }
      const targetId = editingId;
      setTasks(previous => updateTask(previous, targetId, value));
      setEditingId(null);
      setNotice({ text: `Задача № ${targetId} обновлена.`, tone: 'success' });
      return true;
    }

    setTasks(previous => {
      const nextId = previous.length > 0
        ? Math.max(...previous.map(task => task.id)) + 1
        : 1;
      return addTask(previous, value, nextId);
    });
    setNotice({ text: `Задача «${value.title}» добавлена.`, tone: 'success' });
    return true;
  }

  function handleToggle(id) {
    setTasks(previous => toggleTask(previous, id));
    setNotice({ text: `Статус задачи № ${id} изменён.`, tone: 'success' });
  }

  function handleEdit(id) {
    setEditingId(id);
    setNotice({ text: `Редактирование задачи № ${id}.`, tone: 'info' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setNotice({ text: 'Редактирование отменено.', tone: 'info' });
  }

  function handleDelete(id) {
    if (!window.confirm(`Удалить задачу № ${id}?`)) {
      return;
    }
    setTasks(previous => removeTask(previous, id));
    if (editingId === id) {
      setEditingId(null);
    }
    setNotice({ text: `Задача № ${id} удалена.`, tone: 'success' });
  }

  return (
    <main>
      <h1>Задачи на React</h1>
      <p>
        ПР7 (вариант {variant}): данные хранятся в памяти. Обновление страницы восстанавливает исходный набор.
      </p>
      <StatusMessage message={notice.text} tone={notice.tone} />

      <TaskStats stats={stats} visibleCount={visibleTasks.length} />
      <TaskFilters filters={filters} categories={categories} onChange={setFilters} />
      <TaskForm
        key={editingId ?? 'new'}
        categories={categories}
        initialTask={editingTask}
        onSave={handleSave}
        onCancel={handleCancelEdit}
      />
      <TaskList
        tasks={visibleTasks}
        totalCount={tasks.length}
        categories={categories}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </main>
  );
}