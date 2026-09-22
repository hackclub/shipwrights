import { cookies } from "next/headers";
import { prisma } from "./db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./auth";

export async function getCurrentAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return prisma.admin.findUnique({ where: { id: session.adminId } });
}
