import { LoaderCircle } from 'lucide-react';

type FieldProps = {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  error?: string;
};

export function Field({ label, name, error, ...input }: FieldProps) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm text-slate-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...input}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-2xl border bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400 ${
          error ? 'border-rose-400' : 'border-white/10'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </p>
  );
}

export function SubmitButton({ submitting, label, busyLabel }: { submitting: boolean; label: string; busyLabel: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {submitting ? busyLabel : label}
    </button>
  );
}
