import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env<Env>("DATABASE_URL"),
  },
});
