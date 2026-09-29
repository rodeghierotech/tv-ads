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
2. Em banco vazio, executar `npm run db:migrate`. Há baseline, agenda e segurança versionados e testados em PostgreSQL embarcado descartável. Para banco existente, consulte as condições abaixo antes de migrar.
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
- Antes de publicar uma versão que depende de schema novo, revise e aplique as migrations no banco escolhido, com backup. Crie o usuário administrador pelo script local.
- Alterar variáveis na Vercel exige um novo deploy para surtir efeito.
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

As migrations são `0000_initial_baseline.sql`, `0001_weekly_tv_schedules.sql` e `0002_device_security.sql`. A última adiciona hash de token por TV, controle de registros e compatibilidade de `account.issuer`. Revise o destino e faça backup antes de aplicar:

```bash
npm run db:migrate
```

O comando carrega `.env*` com a mesma biblioteca do Next; variáveis do processo têm precedência. Em banco vazio, aplica as três migrations. Em banco existente com a migration da agenda registrada em `1788652800000`, o migrador pula o baseline anterior e aplica a segurança; esse caminho foi testado preservando registros. **Banco existente sem histórico correspondente exige conciliação manual: não aplique o baseline sobre tabelas existentes.** Provedores de conta desconhecidos sem `issuer` abortam a migration para revisão explícita. Nenhuma migration foi aplicada ao banco real pela auditoria.

## Estrutura

```
src/
  db/           schema + client Drizzle
  lib/          auth, storage local em data URL, pareamento
  actions/      server actions (tv, media, playlist)
  app/
    (painel)/   páginas protegidas por sessão; actions também verificam sessão
    player/     página fullscreen do player
    api/        rotas do player (pair, config, heartbeat) + better-auth
```

## Notas de arquitetura

- **Sincronização**: compara ID e versão da playlist; consulta novamente no limite de horário calculado pelo servidor, além do polling de até 15s. Troca o conteúdo sem recarregar a página.
- **Status online/offline**: derivado do `lastHeartbeat` em tempo de leitura (`computeTvStatus`), sem job em background.
- **Pareamento**: código alfanumérico de 8 chars gerado com `crypto.randomBytes`, não sequencial.
- **Mídia**: arquivos enviados são convertidos para data URL e salvos no banco. Para arquivos grandes ou produção com muitos vídeos, troque por storage externo.
- **Cache offline**: o Player mantém a playlist em memória durante falhas de sincronização. Não há persistência offline após recarregar a página.
- **Permissões**: todos os usuários autenticados administram a mesma instância. Não há multitenancy, campo `companyId` ou papel de demonstração restrito.

## Pendências para produção
- Aplicar a migration de segurança antes de iniciar esta versão no banco existente e concluir a transição dos players antigos.
- Service Worker para cache offline real dos arquivos de mídia no Player.
- Exercitar concorrência em PostgreSQL de servidor e reprodução em TVs representativas.

## Segurança e limites

- Cadastro público por email/senha desativado. O script `scripts/create-admin.ts` habilita cadastro somente na sua própria instância de autenticação local.
- Ações administrativas verificam sessão no servidor; o proxy apenas antecipa o redirecionamento.
- A opção de demonstração só aparece quando `NEXT_PUBLIC_DEMO_EMAIL` e `NEXT_PUBLIC_DEMO_PASSWORD` estão configurados no build. São credenciais públicas: use somente uma instância descartável. Fechar cadastro não revoga contas ou sessões antigas.
- Upload permite JPEG, PNG, WebP, MP4 e WebM, até 3 MiB por arquivo. O limite da Server Action é 4 MiB, incluindo multipart. Mídias continuam armazenadas como data URLs no PostgreSQL; grandes playlists ainda podem exceder limites de resposta do provedor.
- Players atualizados enviam `knownPlaylist=ID:versão`; quando coincide, a resposta omite mídias e mantém os horários de sincronização. Clientes sem esse parâmetro recebem a resposta completa.
- Novos players recebem token aleatório de 256 bits; apenas seu hash fica no banco. Pair/config/heartbeat exigem Bearer token. O painel permite revogar acesso, preservando a TV e sua programação; o dispositivo precisa reconectar como novo.
- TVs antigas sem hash aceitam UUID durante a transição com `PLAYER_ALLOW_LEGACY_AUTH=true` (padrão). Ao recarregar o player atualizado, ele persiste um token antes de reivindicar a identidade antiga. Após migrar todos os dispositivos, defina `false` e faça novo deploy. Durante a transição, quem conhece um UUID legado ainda pode reivindicá-lo; IDs antigos continuam sensíveis. TVs já migradas nunca retornam à autenticação somente por UUID.
- Registro público limitado a 30 tentativas por 10 minutos em contador PostgreSQL compartilhado. Na Vercel, usa hash do endereço fornecido pela plataforma; fora dela, usa um contador comum à instância. Isso pode limitar instalações simultâneas atrás do mesmo endereço. Não limita todo o tráfego HTTP nem substitui proteção do provedor.

## Verificações locais

```bash
npm run typecheck
npm test
npm run build
```

Os 21 testes usam `node:test`, TypeScript e PostgreSQL embarcado PGlite. Incluem mocks para casos unitários e migrations/ações/rotas com SQL em banco descartável. Não escrevem no banco real nem provam ausência de deadlocks sob carga em um servidor PostgreSQL. Não há configuração de ESLint; typecheck não equivale a lint.

`node scripts/audit-database.cjs` consulta somente indicadores de schema e contagens no banco configurado, sem imprimir credenciais. `scripts/audit-preview.cjs` é uma ferramenta experimental de UI com fixtures locais: a ponte PGlite Socket apresentou falhas de conexão na auditoria e não deve ser usada como evidência de aprovação dos fluxos autenticados.

Relatório da auditoria e limitações: [docs/audit/RELATORIO.md](docs/audit/RELATORIO.md).
