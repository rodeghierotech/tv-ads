import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Cache only within the current server render; never share sessions across requests.
export const requireSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => {
    throw new Error("Não foi possível validar a sessão. Tente novamente.");
  });
  if (!session) redirect("/login");
  return session;
});
