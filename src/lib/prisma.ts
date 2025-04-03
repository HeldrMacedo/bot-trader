import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV === "development") {
  global.prisma = prisma;
}

// Conexão de teste no startup (apenas em produção)
if (process.env.NODE_ENV === "production") {
  prisma
    .$connect()
    .then(() => console.log("✅ Conectado ao banco de dados no Supabase"))
    .catch((err) => {
      console.error("❌ Falha na conexão com o Supabase:");
      console.error("URL do banco:", process.env.DATABASE_URL);
      console.error(err);
    });
}

export default prisma;
