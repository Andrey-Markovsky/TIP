import { useCallback, useEffect, useRef, useState } from 'react';

export function useTaskData({ api, filters }) {
  const [snapshot, setSnapshot] = useState({ tasks: [], categories: [], meta: { total: 0 } });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [pending, setPending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const mountedRef = useRef(true);
  const pendingRef = useRef(false);
  const mutationControllerRef = useRef(null);

  const q = filters?.q ?? '';
  const completed = filters?.completed ?? '';
  const priority = filters?.priority ?? '';
  const categoryId = filters?.categoryId ?? '';

  // Отслеживание монтирования и отмена активной мутации только при unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      mutationControllerRef.current?.abort();
      mutationControllerRef.current = null;
    };
  }, []);

  // Загрузка данных при изменении фильтров или ручном/пост-мутационном refresh.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setStatus('loading');
    setError(null);

    const activeFilters = { q, completed, priority, categoryId };

    api.loadInitialData(activeFilters, { signal: controller.signal })
      .then(nextSnapshot => {
        if (!active || controller.signal.aborted) return;
        setSnapshot(nextSnapshot);
        setLastUpdatedAt(new Date());
        setError(null);
        setStatus('ready');
      })
      .catch(loadError => {
        if (!active || controller.signal.aborted) return;
        setError(loadError);
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [api, q, completed, priority, categoryId, reloadToken]);

  const refresh = useCallback(() => {
    setReloadToken(token => token + 1);
  }, []);

  const runMutation = useCallback(async action => {
    if (pendingRef.current || !mountedRef.current) {
      return false;
    }

    pendingRef.current = true;
    const controller = new AbortController();
    mutationControllerRef.current = controller;
    setPending(true);
    setMutationError(null);

    try {
      await action(controller.signal);
      if (!mountedRef.current || controller.signal.aborted) {
        return false;
      }
      setReloadToken(token => token + 1);
      return true;
    } catch (writeError) {
      if (!mountedRef.current || controller.signal.aborted) {
        return false;
      }
      setMutationError(writeError);
      return false;
    } finally {
      if (mutationControllerRef.current === controller) {
        mutationControllerRef.current = null;
      }
      pendingRef.current = false;
      if (mountedRef.current) {
        setPending(false);
      }
    }
  }, []);

  const saveTask = useCallback(
    (id, value) => runMutation(signal => (
      id === null || id === undefined
        ? api.createTask(value, { signal })
        : api.updateTask(id, value, { signal })
    )),
    [api, runMutation],
  );

  const toggleTask = useCallback(
    task => runMutation(signal => api.setTaskCompleted(task.id, !task.completed, { signal })),
    [api, runMutation],
  );

  const deleteTask = useCallback(
    id => runMutation(signal => api.deleteTask(id, { signal })),
    [api, runMutation],
  );

  const resetData = useCallback(
    () => runMutation(signal => api.resetDemoData({ signal })),
    [api, runMutation],
  );

  return {
    lastUpdatedAt,
    snapshot,
    status,
    error,
    mutationError,
    pending,
    refresh,
    saveTask,
    toggleTask,
    deleteTask,
    resetData,
  };
}