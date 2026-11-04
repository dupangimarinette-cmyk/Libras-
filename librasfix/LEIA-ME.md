# LibrasGo: dados no Firebase + reconhecimento de sinais em movimento

## 1) Dados no Firestore (acabou o sync_data.json / admin_state.json)

**O que mudou:** alunos, loja, missões, conteúdo do admin, feedbacks, códigos, logs... tudo agora fica no Firestore, não se perde mais quando o AI Studio reinicia.
Na primeira vez que o servidor sobe com o Firestore vazio, ele **importa sozinho** os JSON e renomeia para `*.migrado.bak`. Isso só acontece uma vez (marcador `meta/migration`).

**O que você precisa fazer (uma vez):**
1. Console do Firebase > Configurações do projeto (engrenagem) > **Contas de serviço** > *Gerar nova chave privada* (baixa um .json).
2. No AI Studio > Secrets, crie `FIREBASE_SERVICE_ACCOUNT` e cole **o conteúdo inteiro** do .json.
3. Reinicie o app e olhe o log: deve aparecer `Modo ativo: FIRESTORE`. Se aparecer `ARQUIVOS JSON`, o motivo vem escrito logo acima.
4. Guarde esse .json em lugar seguro e **nunca** coloque no GitHub (ele dá acesso total ao banco).

**Importante:**
- Sem a chave, o app continua funcionando como antes (arquivos JSON), só avisa no log.
- Os `sync_data.json` e `admin_state.json` deste ZIP estavam **vazios**. Para migrar os dados reais, suba esta versão no app publicado que ainda tem os dados nos arquivos (não apague os JSON de lá) e ela importa na primeira inicialização.
- Substitua também `firestore.rules` (só ganhou um comentário) e rode `npm install` (novo pacote `firebase-admin`).
- `PERSISTENCE=file` nos Secrets força voltar ao modo arquivo.
- Cada registro grande é dividido em pedaços (limite do Firestore: 1 MiB por documento). Se uma gravação falhar, o servidor tenta de novo sozinho.

## 2) Reconhecimento de sinais em movimento

**Antes:** a IA comparava um quadro parado. **Agora:** ao gravar "Gravar ao Vivo (3s)", ela guarda a **trajetória** da palma e o **formato da mão ao longo do tempo**. Na revisão, compara os últimos segundos da câmera com a gravação usando DTW (aceita mais rápido/mais devagar, qualquer posição na tela, qualquer distância da câmera, mão direita ou esquerda).
- Mão parada não vale como sinal em movimento.
- Se você não mexer a mão na gravação, ele avisa e salva como sinal parado.
- Na revisão aparece "Movimento: X%" e dicas ("faça o movimento mais amplo", etc.).
- Vale para **sinais ensinados à IA**. Os sinais da lição (ARCameraView) continuam por posição de mão: o campo "movimento" deles é texto livre, sem trajetória de referência. Para esses, grave o sinal ao vivo pela tela "Ensinar IA".

## Arquivos
Novos: `persistence.ts`, `src/services/motionRecognizer.ts`, `scripts/verify_motion.ts`
Alterados: `server.ts`, `package.json`, `.env.example`, `firestore.rules`, `src/types/libras.ts`, `src/services/aiSignLearner.ts`, `src/components/ARPractice/AITeachSignView.tsx`, `LEIA-ME.md`

## Testado
- Persistência (Firestore simulado): migração, reinício, só grava o que mudou, apagar, registros gigantes em pedaços, falha de rede com nova tentativa, não reimporta, pedaço faltando = recusa subir.
- Movimento (mãos sintéticas): 10 repetições válidas (outra posição, mais perto, mais rápido, mais lento, espelhada...) ≥ 91 pontos; 7 sinais errados (direção, círculo x onda, mão parada...) ≤ 5 pontos.
- `tsc` sem erros nos arquivos alterados.
- **Não testei** no Firestore real nem com câmera real (sem acesso aqui). Se a nota de movimento ficar rígida/frouxa com sua câmera, os números ficam no topo de `motionRecognizer.ts` (`MATCH_THRESHOLD`, `BAND`, e a curva em `costToScore`).
