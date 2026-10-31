'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api, ApiError } from './api';

export type Role = 'ADMIN' | 'STAFF' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

// Same rules as the backend DTOs, so most mistakes are caught before a request
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
  email: z.email('Enter a valid email address').max(254),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128, 'Use at most 128 characters'),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

const SESSION_KEY = ['session'] as const;

/** The signed-in user, or null for guests. */
export function useSession() {
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: async (): Promise<User | null> => {
      try {
        return (await api<{ user: User }>('/auth/me')).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return { user: query.data ?? null, isLoading: query.isPending };
}

export function useAuthActions() {
  const queryClient = useQueryClient();
  const setUser = (user: User | null) => queryClient.setQueryData(SESSION_KEY, user);

  return {
    async register(input: RegisterInput) {
      const { user } = await api<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setUser(user);
    },
    async login(input: LoginInput) {
      const { user } = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setUser(user);
    },
    async logout() {
      await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
      setUser(null);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
    },
  };
}

/** A message for the person filling in the form. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Invalid email or password.';
    if (error.status === 409) return 'An account with this email already exists. Try signing in.';
    if (error.status === 429) return 'Too many attempts. Wait a minute and try again.';
    if (error.status === 400) {
      const message = (error.body as { message?: string | string[] } | null)?.message;
      if (Array.isArray(message)) return message.join('. ');
      if (typeof message === 'string') return message;
    }
  }
  return 'Something went wrong. Please try again.';
}
