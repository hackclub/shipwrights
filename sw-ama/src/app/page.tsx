import { prisma } from "@/lib/db";
import { AskForm } from "./ask-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const answered = await prisma.question.findMany({
    where: { status: "ANSWERED", answer: { isNot: null } },
    include: { answer: { include: { answeredBy: true } } },
    orderBy: { answer: { createdAt: "desc" } },
  });

  return (
    <main>
      <section className="blueprint-grid relative overflow-hidden px-6 py-20 text-blueprint-line sm:py-28">
        <div className="mx-auto flex max-w-5xl flex-col gap-14 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="mb-6 font-mono text-xs tracking-[0.2em] text-blueprint-line/70">
              Shipwrights &middot; ask anything
            </p>
            <h1 className="text-balance font-display text-5xl font-black leading-[1.05] text-white sm:text-6xl">
              Ask the Shipwrights anything.
            </h1>
            <p className="mt-6 max-w-md text-balance font-display text-lg leading-relaxed text-blueprint-line/90">
              No name attached, no login required. Every question reaches the
              team, and the answers get posted publicly in the log below.
            </p>
          </div>

          <div className="paper-card w-full max-w-md shrink-0 rounded-sm p-6 sm:-rotate-1 sm:p-8">
            <AskForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <div className="mb-10 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-ink">The log</h2>
          <p className="font-mono text-xs text-ink/45">
            {answered.length} {answered.length === 1 ? "entry" : "entries"} answered
          </p>
        </div>

        {answered.length === 0 ? (
          <div className="paper-card rounded-sm p-8 text-center">
            <p className="font-display text-lg font-bold text-ink">
              The log is empty.
            </p>
            <p className="mt-2 font-display text-sm text-ink/60">
              Nobody has asked anything yet — send the first question above,
              and check back once the crew's had a chance to answer.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-8">
            {answered.map((question) => (
              <li key={question.id} className="paper-card rounded-sm p-6 sm:p-8">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="stamp font-mono text-[10px] uppercase tracking-wider text-brass">
                    <span>No. {String(question.seq).padStart(3, "0")}</span>
                    <span>Answered</span>
                  </div>
                  <time
                    dateTime={question.answer!.createdAt.toISOString()}
                    className="pt-1 font-mono text-[11px] text-ink/40"
                  >
                    {formatDate(question.answer!.createdAt)}
                  </time>
                </div>

                <p className="font-display text-xl font-bold leading-snug text-ink">
                  {question.body}
                </p>

                <div className="mt-4 border-l-2 border-brass/60 pl-4">
                  <p className="whitespace-pre-wrap font-display text-base leading-relaxed text-ink/85">
                    {question.answer!.body}
                  </p>
                  {question.answer!.answeredBy && (
                    <p className="mt-3 font-mono text-xs text-ink/45">
                      — {question.answer!.answeredBy.name}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="border-t border-ink/10 px-6 py-10 text-center">
        <p className="font-mono text-xs text-ink/40">
          Shipwrights are a Hack Club team.{" "}
          <a href="/admin" className="underline decoration-ink/20 underline-offset-2 hover:text-ink/60">
            Team login
          </a>
        </p>
      </footer>
    </main>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
