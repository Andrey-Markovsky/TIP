"use strict";

const totalTasks = 12;
const completedTasks = 5;
const dailyLimit = 3;

if (
  typeof totalTasks !== "number" ||
  typeof completedTasks !== "number" ||
  typeof dailyLimit !== "number"
) {
  console.log("Ошибка: все входные данные должны быть числами.");
} else if (
  !Number.isFinite(totalTasks) ||
  !Number.isFinite(completedTasks) ||
  !Number.isFinite(dailyLimit)
) {
  console.log("Ошибка: входные данные должны быть конечными числами.");
} else if (
  !Number.isInteger(totalTasks) ||
  !Number.isInteger(completedTasks) ||
  !Number.isInteger(dailyLimit)
) {
  console.log("Ошибка: входные данные должны быть целыми числами.");
} else if (totalTasks < 0 || completedTasks < 0) {
  console.log("Ошибка: количество задач не может быть отрицательным.");
} else if (totalTasks > 1000) {
  console.log("Ошибка: общее количество задач не должно превышать 1000.");
} else if (completedTasks > totalTasks) {
  console.log("Ошибка: выполненных задач не может быть больше общего количества.");
} else if (dailyLimit < 1 || dailyLimit > 1000) {
  console.log("Ошибка: дневная норма должна быть в диапазоне от 1 до 1000.");
} else {
  let remainingTasks = totalTasks - completedTasks;

  if (remainingTasks === 0) {
    console.log("Все задачи уже выполнены.");
    console.log("Потребуется дней: 0");
  } else {
    console.log(`Осталось задач: ${remainingTasks}`);
    let day = 0;

    while (remainingTasks > 0) {
      day += 1;
      const doneToday = Math.min(dailyLimit, remainingTasks);
      remainingTasks -= doneToday;
      console.log(`День ${day}: выполнено ${doneToday}, осталось ${remainingTasks}`);
    }

    console.log(`Потребуется дней: ${day}`);
  }
}