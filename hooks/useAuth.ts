"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";

const KEY = ["auth", "me"] as const;

export function useMe() {
  return useQuery({
    queryKey: KEY,
    queryFn: authApi.me,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return failureCount < 1;
    },
    staleTime: 30_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      qc.setQueryData(KEY, data.user);
    },
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.signup(email, password),
    onSuccess: (data) => {
      qc.setQueryData(KEY, data.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      qc.setQueryData(KEY, null);
      qc.removeQueries();
    },
  });
}
