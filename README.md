# TV Ads Manager

MVP de plataforma de gerenciamento de anúncios para TVs/monitores.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind · Drizzle ORM · PostgreSQL · Better Auth · dnd-kit

## Setup

```bash
npm install
cp .env.example .env
# preencher DATABASE_URL, BETTER_AUTH_SECRET e BETTER_AUTH_URL
```

1. Criar/configurar um banco PostgreSQL.
2. Gerar e aplicar as migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
3. Criar o usuário admin:
   ```bash
   npx tsx scripts/create-admin.ts admin@empresa.com "troque-por-uma-senha-forte"
   ```
4. Rodar o projeto:
   ```bash
   npm run dev
   ```

## Deploy na Vercel

Configure estas variaveis em **Project Settings > Environment Variables** antes do deploy:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
BETTER_AUTH_SECRET=generate-a-long-random-secret
BETTER_AUTH_URL=https://seu-projeto.vercel.app
```

Observacoes:

- `DATABASE_URL` deve ser a string de conexao do PostgreSQL de producao.
- `BETTER_AUTH_URL` deve usar a URL final da Vercel em producao.
- Depois do primeiro deploy, rode as migrations no banco de producao e crie o usuario admin.
- Se alguma chave real foi commitada por engano, gere novas chaves antes de publicar.

## Fluxo de uso

1. Login em `/login`.
2. Abrir `/player` em outro dispositivo/aba — mostra um código de pareamento.
3. Em `/tvs`, clicar em **Conectar dispositivo** e informar o código.
4. Em `/conteudos`, enviar imagens/vídeos.
5. Em `/playlists`, criar playlist, adicionar conteúdos e ordenar (drag & drop).
6. Em `/tvs`, vincular a playlist à TV.
7. Em `/programacao`, selecione a TV e crie blocos semanais de playlists. É possível editar, excluir e duplicar os blocos.
8. O Player consulta a configuração a cada 15s e no próximo limite de horário informado pelo servidor. Heartbeat a cada 30s mantém o status online.

## Programação semanal

- Todos os horários usam `America/Sao_Paulo`, independentemente do fuso do dispositivo.
- O início é inclusivo e o fim é exclusivo: 09:00–10:00 pode ser seguido de 10:00–11:00.
- Use `24:00` no fim para encerrar à meia-noite. Para atravessar a meia-noite, cadastre dois blocos em dias consecutivos.
- Conflitos na mesma TV são destacados e rejeitados pelo servidor. As gravações de agenda bloqueiam a linha da TV durante a transação para serializar cadastros concorrentes.
- Duplicar abre uma cópia para edição; ajuste os dias ou horários antes de salvar.
- Fora da agenda, a TV usa sua playlist padrão, configurada em `/tvs`. Sem playlist padrão, o player exibe a tela de espera. Uma playlist agendada vazia também exibe a tela de espera.
- Excluir uma TV ou playlist remove seus agendamentos associados.
- O dashboard e a agenda mostram a programação ativa e a próxima, com atualização a cada 15s. Isso representa a programação prevista, não uma confirmação de reprodução de uma TV offline.
- A troca automática depende de conexão com o servidor. Durante uma falha, o player mantém a playlist atual e tenta sincronizar novamente.

### Aplicar no banco existente

A migration incremental `drizzle/0001_weekly_tv_schedules.sql` cria somente a tabela de agendamentos, suas constraints e índice. Aplique antes de iniciar ou publicar esta versão:

```bash
npm run db:migrate
```

O comando precisa receber `DATABASE_URL` do banco escolhido. A migration não foi aplicada automaticamente. O repositório tinha um snapshot anterior, mas nenhum SQL inicial nem entradas no journal; esta migration pressupõe que as tabelas existentes, incluindo `tv` e `playlist`, já estejam provisionadas. Ela não inicializa um banco vazio.

## Estrutura

```
src/
  db/           schema + client Drizzle
  lib/          auth, storage local em data URL, pareamento
  actions/      server actions (tv, media, playlist)
  app/
    (painel)/   layout + páginas do painel (protegidas por proxy)
    player/     página fullscreen do player
    api/        rotas do player (pair, config, heartbeat) + better-auth
```

## Notas de arquitetura

- **Sincronização**: compara ID e versão da playlist; consulta novamente no limite de horário calculado pelo servidor, além do polling de até 15s. Troca o conteúdo sem recarregar a página.
- **Status online/offline**: derivado do `lastHeartbeat` em tempo de leitura (`computeTvStatus`), sem job em background.
- **Pareamento**: código alfanumérico de 8 chars gerado com `crypto.randomBytes`, não sequencial.
- **Mídia**: arquivos enviados são convertidos para data URL e salvos no banco. Para arquivos grandes ou produção com muitos vídeos, troque por storage externo.
- **Cache offline**: o Player mantém o `<img>`/`<video>` já carregado em memória; para cache mais robusto (Service Worker) fica como próximo passo, indicado no código.
- **Multi-empresa/permissões**: schema deixa espaço para extensão (ex: `companyId` em `tv`), mas não implementado no MVP. A programação semanal por TV está disponível no painel autenticado.

## Pendências para produção
- Configurar shadcn/ui via CLI (`npx shadcn@latest init`) para substituir os componentes básicos por primitives completos (Dialog, Select, Toast já cobertos de forma simplificada).
- Service Worker para cache offline real dos arquivos de mídia no Player.
- Testar migrations Better Auth (`npx @better-auth/cli generate`) contra o schema em `src/db/schema.ts`.
