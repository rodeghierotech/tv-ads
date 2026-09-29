/**
 * Cria o usuário administrador inicial.
 * Uso: npx tsx scripts/create-admin.ts admin@empresa.com "troque-por-uma-senha-forte"
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { createApplicationAuth } = await import("../src/lib/auth");
  const auth = createApplicationAuth(true);
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error("Uso: npx tsx scripts/create-admin.ts <email> <senha>");
    process.exit(1);
  }
  await auth.api.signUpEmail({ body: { email, password, name: "Administrador" } });
  console.log(`Admin criado: ${email}`);
}

main().then(() => process.exit(0)).catch(() => {
  console.error("Falha ao criar administrador. Confira a configuração do banco e os dados informados.");
  process.exit(1);
});
