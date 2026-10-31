'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { authErrorMessage, loginSchema, useAuthActions } from '@/lib/auth';
import { Field, FormError, SubmitButton } from './form-parts';

type Errors = Partial<Record<'email' | 'password', string>>;

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuthActions();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      setErrors({ email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] });
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      await login(parsed.data);
      router.push('/dashboard');
    } catch (error) {
      setFormError(authErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password}
      />
      <FormError message={formError} />
      <SubmitButton submitting={submitting} label="Continue" busyLabel="Signing in…" />
    </form>
  );
}
