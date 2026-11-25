const PRIORITY_LABELS = Object.freeze({
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
});

export default function TaskItem({ task, categoryName, onToggle, onEdit, onDelete }) {
  return (
    <li>
      <p>
        <strong>{task.title}</strong> (#{task.id})
      </p>
      <p>
        Статус: {task.completed ? 'Выполнена' : 'В работе'} · Приоритет:{' '}
        {PRIORITY_LABELS[task.priority] ?? task.priority} · Категория: {categoryName}
      </p>
      <div className="actions">
        <button type="button" onClick={() => onToggle(task.id)}>
          {task.completed ? 'Вернуть в работу' : 'Выполнить'}
        </button>
        <button type="button" onClick={() => onEdit(task.id)}>
          Изменить
        </button>
        <button type="button" onClick={() => onDelete(task.id)}>
          Удалить
        </button>
      </div>
    </li>
  );
}