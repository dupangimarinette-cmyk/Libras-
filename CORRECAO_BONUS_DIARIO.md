# LibrasGo — correção de sincronização do bônus diário

## Arquivos alterados
- `server.ts`: rota `/api/rewards/daily-claim`.
- `src/services/shopService.ts`: tratamento de respostas HTTP inválidas no resgate.

## Correções aplicadas
- Localiza a conta pelo nome e/ou código de sincronização, em vez de exigir exclusivamente a chave `USER_<nome>`.
- Seleciona a cópia de conta com `updatedAt` mais recente quando há aliases.
- Atualiza os aliases da mesma conta com o mesmo saldo e data de resgate, preservando os demais campos dos registros.
- Usa a data local de São Paulo para alinhar a regra diária com o público brasileiro.
- Retorna códigos de erro específicos para conta não localizada, estatísticas ausentes e bônus já resgatado.
- Mantém a validação de chave de usuário do servidor e o cálculo atual da recompensa (30 + até 35 diamantes conforme sequência).

## Integridade
- Nenhum dado de `sync_data.json`, `admin_state.json`, backup ou usuário foi editado durante a preparação.
- Nenhuma regra de Firebase/Firestore foi alterada. O fluxo de recompensa existente é gravado pelo servidor no banco JSON compartilhado do projeto; não foi migrado para Firebase.
- O ZIP base utilizado foi `LibrasGo_Clube_Premium.zip`, a versão mais recente localizada no material do projeto.

## Validação e limitações
- Verificação estática do trecho alterado e consistência estrutural: realizada.
- Teste de execução/build com dependências e conta real: não realizado neste ambiente.
- A correção ainda precisa ser aplicada no Google AI Studio e testada com uma conta real. Não afirmar que o beta online já foi corrigido.
