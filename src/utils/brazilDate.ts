/**
 * Data do "dia" do LibrasGo no fuso de São Paulo (YYYY-MM-DD).
 *
 * O servidor usa esta mesma regra para o bônus diário (server.ts, rota
 * /api/rewards/daily-claim). Se o app calcular o dia em UTC, entre 21h e 24h
 * de Brasília o botão volta a ficar disponível depois do resgate.
 */
const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

export function getBrazilDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
