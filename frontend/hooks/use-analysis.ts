"use client";

import useSWR from "swr";
import type { AnalysisResult } from "../lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAnalysis(fileId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<AnalysisResult>(
    fileId ? `/api/analyze?fileId=${fileId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    analysis: data ?? null,
    error: error ?? null,
    isLoading,
    refresh: mutate,
  };
}
