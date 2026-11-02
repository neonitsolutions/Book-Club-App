'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, LoaderCircle, Star, X } from 'lucide-react';
import { FormError, SubmitButton } from '@/components/auth/form-parts';
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  NewBook,
  apiErrorMessage,
  createBook,
  uploadImage,
  useCategories,
} from '@/lib/catalog';
import { nairaToKobo } from '@/lib/money';

const MAX_IMAGES = 12;

interface Picture {
  id: string;
  file: File;
  preview: string;
  caption: string;
  key?: string;
  status: 'uploading' | 'done' | 'failed';
  error?: string;
}

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-amber-400';

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm text-slate-300">
      {children}
      {hint && <span className="ml-2 text-slate-500">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <h2 className="mb-5 text-lg font-semibold text-white">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

const whole = (value: FormDataEntryValue | null) => {
  const text = String(value ?? '').trim();
  return text ? Number(text) : undefined;
};
const text = (value: FormDataEntryValue | null) => String(value ?? '').trim() || undefined;

export function AddBookForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();

  const [rentalEnabled, setRentalEnabled] = useState(true);
  const [saleEnabled, setSaleEnabled] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Free the in-memory previews when leaving the page
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const update = (id: string, change: Partial<Picture>) =>
    setPictures((all) => all.map((p) => (p.id === id ? { ...p, ...change } : p)));

  function startUpload(picture: Picture) {
    uploadImage(picture.file)
      .then((key) => update(picture.id, { key, status: 'done', error: undefined }))
      .catch((error) => update(picture.id, { status: 'failed', error: apiErrorMessage(error) }));
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES - pictures.length;
    const added: Picture[] = [];
    const problems: string[] = [];

    for (const file of Array.from(files)) {
      if (!IMAGE_TYPES.includes(file.type)) {
        problems.push(`${file.name}: use JPEG, PNG or WebP`);
      } else if (file.size > MAX_IMAGE_BYTES) {
        problems.push(`${file.name}: larger than 10 MB`);
      } else if (added.length >= room) {
        problems.push(`At most ${MAX_IMAGES} pictures per book`);
        break;
      } else {
        const preview = URL.createObjectURL(file);
        previews.current.push(preview);
        added.push({ id: crypto.randomUUID(), file, preview, caption: '', status: 'uploading' });
      }
    }

    setFormError(problems.join('. '));
    setPictures((all) => [...all, ...added]);
    added.forEach(startUpload);
    if (fileInput.current) fileInput.current.value = '';
  }

  function makeCover(id: string) {
    setPictures((all) => [...all.filter((p) => p.id === id), ...all.filter((p) => p.id !== id)]);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);

    if (pictures.some((p) => p.status === 'uploading')) {
      setFormError('Wait for the pictures to finish uploading.');
      return;
    }
    if (pictures.some((p) => p.status === 'failed')) {
      setFormError('Remove or retry the pictures that failed to upload.');
      return;
    }
    if (!rentalEnabled && !saleEnabled) {
      setFormError('Make the book available to rent, to buy, or both.');
      return;
    }

    const authors = String(form.get('authors') ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    const salePriceKobo = saleEnabled ? nairaToKobo(String(form.get('salePrice') ?? '')) : undefined;
    if (saleEnabled && salePriceKobo === undefined) {
      setFormError('Enter a sale price.');
      return;
    }

    const input: NewBook = {
      title: String(form.get('title') ?? '').trim(),
      subtitle: text(form.get('subtitle')),
      authors,
      isbn: text(form.get('isbn')),
      description: text(form.get('description')),
      categoryIds,
      publisher: text(form.get('publisher')),
      publicationYear: whole(form.get('publicationYear')),
      language: text(form.get('language')),
      pageCount: whole(form.get('pageCount')),
      rentalEnabled,
      saleEnabled,
      salePriceKobo,
      rentalPriceKobo: rentalEnabled ? (nairaToKobo(String(form.get('rentalPrice') ?? '')) ?? 0) : undefined,
      images: pictures.map((p) => ({ key: p.key!, caption: p.caption.trim() || undefined })),
      rentalCopies: rentalEnabled ? (whole(form.get('rentalCopies')) ?? 0) : 0,
      saleCopies: saleEnabled ? (whole(form.get('saleCopies')) ?? 0) : 0,
      location: text(form.get('location')),
    };

    setSubmitting(true);
    try {
      const book = await createBook(input);
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      router.push(`/books/${book.slug}`);
    } catch (error) {
      setFormError(apiErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Section title="About the book">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <input id="title" name="title" required maxLength={300} className={inputClass} placeholder="Things Fall Apart" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="subtitle" hint="optional">Subtitle</Label>
          <input id="subtitle" name="subtitle" maxLength={300} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="authors" hint="separate several with commas">Author(s)</Label>
          <input id="authors" name="authors" required className={inputClass} placeholder="Chinua Achebe" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description" hint="optional">Description</Label>
          <textarea id="description" name="description" rows={5} maxLength={10000} className={inputClass} />
        </div>
        {categories && categories.length > 0 && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm text-slate-300">
              Categories <span className="ml-2 text-slate-500">up to 5</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const checked = categoryIds.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${
                      checked ? 'border-amber-400 bg-amber-500/15 text-amber-200' : 'border-white/10 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={!checked && categoryIds.length >= 5}
                      onChange={() =>
                        setCategoryIds(checked ? categoryIds.filter((id) => id !== category.id) : [...categoryIds, category.id])
                      }
                    />
                    {category.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <div>
          <Label htmlFor="isbn" hint="optional">ISBN</Label>
          <input id="isbn" name="isbn" className={inputClass} placeholder="978-0-385-47454-2" />
        </div>
        <div>
          <Label htmlFor="publisher" hint="optional">Publisher</Label>
          <input id="publisher" name="publisher" maxLength={200} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="publicationYear" hint="optional">Year published</Label>
          <input id="publicationYear" name="publicationYear" type="number" min={1000} max={new Date().getFullYear() + 1} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="pageCount" hint="optional">Pages</Label>
          <input id="pageCount" name="pageCount" type="number" min={1} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="language">Language</Label>
          <input id="language" name="language" defaultValue="English" maxLength={50} className={inputClass} />
        </div>
      </Section>

      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">Pictures</h2>
        <p className="mt-1 text-sm text-slate-400">
          JPEG, PNG or WebP, up to 10 MB each, at most {MAX_IMAGES}. The first picture is the cover.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pictures.map((picture, i) => (
            <div key={picture.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
              <div className="relative">
                <img src={picture.preview} alt="" className="h-40 w-full object-cover" />
                {picture.status === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                    <LoaderCircle className="h-6 w-6 animate-spin text-white" aria-label="Uploading" />
                  </div>
                )}
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-slate-950">Cover</span>
                )}
                <button
                  type="button"
                  onClick={() => setPictures((all) => all.filter((p) => p.id !== picture.id))}
                  aria-label="Remove picture"
                  className="absolute right-2 top-2 rounded-full bg-slate-950/80 p-1 text-white hover:bg-rose-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 p-2">
                {picture.status === 'failed' && (
                  <p className="text-xs text-rose-300">
                    {picture.error}{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        update(picture.id, { status: 'uploading', error: undefined });
                        startUpload(picture);
                      }}
                    >
                      Retry
                    </button>
                  </p>
                )}
                <input
                  aria-label="Caption"
                  value={picture.caption}
                  maxLength={200}
                  onChange={(event) => update(picture.id, { caption: event.target.value })}
                  placeholder="Caption (optional)"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                />
                {i > 0 && (
                  <button type="button" onClick={() => makeCover(picture.id)} className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200">
                    <Star className="h-3 w-3" /> Make cover
                  </button>
                )}
              </div>
            </div>
          ))}

          {pictures.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 text-sm text-slate-400 hover:border-amber-400 hover:text-white"
            >
              <ImagePlus className="h-6 w-6" />
              Add pictures
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          multiple
          hidden
          onChange={(event) => addFiles(event.target.files)}
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Inventory</h2>
        <p className="mb-5 text-sm text-slate-400">
          Each copy gets its own inventory code and QR code. Rental and sale copies are kept separate.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
            <label className="flex items-center gap-3 font-medium text-white">
              <input type="checkbox" checked={rentalEnabled} onChange={(e) => setRentalEnabled(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              Available to rent
            </label>
            {rentalEnabled && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="rentalCopies">Rental copies</Label>
                  <input id="rentalCopies" name="rentalCopies" type="number" min={0} max={500} defaultValue={1} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="rentalPrice" hint="₦, on top of membership; usually 0">Rental fee</Label>
                  <input id="rentalPrice" name="rentalPrice" inputMode="decimal" defaultValue="0" className={inputClass} />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
            <label className="flex items-center gap-3 font-medium text-white">
              <input type="checkbox" checked={saleEnabled} onChange={(e) => setSaleEnabled(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              For sale
            </label>
            {saleEnabled && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="saleCopies">Copies for sale</Label>
                  <input id="saleCopies" name="saleCopies" type="number" min={0} max={500} defaultValue={1} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="salePrice" hint="₦">Sale price</Label>
                  <input id="salePrice" name="salePrice" inputMode="decimal" placeholder="15,000" className={inputClass} />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="location">Shelf location</Label>
            <input id="location" name="location" defaultValue="MAIN_LIBRARY" maxLength={40} className={inputClass} />
          </div>
        </div>
      </section>

      <FormError message={formError} />

      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
        <Link href="/admin/books" className="text-sm text-slate-300 hover:text-white">
          Cancel
        </Link>
        <div className="w-full sm:w-56">
          <SubmitButton submitting={submitting} label="Add book" busyLabel="Saving…" />
        </div>
      </div>
    </form>
  );
}
