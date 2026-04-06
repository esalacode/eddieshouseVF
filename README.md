# My House / Reviews

Mobile-first Netlify-ready Letterboxd house.

## What changed
- Rebuilt for mobile first.
- No FPS controls required.
- Tap left/right to turn.
- Tap forward to move between rooms.
- Swipe left/right on the scene to turn.
- Swipe up on the scene to move forward.
- Tap plaques on walls to open full reviews.
- Live reviews still load from the Netlify function.

## Deploy
Upload the contents of this folder to a GitHub repo, then connect that repo to Netlify.

Settings:
- Build command: leave blank
- Publish directory: `.`
- Functions directory: handled by `netlify.toml`

## Future reviews
The deployed site requests live data from Letterboxd through the Netlify function on each load.
New public reviews should appear automatically without rebuilding.

## Fallbacks
If live fetch fails, the site falls back to:
1. cached live reviews from a previous successful load
2. `reviews.json`
