import { ApiError } from "./api-client.js";

function toErrorDescriptor(error) {
  if (error instanceof ApiError) {
    return {
      kind: error.kind,
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }
  return {
    kind: "unknown",
    message: error instanceof Error ? error.message : String(error),
    status: null,
    code: null,
  };
}

export async function loadInitialDataPartial(api, filters = {}) {
  const [tasksOutcome, categoriesOutcome] = await Promise.allSettled([
    api.getTasks(filters),
    api.getCategories(),
  ]);

  const tasksOk = tasksOutcome.status === "fulfilled";
  const categoriesOk = categoriesOutcome.status === "fulfilled";

  return {
    ok: tasksOk && categoriesOk,
    tasks: tasksOk ? tasksOutcome.value.tasks : null,
    meta: tasksOk ? tasksOutcome.value.meta : null,
    categories: categoriesOk ? categoriesOutcome.value : null,
    errors: {
      tasks: tasksOk ? null : toErrorDescriptor(tasksOutcome.reason),
      categories: categoriesOk ? null : toErrorDescriptor(categoriesOutcome.reason),
    },
  };
}