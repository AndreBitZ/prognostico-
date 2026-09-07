# Prognósticos Desportivos

App de prognósticos de futebol em **Next.js 15** (`AndreBitZ/prognostico-`).

## Hierarquia de fontes (nada substitui nada)

1. **Football-Data.org** — fonte **principal**. Calendário, resultado, tabela casa/fora/total, forma, H2H. Sem isto não há previsão.
2. **openfootball / football.json** — **só jogos em falta** na forma. Se o football-data.org já trouxe o jogo (data + casa/fora + resultado), o JSON é ignorado nesse jogo. Nunca apaga nem troca a forma da API.
3. **ClubElo** — **só o rating** que as duas anteriores não têm. Ajusta o λ no máximo ±14% quando as duas equipas têm Elo. Não é calendário, não é resultado, não substitui golos.

Ainda à volta (não entram nesta hierarquia de resultados):

- **The Odds API** — 1X2, blend e selo de valor
- **Understat** — npxG nas top-5 se o HTML ainda trouxer dados; senão ignora
- **TheSportsDB** — emblemas

## Modelo

Poisson + Dixon-Coles + binomial negativa + π-rating + Bradley-Terry + mercado + npxG (quando há ≥5 jogos) + ClubElo (quando há os dois ratings) + calibração.

Ligas: Premier League, Championship, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Primeira Liga, Eredivisie, Brasileirão.

## Ambiente

```bash
FOOTBALL_DATA_KEY=
ODDS_API_KEY=
THESPORTSDB_KEY=123
```

Dados apenas informativos. Não é conselho de apostas.
