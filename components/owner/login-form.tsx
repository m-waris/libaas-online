"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { AppIcon } from "../ui/app-icon";
import { useToast } from "../ui/toast-provider";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginFormProps = {
  expectedStoreSlug: string | null;
  hasWrongStoreSession: boolean;
  isDisabledStore?: boolean;
};

export function LoginForm({
  expectedStoreSlug,
  hasWrongStoreSession,
  isDisabledStore = false,
}: LoginFormProps) {
  const router = useRouter();
  const { notify } = useToast();
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
      notify(signInError.message, "error");
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
      .select("slug, is_active")
      .eq("owner_id", user.id)
      .maybeSingle<{ slug: string; is_active: boolean }>();

    if (storeError || !store || store.slug !== expectedStoreSlug) {
      await rejectCurrentSession("Please log in at your own store's address");
      return;
    }

    if (!store.is_active) {
      await rejectCurrentSession(
        "Your store is disabled. Please contact Libaas Online support.",
      );
      return;
    }

    router.replace("/dashboard");
    notify("Signed in successfully.", "success");
    router.refresh();
  }

  async function handleSignOut() {
    setMessage(null);
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      const errorMessage =
        "Unable to clear the existing session. Please try again.";
      setMessage(errorMessage);
      notify(errorMessage, "error");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    notify("You are signed out.", "info");
    router.refresh();
  }

  async function rejectCurrentSession(rejectionMessage: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    const message = error
      ? "Unable to clear the existing session. Please try again."
      : rejectionMessage;
    setMessage(message);
    notify(message, "error");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {hasWrongStoreSession ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AppIcon icon={ShieldAlert} size={19} className="mt-0.5" />
          <div>
            This session belongs to a different store. Sign out before
            continuing here.
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSubmitting}
              className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold underline disabled:opacity-60"
            >
              <AppIcon icon={LogOut} size={16} />
              Sign out of the other store
            </button>
          </div>
        </div>
      ) : null}
      {isDisabledStore ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          Your store is disabled. Please contact Libaas Online support.
        </p>
      ) : null}
      <label className="block text-sm font-medium text-zinc-700">
        <span className="mb-2 inline-flex items-center gap-2">
          <AppIcon icon={Mail} size={16} />
          Email
        </span>
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
        <span className="mb-2 inline-flex items-center gap-2">
          <AppIcon icon={LockKeyhole} size={16} />
          Password
        </span>
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
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
        <AppIcon icon={ArrowRight} size={17} />
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
