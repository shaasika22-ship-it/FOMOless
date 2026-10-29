# FOMOless — Hackathon Finder

A responsive hackathon finder with event filters, registration details, an AI idea coach, and a private team view of submissions.

## Run locally

1. Install Node.js if needed.
2. In this folder, run `npm install` and `npm start`.
3. Set `OPENAI_API_KEY` and `ADMIN_TOKEN` in your local environment before using the idea coach.
4. Open http://localhost:5000. Submissions are written to `storage/ideas.jsonl` unless `FOMOLESS_DATA_DIR` points elsewhere.
5. Open http://localhost:5000/admin.html and enter the same `ADMIN_TOKEN` to review or download submissions.

Do not commit a real API key or admin token. `.env.example` shows the supported settings; `.gitignore` excludes local secrets and collected submissions.

## Idea coach and submission data

The idea coach accepts typed or browser-dictated ideas. A user must check the data notice before sending. The notice explains that the idea and selected filters are sent to the AI provider and saved for the FOMOless team. Do not ask users to enter personal or sensitive information. Submissions do not collect names, email addresses, or IP addresses.

The AI gives a balanced assessment, practical improvements, a first prototype suggestion, and recommendations from the supplied hackathon catalog. AI requests use the OpenAI Responses API. The owner must set `OPENAI_API_KEY`; `OPENAI_MODEL` can override the default model. API usage is billed by OpenAI based on model and token usage.

Set a long, random `ADMIN_TOKEN` in the hosting environment. The team page at `/admin.html` sends this token in an authorization header and holds it only for the current browser tab. Never expose this token in frontend code or the public repository.

## Production storage requirement

Render's default filesystem is temporary. The app refuses idea submissions in production until `FOMOLESS_DATA_DIR` is set to a persistent storage mount. Configure a mount such as `/var/data`, then set `FOMOLESS_DATA_DIR=/var/data` in the Render service environment. A persistent Render disk requires a paid web service and is billed separately; check the current [Render storage pricing](https://render.com/pricing) before enabling it. See [Render persistent disk documentation](https://render.com/docs/disks) for setup and limitations.

The app code does not provision a disk or change a Render billing plan. Without persistent storage, visitors can still browse and filter events, but idea submission is disabled in production to avoid telling users their ideas were saved when Render could discard them on restart or redeploy.

## Deploy

The root `render.yaml` defines the Node web service. Connect this repository to Render and configure `OPENAI_API_KEY`, `ADMIN_TOKEN`, and `FOMOLESS_DATA_DIR` in the service environment. Add persistent storage at the configured mount path. The app serves both the website and the `/api` endpoints from the same service.

GitHub Pages can host the static event finder with its checked-in event data, but it cannot run the Node API, persist submissions, or provide AI feedback. Use the Render service URL for those features.

## Event registration

Selecting **Register** opens a FOMOless detail view first. **Continue to organizer** opens the event's registration URL in a new tab. The organizer page is the source for eligibility, venue details, deadlines, and updates.

