# App Ads & Policies Template

A Next.js application that serves app-ads.txt and privacy policies content from external URLs with hourly caching.

## Features

- **/app-ads.txt** - Serves app-ads.txt content from a configured URL
- **/policies** - Serves privacy policy content from a configured URL  
- **Automatic caching** - Content is cached for 1 hour to reduce load on source URLs
- **Error handling** - Gracefully handles fetch errors and serves cached content when available

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your URLs:
   ```
   APP_ADS_URL=https://your-app-ads-url.com
   POLICIES_URL=https://sites.google.com/view/your-privacy-policy/home
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to see the app

## Deployment to Vercel

1. Push your code to a GitHub repository

2. Go to [Vercel](https://vercel.com) and import your repository

3. Configure environment variables in Vercel:
   - `APP_ADS_URL` - URL for app-ads.txt content
   - `POLICIES_URL` - URL for privacy policy content

4. Deploy!

## How it Works

The application fetches content from the configured URLs and caches it for 1 hour. When a request comes in:

1. Check if cached data exists and is less than 1 hour old
2. If cache is valid, return cached data
3. If cache is expired or doesn't exist, fetch fresh data from the URL
4. Cache the new data and return it
5. If fetch fails but cached data exists, return the stale cache

## API Routes

- `GET /app-ads.txt` - Returns plain text app-ads content
- `GET /policies` - Returns HTML privacy policy content

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ADS_URL` | URL to fetch app-ads.txt content from | `https://example.com/app-ads.txt` |
| `POLICIES_URL` | URL to fetch privacy policy content from | `https://example.com/privacy` |

## Development

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run linter
```
