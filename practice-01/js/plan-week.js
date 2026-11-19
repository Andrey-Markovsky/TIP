"use strict";

const totalTasks = 6;
const completedTasks = 0;
const dailyLimit = 1;

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
    console.log("Рабочих дней с выполнением задач: 0");
    console.log("Календарных дней: 0");
  } else {
    console.log(`Осталось задач: ${remainingTasks}`);
    let calendarDay = 0;
    let workingDays = 0;

    while (remainingTasks > 0) {
      calendarDay += 1;
      const dayOfWeek = ((calendarDay - 1) % 7) + 1;

      if (dayOfWeek === 6 || dayOfWeek === 7) {
        console.log(`День ${calendarDay}: выходной, осталось ${remainingTasks}`);
      } else {
        workingDays += 1;
        const doneToday = Math.min(dailyLimit, remainingTasks);
        remainingTasks -= doneToday;
        console.log(`День ${calendarDay}: выполнено ${doneToday}, осталось ${remainingTasks}`);
      }
    }

    console.log(`Рабочих дней с выполнением задач: ${workingDays}`);
    console.log(`Календарных дней: ${calendarDay}`);
  }
}