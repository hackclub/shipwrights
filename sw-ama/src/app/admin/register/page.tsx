import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (await isValidSessionToken(token)) {
    redirect("/admin/dashboard");
  }

  const adminCount = await prisma.admin.count();
  const isBootstrap = adminCount === 0;

  return (
    <main className="blueprint-grid flex min-h-screen items-center justify-center px-6 py-16">
      <div className="paper-card w-full max-w-sm rounded-sm p-8">
        <p className="mb-1 font-mono text-xs tracking-[0.2em] text-ink/40">
          Shipwrights
        </p>
        <h1 className="mb-2 font-display text-2xl font-bold text-ink">
          {isBootstrap ? "Set up the crew" : "Join the crew"}
        </h1>
        <p className="mb-6 font-display text-sm text-ink/60">
          {isBootstrap
            ? "Nobody's set up an account yet. Create the first one and you're the admin — every question and answer runs through here."
            : "Create your own account to review questions and post answers alongside the rest of the team."}
        </p>
        <RegisterForm isBootstrap={isBootstrap} />
        <p className="mt-6 font-mono text-xs text-ink/40">
          Already have an account?{" "}
          <a href="/admin" className="underline decoration-ink/20 underline-offset-2 hover:text-ink/60">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
