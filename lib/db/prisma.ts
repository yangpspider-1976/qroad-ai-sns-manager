import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql/web";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  if (tursoUrl) {
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!authToken && tursoUrl.startsWith("libsql://")) {
      throw new Error("TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL uses libsql://.");
    }

    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken
    });

    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

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
