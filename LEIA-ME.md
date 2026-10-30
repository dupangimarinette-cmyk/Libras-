# LibrasGo: segurança (admin + contas de alunos) — pacote completo

Este pacote **substitui** o anterior: inclui tudo da etapa do painel admin e a Etapa A (alunos).

## Arquivos
Novos: `src/services/adminFetch.ts`, `src/services/userAuth.ts`, `src/utils/syncCode.ts`
Alterados: `server.ts`, `firestore.rules`, `security_spec.md`, `src/App.tsx`,
`src/services/{adminService,contentService,storageService,shopService,aiSignLearner}.ts`,
`src/components/Auth/LoginView.tsx`, `src/components/Admin/AdminDashboard.tsx`,
`src/components/Leaderboard/LeaderboardView.tsx`

**Não** substitua `admin_state.json` nem `sync_data.json` (são os seus dados).
Aplique todos juntos: o app e o servidor mudam juntos.

## O que muda para os alunos
- Cada conta ganha uma chave secreta, guardada no aparelho. Contas que já existem recebem a chave no primeiro salvamento depois da atualização (acontece sozinho, sem o aluno fazer nada).
- Para entrar em outro aparelho, só o **Código de Sincronização** serve. Restaurar só pelo nome de usuário deixou de funcionar (era assim que dava para tomar a conta de outra pessoa).
- Novos códigos têm 8 caracteres aleatórios (ex.: `LIB-K7M2Q9XD`). Os antigos, de 4 números, continuam valendo.
- O código não aparece mais no ranking nem na busca.

## O que o servidor passou a fazer
- Preço da loja: vem do catálogo do servidor. O valor enviado pelo app é ignorado.
- Ganho de diamantes/XP: limitado por um crédito que recarrega com o tempo. Aumento absurdo é recusado e fica no registro de auditoria do admin ("Salvamento Recusado").
- Ofensiva: sobe no máximo 1 por dia. Bônus diário: a data não pode ser voltada para resgatar de novo.
- Sinais ensinados: só o dono apaga os seus (antes, qualquer pessoa apagava o de qualquer um).

## Se algum aluno legítimo for barrado
Os limites estão em `STAT_LIMITS`, no topo do bloco `USER-KEY` do `server.ts`
(crédito inicial 4.000, recarga 150 por hora, teto 20.000). Aumente se precisar.
Atenção: um código promocional que dê mais de ~3.000 diamantes de uma vez pode ser recusado no salvamento seguinte.

## Testado
49 testes do servidor (login admin, chaves, fraudes de moedas/preço/bônus, sequestro por nome, sinais, rate limit)
e 9 do fluxo app↔servidor (incluindo trocar de aparelho). Rodei o `server.ts` real com um Express simulado;
**não** compilei o projeto completo (o npm está bloqueado no meu ambiente). Rode `npm run lint` se puder, ou envie o erro do console do AI Studio.

## Ainda aberto
- Amigos e desafios (`/api/friends/*`, `/api/challenges/*`) ainda não exigem chave.
- Contas novas podem começar com até 20.000 diamantes / 50.000 XP; e dentro do crédito é possível ganhar além do real.
  A solução definitiva é o servidor conceder XP/moedas ao validar cada lição (Etapa B).
- Os dados ainda ficam em `sync_data.json`; migrar para o Firebase evita que o AI Studio os apague ao republicar.
