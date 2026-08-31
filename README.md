# TV Ads Manager

MVP de plataforma de gerenciamento de anúncios para TVs/monitores.

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind · Drizzle ORM · PostgreSQL (Supabase) · Better Auth · Supabase Storage · dnd-kit

## Setup

```bash
npm install
cp .env.example .env
# preencher DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BETTER_AUTH_SECRET e BETTER_AUTH_URL
```

1. Criar projeto no Supabase.
2. Rodar `supabase/storage-setup.sql` no SQL Editor (cria o bucket `media`).
3. Gerar e aplicar as migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
4. Criar o usuário admin:
   ```bash
   npx tsx scripts/create-admin.ts admin@empresa.com senha123
   ```
5. Rodar o projeto:
   ```bash
   npm run dev
   ```

## Fluxo de uso

1. Login em `/login`.
2. Abrir `/player` em outro dispositivo/aba — mostra um código de pareamento.
3. Em `/tvs`, clicar em **Conectar dispositivo** e informar o código.
4. Em `/conteudos`, enviar imagens/vídeos.
5. Em `/playlists`, criar playlist, adicionar conteúdos e ordenar (drag & drop).
6. Em `/tvs`, vincular a playlist à TV.
7. O Player detecta a mudança de versão via polling (15s) e sincroniza. Heartbeat a cada 30s mantém o status online.

## Estrutura

```
src/
  db/           schema + client Drizzle
  lib/          auth, supabase storage, pareamento
  actions/      server actions (tv, media, playlist)
  app/
    (painel)/   layout + páginas do painel (protegidas por middleware)
    player/     página fullscreen do player
    api/        rotas do player (pair, config, heartbeat) + better-auth
```

## Notas de arquitetura

- **Sincronização**: polling simples baseado em número de versão da playlist (incrementado a cada alteração). Preparado para trocar por SSE/WebSocket depois — basta substituir o `setInterval` em `player/page.tsx` por uma subscription.
- **Status online/offline**: derivado do `lastHeartbeat` em tempo de leitura (`computeTvStatus`), sem job em background.
- **Pareamento**: código alfanumérico de 8 chars gerado com `crypto.randomBytes`, não sequencial.
- **Cache offline**: o Player mantém o `<img>`/`<video>` já carregado em memória; para cache mais robusto (Service Worker) fica como próximo passo, indicado no código.
- **Multi-empresa/permissões/agendamento**: schema deixa espaço para extensão (ex: `companyId` em `tv`), mas não implementado no MVP.

## Pendências para produção
- Configurar shadcn/ui via CLI (`npx shadcn@latest init`) para substituir os componentes básicos por primitives completos (Dialog, Select, Toast já cobertos de forma simplificada).
- Service Worker para cache offline real dos arquivos de mídia no Player.
- Testar migrations Better Auth (`npx @better-auth/cli generate`) contra o schema em `src/db/schema.ts`.
