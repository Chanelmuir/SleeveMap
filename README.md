# SleeveMap

A full-stack activity mapping platform built on the Strava API. Connect your Strava account and see every road you've ever covered — stitched together on a single living map. Streets are the arms of a city, your runs are the sleeves keeping them warm.

![SleeveMap](my-app/public/example_map.png)

---

## Features

- **Activity map** — every run, ride, hike, and walk from your Strava history rendered as an interactive polyline map
- **Public profiles** — optionally share your map at a public URL (`/u/your_username`). No account needed to view
- **Explorer** — browse all athletes on the platform, view public maps, and star athletes you want to plan with
- **Route planner** — plan new routes with snap-to-road routing (run, cycle, or straight line), per-segment profile switching, GPX export, and friend heatmap overlays
- **Activity type filters** — multi-select toggles to show/hide run, ride, hike, walk, and swim routes
- **Custom colours** — personalise the colour of each activity type on your map
- **Real-time sync** — new Strava activities appear automatically via webhook
- **Favourites** — star public athletes to overlay their heatmaps in the route planner

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript |
| Map rendering | Mapbox GL JS |
| Database | PostgreSQL with PostGIS (via Supabase) |
| Auth | Strava OAuth 2.0, httpOnly cookies |
| Hosting | Vercel |
| Strava integration | REST API + webhooks |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Strava API application](https://developers.strava.com)
- A [Supabase](https://supabase.com) project with PostGIS enabled
- A [Mapbox](https://mapbox.com) account and public token

### 1. Clone and install

```bash
git clone https://github.com/Chanelmuir/Strava-Heatmap.git
cd Strava-Heatmap/my-app
npm install
```

### 2. Environment variables

Create a `.env` file in `my-app/`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_WEBHOOK_VERIFY_TOKEN=a_random_string_you_choose

NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database setup

Run the SQL functions from the `/sql` folder (1-8) to set up the database on supabase. 

### 4. Strava app settings

In your [Strava API settings](https://www.strava.com/settings/api):
- Set **Authorization Callback Domain** to `localhost` for development or your production domain

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Strava Webhook (production only)

Webhooks require a public URL. After deploying, register your webhook:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://yourdomain.com/api/webhook \
  -F verify_token=YOUR_STRAVA_WEBHOOK_VERIFY_TOKEN
```

---

## Project Structure

```
my-app/
  src/
    app/
      api/
        activities/     — GeoJSON activity feed
        auth/
          strava/       — OAuth initiation
          callback/     — OAuth callback, token exchange
          logout/       — Session clear
        favourites/     — Star/unstar athletes
        me/             — Get/update own profile
          delete/       — Account deletion
        profiles/       — Public profile list
          [username]/   — Single public profile + activities
        stats/          — Site-wide stats
        sync/           — Full Strava activity sync
        webhook/        — Strava webhook receiver
      components/
        Navbar.tsx
        SyncOnLoad.tsx
      explore/          — Explorer page
      legal/            — Privacy policy + terms
      map/              — Redirect to /u/[username]
      plan/             — Route planner
      settings/         — Account settings
      u/[username]/     — Public + private map page
      page.tsx          — Landing page
```

---

## Deployment

The project is deployed on Vercel. Add all environment variables from `.env` to your Vercel project settings before deploying. Update `NEXT_PUBLIC_APP_URL` to your production domain.

---

## License

MIT

---

## Disclaimer

SleeveMap is an independent personal project and is not affiliated with, endorsed by, or sponsored by Strava, Inc. The Strava name and logo are trademarks of Strava, Inc.