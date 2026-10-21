# Piece Together

Piece Together is a multiplayer puzzle app for playing with friends in a shared room. Players can cooperate on one board or compete on separate boards.

## Games

- **Jigsaw:** Assemble an image together in real time.
- **Sudoku:** Solve the same puzzle cooperatively or race on matching boards.
- **Minesweeper:** Reveal one shared board together or compete on separate boards.

The Sudoku and Minesweeper interfaces support touch screens as well as desktop input. Room links are private and excluded from search indexing.

## Run locally

Install dependencies:

```bash
npm install
```

Start the Next.js app and the Socket.IO server in separate terminals:

```bash
npm run dev
```

```bash
npm run server
```

Open [http://localhost:3000](http://localhost:3000). The realtime server defaults to port `4000`.

## Environment

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_SOCKET_URL`: URL of the Socket.IO server used by the browser.
- `CLIENT_ORIGIN`: comma-separated frontend origins allowed by the server.
- `NEXT_PUBLIC_SITE_URL`: public canonical frontend URL used for metadata, sitemap, and social previews. Set it before building for production.
- `PORT`: backend port, if the host does not provide one.
- `DB_DIR` / `DB_PATH`: optional SQLite storage location; use persistent storage in production.

If `NEXT_PUBLIC_SITE_URL` is unset, no public URLs are added to the sitemap. Configure it for production so search engines and social platforms receive the correct site URL.

## Production

Build and run the frontend with:

```bash
npm run build
npm run start
```

Run `npm run server` as a separate, always-on service and set `NEXT_PUBLIC_SOCKET_URL` to its public URL and `CLIENT_ORIGIN` to the frontend origin. Socket.IO heartbeat and client reconnection help recover transient disconnects, but cannot prevent a hosting provider from sleeping the server.

The server persists room metadata to SQLite. In-progress Sudoku and Minesweeper board data is held in memory, so a server restart returns those rooms to the lobby.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```
