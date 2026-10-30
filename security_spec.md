# LibrasGo Security Specification & Firestore Hardening

## 1. Data Invariants
1. **User Identity & State Integrity**: A user can only write to their own profile doc (`/users/{userId}`) where `userId == request.auth.uid` (or matching authenticated identity). Users cannot alter RBAC roles or inject shadow privileges.
2. **New Account Purity**: New accounts start at Level 1, 0 XP, 0 gems, and 0 streak. XP and gems must be non-negative integers.
3. **Feedback Integrity**: Feedbacks sent by students (`/feedbacks/{feedbackId}`) must have valid category types (`sugestao`, `erro`, `reclamacao`, `elogio`) and default to status `pendente`. Students cannot arbitrarily alter `status` to `resolvido` or write `adminReply`.
4. **Admin Protection**: Only verified administrators can delete user accounts, delete feedbacks, or update official announcements.
5. **Path Variable Hardening**: Document IDs must satisfy `isValidId(id)` (alphanumeric, max 128 characters).

## 2. The "Dirty Dozen" Payloads (Adversarial Tests)
1. **Payload 1 (Shadow Privilege Escalation)**: Attempting to write `{ "isAdmin": true, "role": "admin" }` in `/users/{userId}`. (Must be DENIED)
2. **Payload 2 (ID Poisoning Attack)**: Document ID containing path traversal or shell characters `../../../etc/passwd`. (Must be DENIED)
3. **Payload 3 (Denial of Wallet - Bloated Payload)**: A user doc containing a 2MB string in `bio`. (Must be DENIED by `maxLength` 250 check)
4. **Payload 4 (State Shortcutting in Feedback)**: A non-admin user creating a feedback with `"status": "resolvido"` and a forged `"adminReply"`. (Must be DENIED)
5. **Payload 5 (Unauthenticated Profile Overwrite)**: Unauthenticated client calling `setDoc` on `/users/alice`. (Must be DENIED)
6. **Payload 6 (Cross-User Data Tampering)**: User `bob` trying to update `/users/alice` XP to 99999. (Must be DENIED)
7. **Payload 7 (Invalid Enum Injection)**: Feedback created with `"type": "malicious_script"`. (Must be DENIED)
8. **Payload 8 (Negative XP / Overflow)**: Attempting to set `xp: -5000` or invalid types. (Must be DENIED)
9. **Payload 9 (Unauthorized Feedback Deletion)**: A regular user attempting to delete a feedback from the database. (Must be DENIED; admin only)
10. **Payload 10 (Forged Announcement)**: Non-admin writing to `/announcements/ann_1`. (Must be DENIED)
11. **Payload 11 (Blanket Collection Scraping)**: Reading all user profiles without filtering. (Must be DENIED; split/owner isolation)
12. **Payload 12 (Ghost Field Injection)**: Creating a user document containing undocumented field `{"hack": 123}` violating strict schema. (Must be DENIED)

## 3. Admin API (servidor Express)
1. Todas as rotas `/api/admin/*` exigem `Authorization: Bearer <token>`; só `/api/admin/auth/login` é pública.
2. Login com usuário + senha. Senha guardada apenas como hash `scrypt` (sal por senha); nunca em texto puro.
3. Senha inicial: variável `ADMIN_PASSWORD` ou, se ausente, senha aleatória mostrada uma vez no log do servidor.
4. Máximo de 5 tentativas de login por IP a cada 15 minutos; falhas ficam no log de auditoria.
5. Sessões de 24h, em memória (reiniciar o servidor exige novo login). Trocar a senha encerra as outras sessões.
6. Firestore: `isAdmin()` só vale para uid cadastrado em `/admins/{uid}`; e-mail nunca concede privilégio.

## 4. Contas de alunos (Etapa A)
1. Cada conta tem uma chave secreta (guardada como hash no servidor, até 5 aparelhos). O app envia `X-User-Key`.
   Salvar progresso, comprar, bônus diário, resgatar códigos e gravar/apagar sinais exigem a chave.
2. Contas antigas (sem chave) recebem a chave no primeiro salvamento depois da atualização.
3. Restaurar em outro aparelho exige o Código de Sincronização (8 caracteres aleatórios); o nome de usuário sozinho não basta. Limite de 20 tentativas erradas por IP a cada 15 minutos.
4. O código de sincronização não aparece mais no ranking nem na busca.
5. Preço da loja vem do catálogo do servidor (com os ajustes de preço de baús feitos pelo admin); o custo enviado pelo app é ignorado.
6. Limites de salvamento: ganho de diamantes e XP limitado por um crédito que recarrega com o tempo; ofensiva sobe no máximo 1 por dia; a data do bônus diário só avança.
   Ajuste em `STAT_LIMITS` no `server.ts`.
7. Limitação conhecida: contas novas podem começar com até 20.000 diamantes / 50.000 XP, e quem tem a chave pode ganhar dentro do crédito. O fim definitivo disso é o servidor conceder XP e moedas ao validar cada lição (Etapa B).
