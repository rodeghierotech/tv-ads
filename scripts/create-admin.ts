/**
 * Cria o usuário administrador inicial.
 * Uso: npx tsx scripts/create-admin.ts admin@empresa.com senha123
 */
import { auth } from "../src/lib/auth";

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error("Uso: npx tsx scripts/create-admin.ts <email> <senha>");
    process.exit(1);
  }
  await auth.api.signUpEmail({ body: { email, password, name: "Administrador" } });
  console.log(`Admin criado: ${email}`);
}

main();
