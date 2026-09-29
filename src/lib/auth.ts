import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

const appUrl =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export function createApplicationAuth(allowSignUp = false) {
return betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: appUrl,
  trustedOrigins: [appUrl],
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, disableSignUp: !allowSignUp },
  session: { expiresIn: 60 * 60 * 24 * 30 },
  onAPIError: {
    onError() { console.error("[auth] Falha na requisição de autenticação."); },
  },
  logger: {
    // Adapter errors can contain session tokens in SQL parameters. Do not forward
    // raw library messages or error objects to application logs.
    log(level) {
      if (level === "error") console.error("[auth] Falha no serviço de autenticação.");
      else if (level === "warn") console.warn("[auth] Aviso de configuração ou operação.");
    },
  },
});

}

export const auth = createApplicationAuth();
