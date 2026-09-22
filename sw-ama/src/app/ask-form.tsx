"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitQuestion, type SubmitState } from "./actions";

const initialState: SubmitState = { ok: false };

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-signal px-5 py-3 font-display text-sm font-bold tracking-wide text-paper transition hover:bg-signal/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send it"}
    </button>
  );
}

export function AskForm() {
  const [state, formAction] = useActionState(submitQuestion, initialState);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.ok) {
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="body"
          className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.14em] text-ink/50"
        >
          Send a question
        </label>
        <textarea
          id="body"
          name="body"
          required
          minLength={6}
          maxLength={1500}
          rows={5}
          placeholder="What do you want to know?"
          className="w-full resize-none rounded-sm border border-ink/15 bg-white/60 px-4 py-3 font-display text-base text-ink placeholder:text-ink/35 focus:border-blueprint focus:outline-none focus:ring-2 focus:ring-blueprint/20"
        />
        {/* Honeypot: hidden from real people, only bots tend to fill this in. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          className="absolute h-0 w-0 opacity-0"
          aria-hidden="true"
        />
      </div>

      <SendButton />

      <div aria-live="polite" className="min-h-[1.5rem] font-mono text-xs text-ink/60">
        {state.error && <p className="text-signal">{state.error}</p>}
        {state.ok && (
          <p>Sent — thanks. The crew answers in the order things come in.</p>
        )}
      </div>

      <p className="font-mono text-[11px] leading-relaxed text-ink/40">
        No name, no login, no record of who sent this. Once a Shipwright answers,
        it's posted in the log below for everyone.
      </p>
    </form>
  );
}
