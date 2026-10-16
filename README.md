# BilSikker

A Next.js web app that helps people judge a used car before they buy it. Paste a link to a car ad from DBA or Bilbasen, or type a Danish number plate. BilSikker shows a free overview based on official vehicle register data, and can then generate an AI buying report with a score, risks, known issues for the model, a price assessment and questions to ask the seller.

> The interface and the AI report are in Danish, and the app is built for the Danish used-car market.

## How it works

1. **Input**: the user pastes a DBA or Bilbasen link, or enters a number plate, on `/analyser`.
2. **Ad extraction**: for links, the server fetches the ad and extracts the title, price, mileage, year, description, number plate and VIN (from JSON-LD, meta tags and the visible text).
3. **Register lookup**: if a plate or VIN is found, the app fetches official vehicle data through the Synsbasen API. If no plate is found, the user is asked for one. They can also skip this step.
4. **Free overview**: the vehicle overview is shown without any AI call.
5. **AI report** (the paid step in the planned product): OpenAI analyzes the ad and the register data, acting as an experienced Danish used-car mechanic, and returns a structured report.

The flow never dead-ends. If the marketplace blocks the request with a bot-protection page, or the ad can't be read, the app falls back to the official register lookup by plate.

## Features

- **Two inputs**: an ad link, or a number plate only.
- **Vehicle overview** from official data: model year, first registration, fuel type, body type, latest mileage, average km per year, next inspection, registration status, specifications, estimated periodic taxes and a timeline of registrations and inspections.
- **Register indicators**, each rated strong, OK, weak or unknown:
  - **Inspection history**
  - **Mileage history**, with a warning if the odometer reading goes down between inspections
  - **Registration status**
  - **Debt / lien** (optional, see below)
- **AI buying report**:
  - a score from 0 to 100 shown as a color-coded ring
  - a summary, strengths, risks and known issues for the model, engine and gearbox
  - a price assessment against the Danish market
  - questions for the seller and a checklist for the viewing and test drive
  - a final recommendation
- **Paywall step**: the AI report sits behind an unlock screen. Payment isn't implemented yet; see the notes below.

## Engineering highlights

- **Structured output**: the report is generated with OpenAI Structured Outputs and a Zod schema (`zodResponseFormat`) at temperature 0.2. The schema avoids min/max keywords, which strict mode rejects, and the score is clamped to 0–100 in code.
- **SSRF protection**: only `http`/`https` URLs on an allow-list (`dba.dk`, `bilbasen.dk`) are fetched, with a timeout and a cap on how much text is sent to the model.
- **Bot-protection detection**: challenge pages from AWS WAF and Cloudflare are recognized by status code and markers. When that happens, the user is sent to the plate lookup instead of seeing an error.
- **Robust scraping**: cheerio parses JSON-LD first, then meta tags and headings, then the visible text. Spaces are added between elements so labels and values such as "Modelår" and "1967" aren't glued together. Danish plates (two letters and five digits) and VINs are detected with label-aware patterns.
- **Legal data source**: official register data comes from the licensed Synsbasen API instead of scraping aggregator sites.
- **GDPR by design**: the Synsbasen client removes every personal identifier, such as owner, creditor and debtor names and birth dates. Only non-personal facts leave that module.
- **Graceful degradation**: without a Synsbasen key, the app still works on ad data alone. Register enrichment is an extra, never a requirement.
- **Free step, then paid step**: `/api/analyze` returns the free overview. `/api/analyze/unlock` reuses the context from the first step, so the ad isn't scraped again and the register lookup isn't charged twice.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Route Handlers), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4, shadcn-style components on Radix UI, `lucide-react` icons |
| AI | OpenAI SDK, Structured Outputs, Zod |
| Scraping | cheerio |
| Vehicle data | Synsbasen API (optional) |

There is no database and no login.

## Project structure

```
app/
  page.tsx                  Landing page
  analyser/                 Analysis page
  api/analyze/              Free step: ad extraction, register lookup, overview
  api/analyze/unlock/       Paid step: AI buying report
components/
  landing/                  Hero, features, how it works, call to action
  analyze/                  Input form, flow state, plate prompt, loading state
  report/                   Vehicle overview, score ring, report sections, paywall
  ui/                       Shared UI components
lib/
  scraper.ts                URL validation, fetching, bot-protection detection, extraction
  synsbasen.ts              Synsbasen client and register indicators
  openai.ts prompt.ts schema.ts   AI analysis
  score.ts                  Score to status mapping
  config.ts                 Model, allowed hosts, timeouts, limits
types/analysis.ts           Shared types
```

## Getting started

Requirements: Node.js 20+ and an OpenAI API key.

```bash
npm install
cp .env.example .env.local     # add your keys
npm run dev
```

Open http://localhost:3000. Restart the dev server after changing `.env.local`.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Runs the AI report |
| `OPENAI_MODEL` | No | Model with Structured Outputs support (default `gpt-4o`) |
| `SYNSBASEN_API_KEY` | No | Enables plate lookup and official register data |
| `SYNSBASEN_BASE_URL` | No | Override the Synsbasen API URL |
| `SYNSBASEN_ENABLE_TINGLYSNING` | No | `true` enables debt and lien lookups, which need a paid plan |

## Notes

- This is an MVP. The unlock endpoint isn't protected by payment or rate limiting yet, which must be added before a public launch.
- BilSikker gives a guiding AI assessment and doesn't replace a physical inspection by a mechanic.

## Security note

This repository contains no credentials or personal data. All keys are supplied through environment variables.
