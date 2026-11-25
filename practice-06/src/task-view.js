const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

function createActionButton(action, label, pressed = null) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  if (pressed !== null) {
    button.setAttribute("aria-pressed", String(pressed));
  }

  const span = document.createElement("span");
  span.className = "action-label";
  span.textContent = label;
  button.append(span);

  return button;
}

export function createTaskElement(task, category) {
  const item = document.createElement("li");
  item.classList.add("task-card");
  item.classList.toggle("is-completed", task.completed);
  item.dataset.taskId = String(task.id);

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.completed ? "Выполнена" : "В работе";

  const priority = document.createElement("span");
  priority.className = "task-priority";
  priority.textContent = PRIORITY_LABELS[task.priority] ?? task.priority;

  const categoryNode = document.createElement("span");
  categoryNode.className = "task-category";
  categoryNode.textContent = category?.name ?? "Без категории";

  meta.append(status, priority, categoryNode);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    createActionButton("toggle", task.completed ? "Вернуть в работу" : "Выполнить", task.completed),
    createActionButton("edit", "Изменить"),
    createActionButton("delete", "Удалить"),
  );

  item.append(title, meta, actions);
  return item;
}

export function renderTaskList(list, tasks, categories) {
  const categoryMap = new Map((categories ?? []).map((category) => [category.id, category]));
  const items = tasks.map((task) => createTaskElement(task, categoryMap.get(task.categoryId)));
  list.replaceChildren(...items);
}