# Cadrogo

Micro-SaaS B2B pour analyser un PDF d'Appel d'Offres en moins de 2 minutes.

## Stack

- Next.js 14 (App Router)
- TypeScript strict
- Tailwind CSS + composants Shadcn-style
- OpenAI `gpt-4o-mini` (JSON structuré)
- `pdf-parse` + `xlsx`

## Démarrage

```bash
cd tenderpulse
cp .env.example .env.local
# Renseignez OPENAI_API_KEY dans .env.local
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## API

`POST /api/analyze` — `FormData` avec le champ `file` (PDF).

Réponse succès :

```json
{ "data": { /* TenderAnalysisResult */ } }
```

## Export Excel

Depuis le dashboard, le bouton **Exporter en Excel (.xlsx)** génère 3 onglets :

1. Synthèse Go-NoGo
2. Exigences & Conformité
3. Risques & Pénalités
