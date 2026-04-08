# Lab Manager Mobile + Public Deployment

## What was added

- Capacitor configuration for Android builds
- Render Blueprint for public deployment
- Configurable API base URL for native app builds
- Persistent server data directory support via `LAB_MANAGER_DATA_DIR`

## 1. Deploy the shared server publicly

This project currently stores shared data in a JSON file.
That means the deployment target must support persistent disk storage.

The included `render.yaml` is prepared for Render using:

- a Node web service
- `npm ci && npm run build`
- `npm run start`
- a persistent disk mounted at `/var/data/lab-manager`

Important:

- Render persistent disks require a paid web service.
- Without a persistent disk, your lab data will be lost on redeploy/restart.

### Render steps

1. Push this project to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint from the repository.
3. Review `render.yaml`.
4. Deploy the Blueprint.
5. After deploy finishes, note the public URL, for example:

   `https://your-lab-manager.onrender.com`

6. Open that URL in a browser and confirm the app loads.

## 2. Point the mobile app at the public server

Before building the Capacitor app, set `VITE_API_BASE_URL` to the public server URL.

Example:

```bash
$env:VITE_API_BASE_URL="https://your-lab-manager.onrender.com"
npm run build:android
```

If you prefer, create a local env file based on `.env.example`.

## 3. Create/open the Android project

Once the Android platform is added, use:

```bash
npm run cap:open:android
```

Then build/sign the app from Android Studio.

## 4. Live reload on a phone during development

If your phone and PC are on the same network, you can use live reload:

```bash
$env:CAPACITOR_LIVE_RELOAD_URL="http://192.168.1.43:5173"
npm run cap:sync:android
```

Keep `npm run dev` and `npm run dev:server` running while testing.

## iPhone / iOS note

Capacitor supports iOS, but generating and building the iOS project requires a Mac with Xcode.
