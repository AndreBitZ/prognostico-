# ⚽ Prognósticos Desportivos

App de prognósticos de futebol para apostas, construída com **Next.js 15** + **API-Football**.

Mostra jogos próximos, estatísticas e **prognósticos automáticos** (vencedor, percentagens, over/under, advice) gerados pela API.

## 🚀 Como começar

### 1. Clonar o repositório
```bash
git clone https://github.com/SEU_USER/prognosticos-desportivos.git
cd prognosticos-desportivos
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar a API Key
1. Cria conta grátis em: [https://dashboard.api-football.com/register](https://dashboard.api-football.com/register)
2. Copia a tua API Key
3. Cria o ficheiro `.env.local` na raiz do projeto:

```env
API_FOOTBALL_KEY=a_tua_chave_aqui
```

### 4. Correr em desenvolvimento
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📦 Deploy no Vercel

1. Faz push do projeto para o GitHub
2. Vai a [vercel.com](https://vercel.com) → **Add New Project**
3. Importa o repositório
4. Em **Environment Variables** adiciona:
   - Name: `API_FOOTBALL_KEY`
   - Value: a tua chave da API-Football
5. Clica **Deploy**

Pronto! A app fica online em segundos.

## 🏗️ Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx              # Lista de jogos + filtro de ligas
│   ├── layout.tsx            # Layout global
│   └── jogo/[id]/page.tsx    # Página de detalhe + prognóstico
├── components/
│   ├── MatchCard.tsx         # Card de jogo
│   ├── LeagueFilter.tsx      # Filtro de ligas
│   └── PredictionCard.tsx    # Card de prognóstico
├── lib/
│   └── api-football.ts       # Funções de chamada à API
└── types/
    └── api.ts                # Tipos TypeScript
```

## ⚽ Ligas incluídas no filtro

- Premier League
- La Liga
- Serie A
- Bundesliga
- Ligue 1
- Champions League
- Europa League
- Primeira Liga (Portugal)
- Brasileirão

## ⚠️ Notas importantes

- O free tier da API-Football tem **100 requests/dia**. A app usa cache (30 min) para não gastar demasiado.
- Nem todos os jogos têm prognóstico disponível (a API só gera para alguns jogos próximos).
- Dados apenas para fins informativos. Jogue com responsabilidade.

## 🛠️ Tecnologias

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- API-Football (api-sports.io)

---

Feito com ⚽ para a comunidade de apostas e análise desportiva.
