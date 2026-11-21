import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";
import { searchTasks } from "./task-extra.js";

function printStats(label, tasks) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  if (total === 0) {
    console.log(`${label}: Задач пока нет`);
    return;
  }
  console.log(
    `${label}: всего ${total} / выполнено ${completed} / осталось ${pending} / прогресс ${progress.toFixed(1)}%`
  );
}

function applyStep(label, currentTasks, result) {
  if (!result.ok) {
    console.error(`${label} — ошибка: ${result.error}`);
    return currentTasks;
  }
  printStats(label, result.tasks);
  return result.tasks;
}

console.log("=== 1. Общий демонстрационный сценарий ===");
let currentTasks = demoTasks;
console.log("Названия:", getTaskTitles(currentTasks));
console.log(
  "Невыполненные id:",
  getPendingTasks(currentTasks).map((task) => task.id)
);
printStats("Исходный набор", currentTasks);

currentTasks = applyStep(
  "Добавление id 20",
  currentTasks,
  addTask(currentTasks, 20, "Добавить проверку", "high")
);
currentTasks = applyStep(
  "Выполнение id 4",
  currentTasks,
  setTaskCompleted(currentTasks, 4, true)
);
currentTasks = applyStep(
  "Переименование id 10",
  currentTasks,
  renameTask(currentTasks, 10, "Подготовить инструкцию запуска")
);
currentTasks = applyStep(
  "Удаление id 7",
  currentTasks,
  removeTask(currentTasks, 7)
);

currentTasks = applyStep(
  "Попытка добавить дубликат id 20",
  currentTasks,
  addTask(currentTasks, 20, "Дубликат")
);

console.log(
  "Итоговые id:",
  currentTasks.map((task) => task.id)
);
console.log(
  "Невыполненные id в итоге:",
  getPendingTasks(currentTasks).map((task) => task.id)
);
console.log("Новое название id 10:", findTaskById(currentTasks, 10).title);
console.log(
  "Проверка неизменности demoTasks:",
  `длина=${demoTasks.length}, id 4 completed=${findTaskById(demoTasks, 4).completed}, id 10 title="${findTaskById(demoTasks, 10).title}"`
);

console.log(`\n=== 2. Индивидуальный сценарий (Вариант ${variantNumber}) ===`);
let variantCurrent = variantTasks;
printStats("Шесть исходных задач", variantCurrent);

variantCurrent = applyStep(
  "Добавление id 80",
  variantCurrent,
  addTask(variantCurrent, 80, "Провести репетицию защиты проекта", "high")
);
variantCurrent = applyStep(
  "Выполнение id 11",
  variantCurrent,
  setTaskCompleted(variantCurrent, 11, true)
);
variantCurrent = applyStep(
  "Переименование id 23",
  variantCurrent,
  renameTask(variantCurrent, 23, "Уточнить календарный план разработки")
);
variantCurrent = applyStep(
  "Удаление id 37",
  variantCurrent,
  removeTask(variantCurrent, 37)
);
variantCurrent = applyStep(
  "Повторное добавление id 80",
  variantCurrent,
  addTask(variantCurrent, 80, "Повторная задача", "low")
);

console.log(
  "Итоговые id варианта:",
  variantCurrent.map((task) => task.id)
);
console.log(
  "Проверка неизменности variantTasks:",
  `длина=${variantTasks.length}, id 11 completed=${findTaskById(variantTasks, 11).completed}, id 23 title="${findTaskById(variantTasks, 23).title}"`
);

console.log("\n=== 3. Расширение: searchTasks ===");
console.log(
  'Поиск " ФУНК " в demoTasks:',
  searchTasks(demoTasks, " ФУНК ").map((task) => task.id)
);
console.log(
  'Поиск "несуществующий фрагмент":',
  searchTasks(demoTasks, "несуществующий фрагмент")
);
console.log(
  'Поиск с пробельным запросом "   " (кол-во):',
  searchTasks(demoTasks, "   ").length
);