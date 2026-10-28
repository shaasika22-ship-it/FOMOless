# FOMOless — Hackathon Finder

A responsive hackathon discovery app using the supplied event data and API.

## Run locally

1. Install Node.js if it is not already available.
2. In this folder, run `npm install` once.
3. Run `npm start`.
4. Open http://localhost:5000.

## Deploy

The root `render.yaml` defines a public Render web service. Push this repository to GitHub and create a Render Blueprint from the file. Render runs the Node API and serves the frontend from the same origin.

The root `index.html` and `data.json` also support GitHub Pages: if Pages is enabled for the repository, the frontend can load the checked-in event data directly when the API is unavailable. The Pages version filters in the browser; the Render version uses the API for place, start date, and start time.

## Event details and registration

Select **Register** on a card to see the event’s details in FOMOless first. The detail view shows the available date, start time, format, prize pool, focus areas, and place. **Continue to organizer** opens the registration URL supplied with that event in a new tab. The organizer page is the source for eligibility, venue specifics, deadlines, and latest updates.

End date, format, keyword, and sorting are handled in the frontend.

