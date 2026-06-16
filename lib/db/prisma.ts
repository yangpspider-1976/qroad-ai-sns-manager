import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function getDemoUser() {
  return prisma.user.upsert({
    where: { email: "marketing@qroad.ph" },
    update: {},
    create: {
      email: "marketing@qroad.ph",
      name: "QROAD Marketing Manager",
      role: "admin"
    }
  });
}
