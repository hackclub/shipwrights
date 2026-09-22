"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminRegister, type RegisterState } from "../../actions";

const initialState: RegisterState = {};

function CreateAccountButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-signal px-5 py-3 font-display text-sm font-bold tracking-wide text-paper transition hover:bg-signal/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating…" : label}
    </button>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.14em] text-ink/50"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="w-full rounded-sm border border-ink/15 bg-white/60 px-4 py-3 font-mono text-base text-ink focus:border-blueprint focus:outline-none focus:ring-2 focus:ring-blueprint/20"
      />
    </div>
  );
}

export function RegisterForm({ isBootstrap }: { isBootstrap: boolean }) {
  const [state, formAction] = useActionState(adminRegister, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="name" name="name" label="Your name" autoComplete="name" />
      <Field id="email" name="email" label="Email" type="email" autoComplete="email" />
      <Field
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
      />
      {!isBootstrap && (
        <Field id="passcode" name="passcode" label="Team passcode" type="password" />
      )}
      <CreateAccountButton label={isBootstrap ? "Create the first account" : "Create account"} />
      {state.error && (
        <p role="alert" className="font-mono text-xs text-signal">
          {state.error}
        </p>
      )}
    </form>
  );
}
