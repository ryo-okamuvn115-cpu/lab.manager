# Lab Manager Setup

This rebuilt version uses:

- `Vite` for the web client
- `node server/lab-server.js` for the shared backend
- `server/data/lab-data.json` as the shared data file

## 1. Install Node.js

Install Node.js 20 or later.

## 2. Install dependencies

```bash
npm install
```

## 3. Run in development

Terminal 1:

```bash
npm run dev:server
```

Terminal 2:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## 4. Run for shared lab use

Build the frontend first:

```bash
npm run build
```

Then start the shared server:

```bash
npm run start
```

Open from other devices on the same network:

```text
http://<server-ip>:3000
```

## Notes

- All users connected to the same server share the same data.
- Changes are stored in `server/data/lab-data.json`.
- The client listens for server-side change events and also refreshes on focus.
