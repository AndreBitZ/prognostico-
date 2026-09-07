# Prognósticos Desportivos

App de prognósticos de futebol em **Next.js 15** (`AndreBitZ/prognostico-`).

## Fontes (plano gratuito)

- **Football-Data.org** — jogos, standings casa/fora/total, forma recente, H2H
- **The Odds API** — 1X2 desvigado (todas as ligas da home), blend de 25% no modelo e selo de valor
- **TheSportsDB** — emblemas quando o crest falha

Não usamos livescore agressivo nem APIs “all-in-one” no motor. Calibração histórica (CSV football-data.co.uk / openfootball) fica offline, fora do request da UI.

## Modelo

Poisson + Dixon-Coles + binomial negativa + π-rating + Bradley-Terry + mercado (quando existe) + calibração.

Ligas: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Primeira Liga, Eredivisie, Brasileirão.

## Ambiente

```bash
FOOTBALL_DATA_KEY=
ODDS_API_KEY=
THESPORTSDB_KEY=123
```

Odds: 1 pedido por liga / hora (cache Next `revalidate: 3600`). Não acrescentar `totals`/`btts` no mesmo call sem aumentar o quota mensal.

Dados apenas informativos. Não é conselho de apostas.
