"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type AppPeriod = "today" | "7d" | "30d" | "custom";

export function useAppFilters(defaultBranchId: string | null) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const branch = searchParams.get("branch") ?? defaultBranchId ?? "all";
  const period = (searchParams.get("period") as AppPeriod) ?? "30d";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const paramsString = searchParams.toString();

  const setFilter = useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams(paramsString);
      Object.entries(next).forEach(([key, value]) => {
        if (!value) params.delete(key);
        else params.set(key, value);
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [paramsString, pathname, router]
  );

  return useMemo(
    () => ({
      branch,
      period,
      from,
      to,
      setFilter
    }),
    [branch, period, from, to, setFilter]
  );
}
