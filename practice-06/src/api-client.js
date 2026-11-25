const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

function validateBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim().length === 0) {
    throw new TypeError("baseUrl должен быть непустой строкой.");
  }

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new TypeError("baseUrl должен быть корректным абсолютным URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("baseUrl должен использовать протокол http или https.");
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    throw new TypeError("baseUrl не должен содержать query-параметры или hash.");
  }

  return baseUrl.replace(/\/+$/, "");
}

export function buildUrl(baseUrl, path, query = {}) {
  const normalizedBase = validateBaseUrl(baseUrl);

  if (typeof path !== "string" || path.trim().length === 0) {
    throw new TypeError("path должен быть непустой строкой.");
  }
  if (query === null || typeof query !== "object" || Array.isArray(query)) {
    throw new TypeError("query должен быть обычным объектом.");
  }

  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  const normalizedBase = validateBaseUrl(baseUrl);

  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }

  async function requestJson(path, options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("options должен быть объектом.");
    }

    const {
      method = "GET",
      query = {},
      body,
      signal,
      timeoutMs: requestTimeoutMs = timeoutMs,
    } = options;

    if (typeof method !== "string") {
      throw new TypeError("HTTP-метод должен быть строкой.");
    }
    const normalizedMethod = method.toUpperCase();
    if (!ALLOWED_METHODS.has(normalizedMethod)) {
      throw new TypeError(`Неподдерживаемый HTTP-метод: ${method}.`);
    }
    if (normalizedMethod === "GET" && body !== undefined) {
      throw new TypeError("GET-запрос не должен содержать тело body.");
    }
    if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
      throw new TypeError("timeoutMs должен быть положительным целым числом.");
    }
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("signal должен быть экземпляром AbortSignal.");
    }

    const url = buildUrl(normalizedBase, path, query);
    const headers = { Accept: "application/json" };
    const fetchOptions = { method: normalizedMethod, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
    fetchOptions.signal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    let response;
    try {
      response = await fetchFn(url, fetchOptions);
    } catch (error) {
      if (signal?.aborted) {
        throw new ApiError("Запрос отменён внешним сигналом.", {
          kind: "aborted",
          url,
          cause: error,
        });
      }
      if (timeoutSignal.aborted || error?.name === "TimeoutError") {
        throw new ApiError(`Превышено время ожидания ответа (${requestTimeoutMs} мс).`, {
          kind: "timeout",
          url,
          cause: error,
        });
      }
      throw new ApiError("Сетевая ошибка при выполнении запроса.", {
        kind: "network",
        url,
        cause: error,
      });
    }

    if (!(response instanceof Response)) {
      throw new ApiError("Функция fetch вернула некорректный объект ответа.", {
        kind: "invalid-response",
        url,
      });
    }

    if (!response.ok) {
      let code = null;
      let details = null;
      let message = `HTTP ошибка ${response.status}.`;
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.toLowerCase().includes("application/json")) {
        try {
          const payload = await response.json();
          if (payload && typeof payload === "object" && payload.error && typeof payload.error === "object") {
            if (typeof payload.error.code === "string") code = payload.error.code;
            if (typeof payload.error.message === "string" && payload.error.message.trim().length > 0) {
              message = payload.error.message;
            }
            if (payload.error.details !== undefined) details = payload.error.details;
          }
        } catch {
          // Сохраняем HTTP-статус даже при невалидном теле ошибки
        }
      }

      throw new ApiError(message, {
        kind: "http",
        status: response.status,
        code,
        details,
        url,
      });
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new ApiError(`Ожидался JSON, но получен Content-Type: "${contentType}".`, {
        kind: "invalid-response",
        url,
      });
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ApiError("Не удалось разобрать JSON тела ответа.", {
        kind: "invalid-response",
        url,
        cause: error,
      });
    }
  }

  return { requestJson };
}