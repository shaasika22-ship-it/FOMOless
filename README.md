# FOMOless — Hackathon Finder

A responsive hackathon finder with event filters, registration details, and an optional, private record of student search preferences.

## Run locally

1. Install Node.js if needed.
2. In this folder, run `npm install` and `npm start`.
3. Set `ADMIN_TOKEN` in your local environment.
4. Open http://localhost:5000. Shared searches are written to `storage/searches.jsonl` unless `FOMOLESS_DATA_DIR` points elsewhere.
5. Open http://localhost:5000/admin.html and enter the same `ADMIN_TOKEN` to review and download saved searches.

Do not commit a real admin token or collected searches. `.gitignore` excludes local secrets and the `storage/` directory.

## Search preference sharing

Searches are private by default. A visitor must select **Share this search with FOMOless** before submitting the search form. The app then stores only the entered place, date range, and start time. It does not store names, email addresses, IP addresses, keywords, or event format.

The team page at `/admin.html` requires a long, random `ADMIN_TOKEN`. The token is sent in an authorization header and kept only in the current browser tab. Do not place it in frontend code or the public repository.

## Production storage requirement

Render's default filesystem is temporary. The app refuses to record searches in production until `FOMOLESS_DATA_DIR` points to persistent storage. For example, attach a disk mounted at `/var/data` and set `FOMOLESS_DATA_DIR=/var/data` in the Render service environment. A persistent Render disk requires a paid web service and has a separate storage charge. Check [Render pricing](https://render.com/pricing) and [persistent disk documentation](https://render.com/docs/disks) before enabling it.

The app code does not provision storage or change a Render billing plan. Without persistent storage, visitors can still find and filter hackathons, but shared searches are not saved. GitHub Pages can host the static finder but cannot run the API or store search records; use the Render service URL for the team data feature.

## Deploy

The root `render.yaml` defines the Node web service. Set `ADMIN_TOKEN` and `FOMOLESS_DATA_DIR` in Render's service environment, then configure persistent storage at the matching mount path. The app serves the frontend and `/api` endpoints from one service.

## Event registration

Selecting **Register** opens a FOMOless detail view first. **Continue to organizer** opens the event's registration URL in a new tab. The organizer page is the source for eligibility, venue details, deadlines, and updates.

