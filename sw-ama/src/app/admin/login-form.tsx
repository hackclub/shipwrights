"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminLogin, type LoginState } from "../actions";

const initialState: LoginState = {};

function EnterButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-signal px-5 py-3 font-display text-sm font-bold tracking-wide text-paper transition hover:bg-signal/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Checking…" : "Log in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(adminLogin, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.14em] text-ink/50"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          className="w-full rounded-sm border border-ink/15 bg-white/60 px-4 py-3 font-mono text-base text-ink focus:border-blueprint focus:outline-none focus:ring-2 focus:ring-blueprint/20"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.14em] text-ink/50"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-sm border border-ink/15 bg-white/60 px-4 py-3 font-mono text-base text-ink focus:border-blueprint focus:outline-none focus:ring-2 focus:ring-blueprint/20"
        />
      </div>
      <EnterButton />
      {state.error && (
        <p role="alert" className="font-mono text-xs text-signal">
          {state.error}
        </p>
      )}
    </form>
  );
}
