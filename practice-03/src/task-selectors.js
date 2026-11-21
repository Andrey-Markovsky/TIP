export function getVisibleTasks(tasks, filter = "all") {
  if (filter === "pending") {
    return tasks.filter((task) => task.completed === false);
  }
  if (filter === "completed") {
    return tasks.filter((task) => task.completed === true);
  }
  return [...tasks];
}

export function filterTasksByPriority(tasks, priority = "all") {
  if (priority === "all") {
    return [...tasks];
  }
  return tasks.filter((task) => task.priority === priority);
}