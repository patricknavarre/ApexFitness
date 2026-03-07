# Deploying APEX to Vercel

## Environment variables

Add these in **Vercel → Project → Settings → Environment Variables**. Use **Production**, and optionally **Preview** and **Development** if you want different values per environment.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string (Atlas or other) | `mongodb+srv://user:pass@cluster.mongodb.net/...` |
| `NEXTAUTH_URL` | Full URL of your app (must match the deployment) | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Secret for signing cookies (or use `AUTH_SECRET`) | Long random string, e.g. `openssl rand -base64 32` |

### For AI body analysis

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required for Analyze) |
| `ANTHROPIC_MODEL` | (Optional) Override model ID; default is `claude-sonnet-4-20250514` |

### Optional (Google sign-in)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

### Optional (photo storage in production)

The app currently supports **local file storage** only (writes to `.apex-uploads/`). On Vercel the filesystem is read-only, so **“Save to Progress”** (and any photo upload that writes to disk) is disabled in production by default. You will see a clear message if a user tries to save.

- **Analyze without saving** works: users can run AI analysis and see results; only persisting the photo to the Progress timeline is unavailable.
- To enable saving photos on Vercel later, you’d need to add S3 (or similar) and set the corresponding env vars; the codebase is prepared for `AWS_*` and `USE_LOCAL_STORAGE` in `.env` but S3 upload logic is not implemented yet.

---

## Deployment checklist

1. **Set `NEXTAUTH_URL`** to your Vercel URL (e.g. `https://apex-fitness.vercel.app`). Vercel can auto-set this; if you use a custom domain, set it to that.
2. **Generate `NEXTAUTH_SECRET`** (e.g. `openssl rand -base64 32`) and add it as a secret env var.
3. **MongoDB Atlas**: In Atlas → **Network Access** → **Add IP Address** → choose **Allow Access from Anywhere** (`0.0.0.0/0`). Vercel’s IPs change; without this, signup/login will fail with a database connection error.
4. **Build**: The app uses `sharp` and `mongoose`; they are in `serverComponentsExternalPackages` in `next.config.js`. Run `npm run build` locally to confirm it passes.
5. **Photo save on Vercel**: Expect “Save to Progress” to return a friendly error until S3 (or another remote storage) is added.

---

## Troubleshooting

### "Session could not be verified" when opening the app or returning on mobile

The server could not validate your session cookie. Fix it on Vercel:

1. **Vercel** → your project → **Settings** → **Environment Variables**.
2. Add **NEXTAUTH_URL**: set it to your exact app URL, e.g. `https://ness-ecru.vercel.app` (no trailing slash). If Vercel auto-exposes system env vars, turn **off** "Automatically expose System Environment Variables" so your value is used.
3. Add **NEXTAUTH_SECRET**: generate with `openssl rand -base64 32` and paste the value.
4. **Redeploy** (Deployments → … → Redeploy) so the new variables are applied.

After redeploying, sign in again; the session should persist when you navigate away and back.

---

## Quick reference

**Minimum to get running on Vercel:**

- `MONGODB_URI`
- `NEXTAUTH_URL` = your Vercel app URL
- `NEXTAUTH_SECRET`
- `ANTHROPIC_API_KEY` (if you want AI analysis)

After deployment, sign up or log in and use the app; only saving photos to Progress is disabled on Vercel until you add remote storage.
