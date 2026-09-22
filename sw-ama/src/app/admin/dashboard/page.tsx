import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/current-admin";
import {
  adminLogout,
  answerQuestion,
  deleteQuestion,
  setQuestionStatus,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin");
  }

  const [pending, answered, hidden] = await Promise.all([
    prisma.question.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.question.findMany({
      where: { status: "ANSWERED" },
      include: { answer: { include: { answeredBy: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.question.findMany({
      where: { status: "HIDDEN" },
      include: { answer: { include: { answeredBy: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-12 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-xs tracking-[0.2em] text-ink/40">
            Shipwrights
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">
            Control room
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="font-mono text-xs text-ink/50">
            Signed in as {admin.name}
          </p>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-ink/50 underline decoration-ink/20 underline-offset-2 hover:text-ink/70"
          >
            View the public log
          </a>
          <form action={adminLogout}>
            <button
              type="submit"
              className="font-mono text-xs text-ink/50 underline decoration-ink/20 underline-offset-2 hover:text-ink/70"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <section className="mb-14">
        <h2 className="mb-4 font-display text-xl font-bold text-ink">
          Waiting for an answer
          <span className="ml-2 font-mono text-sm font-normal text-ink/40">
            {pending.length}
          </span>
        </h2>

        {pending.length === 0 ? (
          <p className="font-display text-sm text-ink/50">
            Nothing in the queue right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {pending.map((question) => (
              <li key={question.id} className="paper-card rounded-sm p-5">
                <div className="mb-2 flex items-center justify-between gap-4 font-mono text-[11px] text-ink/40">
                  <span>No. {String(question.seq).padStart(3, "0")}</span>
                  <span>{formatDateTime(question.createdAt)}</span>
                </div>
                <p className="mb-4 font-display text-base leading-snug text-ink">
                  {question.body}
                </p>

                <details className="group">
                  <summary className="inline-block cursor-pointer select-none font-display text-sm font-bold text-blueprint marker:content-none">
                    Answer this
                  </summary>
                  <form
                    action={answerQuestion}
                    className="mt-4 flex flex-col gap-3 border-t border-ink/10 pt-4"
                  >
                    <input type="hidden" name="questionId" value={question.id} />
                    <textarea
                      name="answerBody"
                      required
                      rows={4}
                      placeholder="Write the answer that gets posted publicly…"
                      className="w-full resize-none rounded-sm border border-ink/15 bg-white/60 px-3 py-2 font-display text-sm text-ink placeholder:text-ink/35 focus:border-blueprint focus:outline-none focus:ring-2 focus:ring-blueprint/20"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="rounded-sm bg-signal px-4 py-2 font-display text-sm font-bold text-paper hover:bg-signal/90"
                      >
                        Post as {admin.name}
                      </button>
                    </div>
                  </form>
                </details>

                <form action={setQuestionStatus} className="mt-3">
                  <input type="hidden" name="questionId" value={question.id} />
                  <input type="hidden" name="status" value="HIDDEN" />
                  <button
                    type="submit"
                    className="font-mono text-xs text-ink/40 underline decoration-ink/20 underline-offset-2 hover:text-ink/60"
                  >
                    Hide (spam or inappropriate)
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-14">
        <h2 className="mb-4 font-display text-xl font-bold text-ink">
          Answered
          <span className="ml-2 font-mono text-sm font-normal text-ink/40">
            {answered.length}
          </span>
        </h2>

        {answered.length === 0 ? (
          <p className="font-display text-sm text-ink/50">
            Nothing answered yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {answered.map((question) => (
              <li key={question.id} className="paper-card rounded-sm p-5">
                <div className="mb-2 flex items-center justify-between gap-4 font-mono text-[11px] text-ink/40">
                  <span>No. {String(question.seq).padStart(3, "0")}</span>
                  <span>{formatDateTime(question.createdAt)}</span>
                </div>
                <p className="mb-3 font-display text-base font-bold leading-snug text-ink">
                  {question.body}
                </p>
                <div className="mb-3 border-l-2 border-brass/60 pl-3">
                  <p className="whitespace-pre-wrap font-display text-sm leading-relaxed text-ink/85">
                    {question.answer?.body}
                  </p>
                  {question.answer?.answeredBy && (
                    <p className="mt-2 font-mono text-xs text-ink/45">
                      — {question.answer.answeredBy.name}
                    </p>
                  )}
                </div>

                <details className="group mb-3">
                  <summary className="inline-block cursor-pointer select-none font-display text-sm font-bold text-blueprint marker:content-none">
                    Edit answer
                  </summary>
                  <form
                    action={answerQuestion}
                    className="mt-4 flex flex-col gap-3 border-t border-ink/10 pt-4"
                  >
                    <input type="hidden" name="questionId" value={question.id} />
                    <textarea
                      name="answerBody"
                      required
                      rows={4}
                      defaultValue={question.answer?.body}
                      className="w-full resize-none rounded-sm border border-ink/15 bg-white/60 px-3 py-2 font-display text-sm text-ink focus:border-blueprint focus:outline-none focus:ring-2 focus:ring-blueprint/20"
                    />
                    <p className="font-mono text-[11px] text-ink/40">
                      Saving will re-sign this answer as {admin.name}.
                    </p>
                    <div>
                      <button
                        type="submit"
                        className="rounded-sm bg-signal px-4 py-2 font-display text-sm font-bold text-paper hover:bg-signal/90"
                      >
                        Save answer
                      </button>
                    </div>
                  </form>
                </details>

                <form action={setQuestionStatus}>
                  <input type="hidden" name="questionId" value={question.id} />
                  <input type="hidden" name="status" value="HIDDEN" />
                  <button
                    type="submit"
                    className="font-mono text-xs text-ink/40 underline decoration-ink/20 underline-offset-2 hover:text-ink/60"
                  >
                    Unpublish
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hidden.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-ink">
            Hidden
            <span className="ml-2 font-mono text-sm font-normal text-ink/40">
              {hidden.length}
            </span>
          </h2>
          <ul className="flex flex-col gap-3">
            {hidden.map((question) => (
              <li
                key={question.id}
                className="rounded-sm border border-ink/10 bg-white/40 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-4 font-mono text-[11px] text-ink/35">
                  <span>No. {String(question.seq).padStart(3, "0")}</span>
                  <span>{formatDateTime(question.createdAt)}</span>
                </div>
                <p className="mb-3 font-display text-sm text-ink/60">
                  {question.body}
                </p>
                <div className="flex items-center gap-4">
                  <form action={setQuestionStatus}>
                    <input type="hidden" name="questionId" value={question.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={question.answer ? "ANSWERED" : "PENDING"}
                    />
                    <button
                      type="submit"
                      className="font-mono text-xs text-ink/40 underline decoration-ink/20 underline-offset-2 hover:text-ink/60"
                    >
                      Restore
                    </button>
                  </form>
                  <form action={deleteQuestion}>
                    <input type="hidden" name="questionId" value={question.id} />
                    <button
                      type="submit"
                      className="font-mono text-xs text-signal/70 underline decoration-signal/20 underline-offset-2 hover:text-signal"
                    >
                      Delete permanently
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
