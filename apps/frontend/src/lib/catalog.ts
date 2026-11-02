'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface BookImage {
  url: string;
  caption?: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  authors: string[];
  isbn?: string;
  description?: string;
  categories: Category[];
  publisher?: string;
  publicationYear?: number;
  language: string;
  pageCount?: number;
  coverUrl?: string;
  images: BookImage[];
  rentalEnabled: boolean;
  saleEnabled: boolean;
  rentalPriceKobo: number;
  salePriceKobo?: number;
  availability: { rentalTotal: number; rentalAvailable: number; saleAvailable: number };
  createdAt: string;
}

export interface BookPage {
  items: Book[];
  total: number;
  page: number;
  limit: number;
}

export type Purpose = 'rent' | 'sale';

export function useBooks(params: { purpose?: Purpose; q?: string; page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.purpose) search.set('purpose', params.purpose);
  if (params.q?.trim()) search.set('q', params.q.trim());
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();

  return useQuery({
    queryKey: ['books', query],
    queryFn: () => api<BookPage>(`/books${query ? `?${query}` : ''}`),
    // Keep showing the last results while a new search loads
    placeholderData: keepPreviousData,
  });
}

export function useBook(idOrSlug: string) {
  return useQuery({
    queryKey: ['book', idOrSlug],
    queryFn: async (): Promise<Book | null> => {
      try {
        return await api<Book>(`/books/${encodeURIComponent(idOrSlug)}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
    staleTime: 10 * 60 * 1000,
  });
}

// ---- Admin --------------------------------------------------------------

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface UploadTicket {
  key: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

/** Uploads one picture straight to storage; returns the key to send with the book. */
export async function uploadImage(file: File): Promise<string> {
  const ticket = await api<UploadTicket>('/media/image-uploads', {
    method: 'POST',
    body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
  });
  const res = await fetch(ticket.url, { method: ticket.method, headers: ticket.headers, body: file });
  if (!res.ok) throw new Error(`Uploading ${file.name} failed`);
  return ticket.key;
}

export interface NewBook {
  title: string;
  subtitle?: string;
  authors: string[];
  isbn?: string;
  description?: string;
  categoryIds: string[];
  publisher?: string;
  publicationYear?: number;
  language?: string;
  pageCount?: number;
  rentalEnabled: boolean;
  saleEnabled: boolean;
  salePriceKobo?: number;
  rentalPriceKobo?: number;
  images: { key: string; caption?: string }[];
  rentalCopies: number;
  saleCopies: number;
  location?: string;
}

export function createBook(input: NewBook): Promise<Book> {
  return api<Book>('/books', { method: 'POST', body: JSON.stringify(input) });
}

/** The API's validation message, or a generic one. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message = (error.body as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
    if (error.status === 403) return 'Only administrators can do this.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
