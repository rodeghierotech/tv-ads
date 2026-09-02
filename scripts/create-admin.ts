/**
 * Cria o usuário administrador inicial.
 * Uso: npx tsx scripts/create-admin.ts admin@empresa.com "troque-por-uma-senha-forte"
 */

process.loadEnvFile(".env");

async function main() {
  const { auth } = await import("../src/lib/auth");
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error("Uso: npx tsx scripts/create-admin.ts <email> <senha>");
    process.exit(1);
  }
  await auth.api.signUpEmail({ body: { email, password, name: "Administrador" } });
  console.log(`Admin criado: ${email}`);
}

main();
