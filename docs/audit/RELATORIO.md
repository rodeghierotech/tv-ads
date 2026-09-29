# Auditoria técnica — TV Ads Manager

Atualização: 06/09/2026. Correções locais implementadas; aplicação no banco real e revisão visual autenticada ainda pendentes. Sem deploy, commit ou alterações de registros reais.

## Problemas críticos encontrados

| Achado | Estado |
| --- | --- |
| Actions administrativas sem sessão | Corrigido nas 20 actions, com regressão automatizada. |
| Cadastro público e credenciais demo fixas | Cadastro fechado, credenciais fixas removidas; acessos antigos exigem revisão. |
| Reordenação/remoção de itens externos ou parciais | Vínculos, permutação completa e transações corrigidos. |
| Exclusão de mídia sem invalidar playlist | Versões atualizadas na transação; cascatas testadas. |
| UUID como única credencial de TV | Tokens e revogação implementados; exigem migration e rollout. UUID legado permanece sensível durante a transição. |
| Registro público ilimitado | Contador distribuído PostgreSQL implementado; exige migration. |
| Baseline ausente e snapshots divergentes | Baseline e snapshots reconciliados; instalação/upgrade testados em banco descartável. |

## Problemas corrigidos

- Sessão centralizada e verificada nas actions. Consulta interna do player separada da action administrativa. Falhas de sessão/logging de autenticação usam mensagens genéricas para evitar SQL e parâmetros sensíveis.
- Cadastro público fechado. Script administrativo e Drizzle usam @next/env para carregar configuração, incluindo .env.local.
- Token aleatório de 256 bits, hash no banco e Bearer em pair/config/heartbeat. Hashes não retornam nas actions de listagem/pareamento.
- Transição com token persistido antes de reivindicar UUID legado, atualização condicional e retry seguro após perda da resposta. TVs migradas nunca aceitam somente UUID. PLAYER_ALLOW_LEGACY_AUTH=false encerra compatibilidade.
- Revogação preserva TV/playlist/agenda, invalida acesso e exige reconectar como dispositivo novo, sem transferência automática da configuração.
- Registro limitado a 30 tentativas/10 minutos por endereço da Vercel; contador comum fora dela. Colisões de código têm tentativas limitadas arbitradas pela constraint única.
- Validação de IDs, nomes, duração, MIME declarado e upload até 3 MiB; body da action de 4 MiB. Sem inspeção binária/antivírus.
- Reordenação integral, vínculo, versões e exclusões transacionais. Ordem de locks alinhada entre agenda e exclusão; ausência de todos os deadlocks não foi demonstrada.
- Player repete item único, limpa timers, avança em erro, valida JSON com Zod, recupera identidade inválida e aplica timeout ao corpo. Watchdog avança após 30 segundos sem progresso de vídeo.
- Editor bloqueia gravações sobrepostas, restaura ordem em erro e sincroniza ID/versão. Atribuição a TV inexistente informa falha.
- Modal compartilhado com título, Escape e fechamento condicionado à gravação. Login com labels/erro de rede, logout pelo cliente de autenticação e loading/error boundaries. Interações autenticadas ainda não aprovadas visualmente.

## Otimizações realizadas

- Configuração conhecida por ID:versão omite mídias sem mudanças e preserva horários; clientes antigos recebem resposta completa.
- Seleção de mídias retorna metadados; listas evitam conteúdos completos. Imagens lazy e vídeos preload none.
- Pool PostgreSQL reutilizado em HMR; DATABASE_POOL_MAX opcional mantém padrão do driver sem valor.
- Sessão compartilhada apenas no render. Relógio local da agenda continua em 1 segundo; não contado como otimização.

## Limpeza realizada

