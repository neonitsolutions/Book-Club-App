'use client';

import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { z } from 'zod';
import { authErrorMessage, registerSchema, useAuthActions } from '@/lib/auth';
import { Field, FormError, SubmitButton } from './form-parts';
import { ResendLink } from './resend-link';

type Errors = Partial<Record<'name' | 'email' | 'password', string>>;

export function RegisterForm() {
  const { register } = useAuthActions();
  const [sentTo, setSentTo] = useState('');
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
      const { email } = await register(parsed.data);
      setSentTo(email);
    } catch (error) {
      setFormError(authErrorMessage(error));
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <div className="mt-6 space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5" role="status">
        <MailCheck className="h-7 w-7 text-emerald-300" />
        <h2 className="text-lg font-semibold text-white">Check your email</h2>
        <p className="text-sm text-slate-200">
          We sent an activation link to <strong className="text-white">{sentTo}</strong>. Open it to activate your
          account, then you can sign in. The link expires in 24 hours.
        </p>
        <ResendLink email={sentTo} />
      </div>
    );
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
