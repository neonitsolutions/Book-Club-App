'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { authErrorMessage, registerSchema, useAuthActions } from '@/lib/auth';
import { Field, FormError, SubmitButton } from './form-parts';

type Errors = Partial<Record<'name' | 'email' | 'password', string>>;

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuthActions();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const parsed = registerSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      await register(parsed.data);
      router.push('/dashboard');
    } catch (error) {
      setFormError(authErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
      <Field label="Full name" name="name" type="text" autoComplete="name" placeholder="Jane Doe" error={errors.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={errors.password}
      />
      <FormError message={formError} />
      <SubmitButton submitting={submitting} label="Create account" busyLabel="Creating account…" />
    </form>
  );
}