- Helpers de storage sem operação, caminhos fictícios e overlays duplicados removidos; URLs antigas preservadas.
- Demo fixa removida; opção por ambiente documentada como pública e somente para instância descartável.
- Baseline/snapshots adicionados e timestamp da migration de agenda preservado.
- Override restrito a @esbuild-kit/core-utils substitui esbuild vulnerável, mantendo Drizzle Kit 0.31.10. Instalação final: zero vulnerabilidades reportadas. [Advisory oficial](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).
- README/ambiente atualizados, testes e inventário somente leitura adicionados. Trabalho previamente modificado não foi revertido.

## Pontos que não foram alterados

- **Banco real:** inventário somente leitura encontrou issuer presente, hash de TV/rate limit ausentes e uma migration em 1788652800000. A versão nova exige 0002_device_security.sql antes de iniciar nesse banco. Não aplicar baseline sobre tabelas existentes sem histórico conciliado.
- **Acessos antigos:** contadas 3 contas e 17 sessões ativas, sem revelar identificadores/credenciais. Nenhuma foi revogada; identificar legítimos e substituir credenciais antes expostas.
- **Transição:** quem conhece UUID legado pode reivindicá-lo enquanto compatibilidade estiver habilitada. Encerrar após atualizar players.
- **Storage/offline:** data URLs no PostgreSQL podem exceder payload inicial. Playlist sobrevive apenas em memória a falhas de rede; sem cache persistente/Service Worker.
- **Permissões:** administração única, sem multitenancy ou papel restrito demo. Colunas históricas preservadas.
- **Carga/hardware:** PGlite não substitui ensaio concorrente de servidor ou reprodução prolongada em TV. [Documentação](https://pglite.dev/docs/).
- **UI:** preview descartável falhou com ECONNRESET na ponte PGlite Socket. Não atribuímos a falha à produção. Dashboard, dialogs/foco/Escape, editor/teclado, logout e viewports 390/768/desktop não foram aprovados. [Login capturado e inspecionado](03-login.png); capturas 01/02 são históricas.
- **Erros/lint:** algumas actions têm mensagens genéricas em produção. Não há ESLint; typecheck não equivale a lint.

## Recomendações futuras

1. Revisar destino/backup e aplicar migration aditiva antes do deploy. Sem DROP ou exclusão de registros. Provedores desconhecidos sem issuer abortam o upgrade para revisão.
2. Atualizar/recarregar players, acompanhar TVs sem hash, encerrar PLAYER_ALLOW_LEGACY_AUTH e redeploy. Não revogar usuários/dispositivos em massa sem identificar legítimos.
3. Concluir UI com PostgreSQL descartável de servidor: login/logout, dialogs, agenda/conflitos, editor/teclado e três larguras. Ponte Socket atual não é evidência confiável.
4. Ensaiar concorrência de servidor, rede, codecs e reprodução em TV.
5. Planejar object storage, paginação e cache persistente conforme volume; são evolução de arquitetura.

### Evidências

- 21 testes aprovados na conferência final: 14 unitários/regressões e 7 com SQL PGlite.
- Migrations: banco vazio, upgrade preservando registros, repetição idempotente pelo journal e snapshot atual sem diferença SQL.
- Segurança: sessão nas 20 actions, tokens/revogação/transição/retry, contador compartilhado, colisões, vínculos e cascatas.
- Typecheck final aprovado com noUnusedLocals/noUnusedParameters e incremental desativado.
- Instalação final de dependências: zero vulnerabilidades reportadas.
- HTTP da etapa anterior: IDs/JSON inválidos 400; painel sem sessão 307 para login; cadastro público bloqueado sem criar conta.
- UI autenticada pendente. Preview encerrado. Testes que criam/excluem registros usam exclusivamente bancos em memória.
- Build final de produção aprovado após os últimos ajustes de autenticação/configuração: compilação, TypeScript e geração das páginas concluídos. git diff --check sem erros.

Não houve escrita em dados reais. Alterações locais sem commit. Este relatório não certifica segurança integral ou prontidão irrestrita para produção.
