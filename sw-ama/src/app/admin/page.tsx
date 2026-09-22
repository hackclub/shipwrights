import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (await isValidSessionToken(token)) {
    redirect("/admin/dashboard");
  }

  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    redirect("/admin/register");
  }

  return (
    <main className="blueprint-grid flex min-h-screen items-center justify-center px-6 py-16">
      <div className="paper-card w-full max-w-sm rounded-sm p-8">
        <p className="mb-1 font-mono text-xs tracking-[0.2em] text-ink/40">
          Shipwrights
        </p>
        <h1 className="mb-6 font-display text-2xl font-bold text-ink">
          Control room
        </h1>
        <LoginForm />
        <p className="mt-6 font-mono text-xs text-ink/40">
          New to the crew?{" "}
          <a
            href="/admin/register"
            className="underline decoration-ink/20 underline-offset-2 hover:text-ink/60"
          >
            Create an account
          </a>
        </p>
      </div>
    </main>
  );
}
