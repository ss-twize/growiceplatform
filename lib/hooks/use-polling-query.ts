"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function usePollingQuery<T>(
  loader: () => Promise<T>,
  options: { intervalMs?: number; enabled?: boolean } = {}
) {
  const { intervalMs = 15000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const execute = useCallback(async () => {
    try {
      setError(null);
      const payload = await loader();
      if (aliveRef.current) {
        setData(payload);
      }
    } catch (e) {
      if (aliveRef.current) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      }
    } finally {
      if (aliveRef.current) {
        setLoading(false);
      }
    }
  }, [loader]);

  useEffect(() => {
    aliveRef.current = true;
    if (!enabled) {
      setLoading(false);
      return;
    }

    void execute();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void execute();
      }
    }, intervalMs);

    return () => {
      aliveRef.current = false;
      clearInterval(timer);
    };
  }, [enabled, execute, intervalMs]);

  return {
    data,
    loading,
    error,
    refetch: execute
  };
}
