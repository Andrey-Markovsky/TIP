import TaskItem from './TaskItem.jsx';

export default function TaskList({ tasks, totalCount, categories, onToggle, onEdit, onDelete }) {
  const categoryNames = new Map(categories.map(category => [category.id, category.name]));
  const emptyMessage = totalCount === 0
    ? 'Список задач пуст. Добавьте первую задачу.'
    : 'По выбранным условиям задач нет.';

  return (
    <section aria-label="Список задач">
      <h2>Задачи (найдено: {tasks.length})</h2>
      {tasks.length === 0 ? (
        <p role="status">{emptyMessage}</p>
      ) : (
        <ul>
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              categoryName={categoryNames.get(task.categoryId) ?? 'Без категории'}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}