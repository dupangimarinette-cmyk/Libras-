# Atualização LibrasGo: Ranks Safira e Diamante

Esta atualização adiciona os novos níveis de progressão **Safira** e **Diamante** ao aplicativo LibrasGo.

## Sistema de Progressão de Ranks
1. **Bronze** (Nível Inicial)
2. **Prata** (100 - 499 XP)
3. **Ouro** (500 - 1.199 XP)
4. **Safira** (1.200 - 2.499 XP) - *Novo!*
5. **Diamante** (2.500+ XP) - *Novo!*

## Estrutura do Arquivo Zip
- `ranks.json`: Configuração das faixas de pontuação, ícones e cores para cada rank.
- `RankController.js`: Lógica do aplicativo para verificar e realizar o upgrade de rank automaticamente com base no XP do usuário.
- `RankBadge.jsx`: Componente UI para exibição dos badges de Safira e Diamante com gradientes e animações de conquista.
