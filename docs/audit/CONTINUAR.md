# Retomar auditoria — estado atual

Atualizado em 06/09/2026. Leia RELATORIO.md e o diff; preserve alterações não commitadas.

Implementado: proteção das 20 actions, integridade transacional, payload otimizado, tokens/revogação/transição segura, rate limit PostgreSQL, baseline/snapshots/migration, watchdog/validação do player, override esbuild e documentação. Conferência final: 21 testes e typecheck aprovados; instalação reportou zero vulnerabilidades. Build: consultar registro final do relatório.

Pendências:
1. UI autenticada: scripts/audit-preview.cjs falhou com ECONNRESET na ponte PGlite Socket. Usar PostgreSQL descartável de servidor. 03-login.png inspecionada; 01/02 históricas. Preview encerrado.
2. Aplicação real com destino/backup revisados. Inventário: migration 1788652800000, issuer presente, hash de TV/rate limit ausentes. Migration 0002 necessária antes de iniciar versão nova. Não executar migration real automaticamente nesta auditoria.
3. Rollout e encerramento de PLAYER_ALLOW_LEGACY_AUTH após atualizar TVs antigas. UUID legado segue sensível.
4. Revisar 3 contas/17 sessões ativas com responsável; nenhuma alterada.
5. Concorrência em servidor PostgreSQL, codecs/hardware, object storage e cache offline.

Usuário autorizou testes/typecheck/build. Sem pedido de deploy/commit, migration destrutiva ou exclusão de dados reais. Sem subagentes. Ler docs Next locais conforme AGENTS.md antes de código. Não imprimir segredos. Relatório distingue implementado, verificado em fixture e aplicado no ambiente real.
