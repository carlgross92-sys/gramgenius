# GramGenius

AI-Powered Instagram Growth Engine — automates content research, caption writing, AI photo generation, AI video generation, Reel creation with voiceovers, scheduling, and auto-posting directly to Instagram.

## Features

- **Brand Brain** — Configure your brand identity, voice, niche, and content pillars to power all AI generations
- **Content Swarm Engine** — 6 specialized AI agents (Research, Strategy, Copy, Editor, Hashtag/Visual/CTA, Formatter) working together
- **AI Caption Generator** — Claude generates 3 caption variations with hook alternatives and tiered hashtag sets
- **AI Image Generator** — DALL-E 3 creates Instagram-ready portrait images from descriptions
- **AI Reel Studio** — Full scene-by-scene Reel creation: script, voiceover (ElevenLabs), video (Runway ML)
- **Trend Research** — Claude researches trending topics and generates content ideas for your niche
- **Content Calendar** — Monthly/weekly/list views with color-coded status and post type icons
- **Carousel Generator** — Hook slide + content slides + CTA slide with visual suggestions
- **Story Sequences** — Multi-slide Instagram Story creation with engagement stickers
- **Hashtag Intelligence** — 80-hashtag research with tiered categorization, banned tag detection, rotation tracking
- **Competitor Analysis** — Claude researches competitor accounts and identifies content gaps
- **Comment Manager** — Fetches comments, auto-drafts replies in your brand voice, one-click send
- **Collab Finder** — Discover collaboration partners with AI-generated DM pitches
- **Auto-Posting** — Schedule posts and Reels for automatic publishing via Meta Graph API
- **Analytics** — Growth charts, top posts, content type breakdown, AI-generated monthly reports
- **Account Health Score** — 0-100 score based on posting consistency, hashtag rotation, engagement

## Tech Stack

- **Framework**: Next.js 16 App Router (TypeScript)
- **Database**: PostgreSQL via Neon (free tier) + Prisma ORM
- **File Storage**: Vercel Blob Storage
- **Styling**: Tailwind CSS + shadcn/ui
- **AI Content**: Anthropic Claude (claude-sonnet-4-20250514)
- **AI Images**: OpenAI DALL-E 3
- **AI Video**: Runway ML Gen-4 Turbo
- **AI Voiceover**: ElevenLabs
- **Posting**: Meta Graph API (Instagram Business + Facebook Pages)
- **Scheduling**: Vercel Cron Jobs (every 5 minutes)
- **Hosting**: Vercel (free Hobby plan)

## Prerequisites

- Node.js 18+
- API accounts (see below)

## Installation

```bash
git clone <your-repo-url> gramgenius
cd gramgenius
npm install
cp .env.example .env.local
# Edit .env.local with your API keys and DATABASE_URL
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Edit `.env.local` with your keys:

| Variable | Where to Get It |
|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) → New Project → Connection String |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) → API Keys |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) → API Keys |
| `RUNWAYML_API_KEY` | [dev.runwayml.com](https://dev.runwayml.com/) → Key Management |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io/) → Profile → API Key |
| `ELEVENLABS_VOICE_ID` | [elevenlabs.io/voice-lab](https://elevenlabs.io/voice-lab) → Pick voice → Copy ID |
| `BLOB_READ_WRITE_TOKEN` | Vercel Dashboard → Project → Storage → Blob |
| `CRON_SECRET` | Any random secret string |
| `META_*` variables | See [docs/meta-setup.md](docs/meta-setup.md) |

## Deployment to Vercel

### 1. Set up Neon Database (free)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project called "gramgenius"
3. Copy the connection string
4. Add to `.env.local` as `DATABASE_URL=`
5. Run: `npx prisma db push && npx prisma db seed`

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Initialize git and push to GitHub
git init
git add .
git commit -m "Initial GramGenius build"
gh repo create gramgenius --private --source=. --push

# Deploy
vercel --prod
```

### 3. Add Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add all 15 variables from `.env.example`. Set `NEXTAUTH_URL` to your Vercel URL.

### 4. Set up Vercel Blob Storage

1. Vercel Dashboard → Project → Storage → Create → Blob Store
2. Name it "gramgenius-media"
3. The `BLOB_READ_WRITE_TOKEN` is automatically added to your project

### 5. Verify Cron Jobs

Vercel Dashboard → Project → Cron Jobs tab. You should see:
- `/api/schedule/process` — every 5 minutes (auto-publishes due posts)
- `/api/engage/comments` — every hour (fetches new comments)
- `/api/analytics/growth` — daily at 9am (logs growth metrics)

### 6. Update Meta App

Add your Vercel URL to your Facebook App's domain settings at developers.facebook.com.

## Estimated Monthly Costs

| Service | Cost |
|---|---|
| Vercel Hosting | Free (Hobby plan) |
| Neon PostgreSQL | Free (0.5GB) |
| Vercel Blob Storage | Free (1GB) |
| Anthropic Claude API | ~$5-15/month |
| OpenAI DALL-E 3 | ~$2-10/month |
| Runway ML Gen-4 | ~$10-25/month |
| ElevenLabs | $5/month (Starter) |
| Meta Graph API | Free |
| **Total** | **~$20-55/month** |

## Meta / Instagram Setup

Follow the detailed guide in [docs/meta-setup.md](docs/meta-setup.md).

## Limitations

- Meta access tokens expire every 60 days (app warns at 14 days)
- DALL-E cannot generate text in images reliably
- Runway ML video generation takes 30s-3min per scene
- Reel scene combining requires downloading individual scenes (no ffmpeg on serverless)
