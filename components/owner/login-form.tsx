"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginFormProps = {
  expectedStoreSlug: string | null;
  hasWrongStoreSession: boolean;
};

export function LoginForm({
  expectedStoreSlug,
  hasWrongStoreSession,
}: LoginFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });

    if (signInError) {
      setMessage(signInError.message);
      setIsSubmitting(false);
      return;
    }

    if (!expectedStoreSlug) {
      await rejectCurrentSession("Please log in at your own store's address");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      await rejectCurrentSession("Please log in at your own store's address");
      return;
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("slug")
      .eq("owner_id", user.id)
      .maybeSingle<{ slug: string }>();

    if (storeError || !store || store.slug !== expectedStoreSlug) {
      await rejectCurrentSession("Please log in at your own store's address");
      return;
    }

    router.replace("/dashboard/products");
    router.refresh();
  }

  async function handleSignOut() {
    setMessage(null);
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("Unable to clear the existing session. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.refresh();
  }

  async function rejectCurrentSession(rejectionMessage: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    setMessage(
      error
        ? "Unable to clear the existing session. Please try again."
        : rejectionMessage,
    );
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {hasWrongStoreSession ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          This session belongs to a different store. Sign out before continuing
          here.
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSubmitting}
            className="mt-3 block font-semibold underline disabled:opacity-60"
          >
            Sign out of the other store
          </button>
        </div>
      ) : null}
      <label className="block text-sm font-medium text-zinc-700">
        <span className="mb-2 block">Email</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0"
          placeholder="owner@example.com"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        <span className="mb-2 block">Password</span>
        <input
          required
          type="password"
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0"
          placeholder="Enter password"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      {message ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
