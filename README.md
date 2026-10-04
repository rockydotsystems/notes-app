# Little Notes

A cheerful notes app built with React, Hono, and SQLite. Notes live in `data/notes.sqlite` on the server. The first run seeds a few example notes.

## Run it

Install [Node.js](https://nodejs.org/) and dependencies:

```sh
npm install
```

In one terminal, start the Hono API and SQLite database:

```sh
npm run dev:server
```

In another terminal, start the React app:

```sh
npm run dev
```

Open the Vite URL it prints (usually `http://localhost:5173`). The dev server forwards `/api` requests to Hono on port 3000.

For a single production server, run `npm run build` and then `npm start`. Hono serves the built app and API together at `http://localhost:3000`. Set `PORT` to change the server port. The SQLite database file is created automatically and is ignored by Git.

Use **New note** to add a note. Click a note to edit it, pin it to keep it at the top, or search across titles and text. Deleting a note asks for confirmation.
