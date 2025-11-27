# News Actions Business Bites

A modern news aggregation platform deployed on Vercel with Supabase backend and Google OAuth authentication.

## Overview

This project transforms the local Node.js + SQLite news aggregation site into a cloud-native application maintaining exact functionality and UI.

## Architecture

- **Frontend:** HTML/CSS/JavaScript with Supabase client
- **Backend:** Vercel serverless functions
- **Database:** Supabase PostgreSQL
- **Authentication:** Google OAuth via Supabase Auth
- **Deployment:** Vercel

## Features

- Multi-market business news aggregation
- User bookmarks and read later
- Custom watchlists
- Real-time filtering and search
- User feedback system
- Responsive design

## Development

### Prerequisites

- Node.js 18+
- Vercel CLI
- Supabase account
- Google Cloud Console (for OAuth)

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase project and Google OAuth
4. Configure environment variables in Vercel
5. Run locally: `npm run dev`

### Environment Variables

Set these in your Vercel project settings:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for serverless functions)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

## Deployment

The project auto-deploys to Vercel on pushes to the main branch.

## Project Structure

```
├── api/                          # Serverless functions
│   ├── auth/                     # Authentication endpoints
│   ├── news/                     # News aggregation APIs
│   └── user/                     # User data APIs
├── public/                       # Static assets
│   ├── index.html               # Main page
│   ├── styles.css               # Styles
│   └── app.js                   # Frontend logic
├── vercel.json                   # Vercel configuration
├── package.json                  # Dependencies
├── implementation_log.txt        # Development logs
└── PHASE_WISE_IMPLEMENTATION_PLAN.md  # Implementation plan
```

## API Endpoints

### News APIs
- `GET /api/news/business-bites` - Main news feed
- `GET /api/markets` - Available markets
- `GET /api/sectors` - Available sectors
- `GET /api/search-similar` - Text search

### User APIs
- `POST /api/user/read-later` - Save bookmark
- `GET /api/user/read-later/:user_id` - Get bookmarks
- `POST /api/watchlists/create` - Create watchlist
- `GET /api/watchlists/:user_id` - Get watchlists

## Contributing

See `PHASE_WISE_IMPLEMENTATION_PLAN.md` for development roadmap and guidelines.

## License

MIT
