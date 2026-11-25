import { useState } from 'react';
import { validateTaskDraft } from '../domain/task-service.js';

function createDraft(initialTask, categories) {
  return {
    title: initialTask ? initialTask.title : '',
    priority: initialTask ? initialTask.priority : 'medium',
    categoryId: initialTask
      ? String(initialTask.categoryId)
      : (categories[0] ? String(categories[0].id) : ''),
  };
}

export default function TaskForm({ categories, initialTask = null, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => createDraft(initialTask, categories));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const isEditing = Boolean(initialTask);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setDraft(previous => ({ ...previous, [name]: value }));
    setSaveError('');
    setErrors(previous => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const result = validateTaskDraft(draft, categories);
    if (!result.valid) {
      setErrors(result.errors);
      setSaveError('');
      return;
    }

    setErrors({});
    const saved = onSave(result.value);
    if (!saved) {
      setSaveError('Не удалось сохранить задачу. Возможно, редактируемая запись уже удалена.');
      return;
    }

    setSaveError('');
    if (!isEditing) {
      setDraft(createDraft(null, categories));
    }
  }

  return (
    <section aria-label="Форма задачи">
      <h2>{isEditing ? `Редактирование задачи № ${initialTask.id}` : 'Добавление задачи'}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="task-title">
          Название
          <input
            id="task-title"
            name="title"
            type="text"
            value={draft.title}
            onChange={handleFieldChange}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'task-title-error' : undefined}
          />
        </label>
        {errors.title && (
          <p id="task-title-error" className="error" role="alert">
            {errors.title}
          </p>
        )}

        <label htmlFor="task-priority">
          Приоритет
          <select
            id="task-priority"
            name="priority"
            value={draft.priority}
            onChange={handleFieldChange}
            aria-invalid={Boolean(errors.priority)}
            aria-describedby={errors.priority ? 'task-priority-error' : undefined}
          >
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
        </label>
        {errors.priority && (
          <p id="task-priority-error" className="error" role="alert">
            {errors.priority}
          </p>
        )}

        <label htmlFor="task-category">
          Категория
          <select
            id="task-category"
            name="categoryId"
            value={draft.categoryId}
            onChange={handleFieldChange}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? 'task-category-error' : undefined}
          >
            <option value="">Выберите категорию</option>
            {categories.map(category => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        {errors.categoryId && (
          <p id="task-category-error" className="error" role="alert">
            {errors.categoryId}
          </p>
        )}

        {saveError && (
          <p className="error" role="alert">
            {saveError}
          </p>
        )}

        <div className="actions">
          <button type="submit">{isEditing ? 'Сохранить изменения' : 'Добавить задачу'}</button>
          {isEditing && (
            <button type="button" onClick={onCancel}>
              Отменить редактирование
            </button>
          )}
        </div>
      </form>
    </section>
  );
}