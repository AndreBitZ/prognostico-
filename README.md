# Prognósticos Desportivos

App de prognósticos de futebol em **Next.js 15** (`AndreBitZ/prognostico-`).

## Fontes (plano gratuito)

- **Football-Data.org** — jogos, standings casa/fora/total, forma recente, H2H
- **The Odds API** — 1X2 desvigado, blend no modelo e selo de valor
- **Understat** — npxG / npxGA nas top-5 (PL, La Liga, Serie A, Bundesliga, Ligue 1), cache 12h. Se a página não trouxer `teamsData`, o modelo cai para golos sem falhar
- **TheSportsDB** — emblemas quando o crest falha

## Modelo

Poisson + Dixon-Coles + binomial negativa + π-rating + Bradley-Terry + mercado + npxG (quando há ≥5 jogos) + calibração.

Ligas: Premier League, Championship, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Primeira Liga, Eredivisie, Brasileirão.

## Ambiente

```bash
FOOTBALL_DATA_KEY=
ODDS_API_KEY=
THESPORTSDB_KEY=123
```

Dados apenas informativos. Não é conselho de apostas.
