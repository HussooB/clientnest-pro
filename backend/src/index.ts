import app from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();

    app.listen(env.PORT, () => {
      console.log(
        `🚀 ClientNest Pro API running on port ${env.PORT} [${env.NODE_ENV}]`
      );
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
