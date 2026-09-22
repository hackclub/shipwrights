"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/current-admin";
import { hashPassword, verifyPassword } from "@/lib/password";

const MIN_LENGTH = 6;
const MAX_LENGTH = 1500;

export type SubmitState = { ok: boolean; error?: string };

export async function submitQuestion(
  _prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  // Honeypot: real visitors never fill this in, since it's hidden from view.
  const honeypot = formData.get("company")?.toString() ?? "";
  if (honeypot.trim().length > 0) {
    return { ok: true };
  }

  const body = formData.get("body")?.toString().trim() ?? "";
  if (body.length < MIN_LENGTH) {
    return { ok: false, error: "Give the crew a little more to work with." };
  }
  if (body.length > MAX_LENGTH) {
    return { ok: false, error: `Keep it under ${MAX_LENGTH} characters.` };
  }

  await prisma.question.create({ data: { body } });
  revalidatePath("/");
  return { ok: true };
}

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("Not authenticated");
  }
  return admin;
}

async function startSession(adminId: string) {
  (await cookies()).set(SESSION_COOKIE_NAME, await createSessionToken(adminId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export type LoginState = { error?: string };

export async function adminLogin(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return { error: "Wrong email or password." };
  }

  await startSession(admin.id);
  redirect("/admin/dashboard");
}

export type RegisterState = { error?: string };

export async function adminRegister(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const passcode = formData.get("passcode")?.toString() ?? "";

  if (!name || !email || !email.includes("@")) {
    return { error: "Enter your name and a real email address." };
  }
  if (password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }

  // The very first account bootstraps the team with no gate needed. After
  // that, joining requires the shared team passcode, so the dashboard isn't
  // wide open to anyone who finds the login page.
  const adminCount = await prisma.admin.count();
  if (adminCount > 0) {
    if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
      return { error: "Wrong team passcode." };
    }
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    return { error: "There's already an account with that email." };
  }

  const admin = await prisma.admin.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  await startSession(admin.id);
  redirect("/admin/dashboard");
}

export async function adminLogout() {
  await requireAdmin();
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect("/admin");
}

export async function answerQuestion(formData: FormData) {
  const admin = await requireAdmin();
  const questionId = formData.get("questionId")?.toString();
  const body = formData.get("answerBody")?.toString().trim();
  if (!questionId || !body) return;

  await prisma.answer.upsert({
    where: { questionId },
    create: { questionId, body, answeredById: admin.id },
    update: { body, answeredById: admin.id },
  });
  await prisma.question.update({
    where: { id: questionId },
    data: { status: "ANSWERED" },
  });

  revalidatePath("/");
  revalidatePath("/admin/dashboard");
}

export async function setQuestionStatus(formData: FormData) {
  await requireAdmin();
  const questionId = formData.get("questionId")?.toString();
  const status = formData.get("status")?.toString();
  if (!questionId || (status !== "PENDING" && status !== "HIDDEN" && status !== "ANSWERED")) {
    return;
  }

  await prisma.question.update({ where: { id: questionId }, data: { status } });
  revalidatePath("/");
  revalidatePath("/admin/dashboard");
}

export async function deleteQuestion(formData: FormData) {
  await requireAdmin();
  const questionId = formData.get("questionId")?.toString();
  if (!questionId) return;

  await prisma.question.delete({ where: { id: questionId } });
  revalidatePath("/");
  revalidatePath("/admin/dashboard");
}
