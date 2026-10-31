# LibrasGo: bloqueio de contas falsas (robôs/IA) + exclusão em lote

Substitua estes arquivos (mesmos caminhos do projeto) e adicione os novos. Não mexa em `admin_state.json` nem `sync_data.json`.

Novos: `src/services/humanCheck.ts`, `src/components/Auth/HumanCheck.tsx`, `src/components/Auth/SignupGateModal.tsx`, `src/components/Admin/SuspectAccountsPanel.tsx`
Alterados: `server.ts`, `src/App.tsx`, `src/services/storageService.ts`, `src/components/Auth/LoginView.tsx`, `src/components/Admin/AdminDashboard.tsx`

## Como funciona
- Conta nova só é criada com um "passe" de verificação humana (uso único). Quem já tem conta não vê nada diferente.
- A verificação padrão é uma pergunta simples (ex.: "Quanto é 7 mais 5?") + armadilha invisível + tempo mínimo de 2,5 s + limites por rede.
- Limite: 8 contas novas por hora por rede/IP. Em escola com muitos alunos na mesma rede, aumente `newAccountsPerIpPerHour` em `SIGNUP_LIMITS` (topo do bloco ANTI-BOT no `server.ts`).
- Nomes de robô/IA, links e só números/símbolos são recusados no cadastro.
- Admin > Alunos: painel "Contas suspeitas" com exclusão em lote (com confirmação). Mostra também contas de nome de robô que a lista normal escondia.

## Importante: pergunta simples não segura uma IA com navegador
Para isso, ative o Cloudflare Turnstile (grátis): crie um widget em dash.cloudflare.com > Turnstile e, no AI Studio, defina os segredos `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`. O app passa a usar o Turnstile sozinho, sem mudar código.

## Testado
19 testes no `server.ts` real com Express simulado (passe, uso único, nomes, tempo, armadilha, limite por IP, suspeitos, exclusão em lote e individual).
Não compilei o front-end (npm bloqueado aqui): rode `npm run lint` ou me envie o erro do console.
