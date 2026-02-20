# APEX — AI Fitness Tracker: Cursor Agent Build Prompt

## Project Overview

Build a full-stack AI-powered fitness tracker web app called **APEX** using **Next.js (App Router)**. The app allows users to upload a photo of themselves, get an AI-powered body analysis, and receive a personalized workout plan and nutrition guidance. It also includes workout scheduling and progress photo tracking over time.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + custom CSS variables for theming
- **AI**: Anthropic Claude API (`claude-sonnet-4-5`) — vision + text, via Vercel AI SDK
- **Database**: MongoDB Atlas (via Mongoose ODM)
- **Auth**: NextAuth.js v5 (email/password + Google OAuth)
- **File Storage**: AWS S3 (private bucket) + CloudFront CDN (photo delivery)
- **Image Processing**: `sharp` (server-side resize/compress before S3 upload)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts (for progress visualization)
- **Fonts**: Bebas Neue (display), DM Sans (body), Space Mono (data/stats)

---

## Design System

### Vibe
Sleek, dark, premium — like a high-end gym app. Think Nike Training Club meets a Bloomberg terminal. Every screen should feel like it was designed for serious athletes but is accessible to everyone.

### Color Palette (CSS Variables)
```css
:root {
  --bg: #0a0a0f;
  --bg2: #111118;
  --bg3: #18181f;
  --card: #13131a;
  --border: rgba(255, 255, 255, 0.07);
  --accent: #e8ff47;        /* electric lime — primary CTA */
  --accent2: #ff4757;       /* red — alerts, calories, warnings */
  --accent3: #00d2ff;       /* cyan — progress, hydration, streaks */
  --text: #f0f0f5;
  --muted: #6b6b7a;
}
```

### Typography
- `font-family: 'Bebas Neue'` — section headers, stat numbers, hero text
- `font-family: 'DM Sans'` — body copy, labels, descriptions
- `font-family: 'Space Mono'` — data readouts, weights, reps, calories

### General UI Rules
- Dark backgrounds only. No white backgrounds anywhere.
- Subtle noise texture overlay on the body (use SVG feTurbulence).
- Cards use `var(--card)` background with `1px solid var(--border)` borders and `border-radius: 12px`.
- Primary buttons: `background: var(--accent)`, `color: #000`, bold, uppercase.
- Hover states should have subtle glow effects using `box-shadow`.
- Use thin horizontal/vertical lines as decorative dividers.
- Micro-animations on mount (fade + translateY), hover states on interactive elements.

---

## App Structure

```
/app
  /page.tsx                       ← Landing / marketing page
  /auth
    /login/page.tsx
    /signup/page.tsx
  /(dashboard)
    /layout.tsx                   ← Sidebar + top nav shell
    /dashboard/page.tsx           ← Home dashboard
    /analysis/page.tsx            ← Photo upload + AI body analysis
    /workouts/page.tsx            ← Workout planner & scheduler
    /nutrition/page.tsx           ← Nutrition tracker
    /progress/page.tsx            ← Progress photo timeline
    /settings/page.tsx            ← User profile & preferences
/components
  /ui                             ← Reusable UI primitives
  /dashboard                      ← Dashboard-specific components
  /analysis                       ← Analysis-specific components
  /workouts                       ← Workout components
  /nutrition                      ← Nutrition components
  /progress                       ← Progress photo components
/lib
  /mongodb.ts                     ← MongoDB connection singleton
  /s3.ts                          ← AWS S3 + CloudFront helpers
  /anthropic.ts                   ← Anthropic client + helper functions
  /auth.ts                        ← NextAuth config
  /utils.ts
/models
  /User.ts
  /Analysis.ts
  /WorkoutPlan.ts
  /ScheduledWorkout.ts
  /WorkoutLog.ts
  /NutritionLog.ts
  /ProgressPhoto.ts
/app/api
  /auth/[...nextauth]/route.ts    ← NextAuth handler
  /analyze/route.ts               ← Claude vision body analysis
  /workout-plan/route.ts          ← Claude workout plan generation
  /nutrition-plan/route.ts        ← Claude nutrition plan generation
  /upload/route.ts                ← S3 photo upload handler
  /user/route.ts                  ← User profile CRUD
  /workouts/route.ts              ← Workout CRUD
  /nutrition/route.ts             ← Nutrition log CRUD
  /progress/route.ts              ← Progress photo CRUD
```

---

## Pages & Features

### 1. Landing Page (`/`)
- Full-screen hero with the APEX wordmark in Bebas Neue
- Tagline: *"Your body. Your data. Your potential."*
- Animated background: subtle particle or grid effect
- Three feature callouts: AI Analysis / Smart Planning / Track Progress
- CTA: "Start for Free" → `/auth/signup`

---

### 2. Auth Pages (`/auth/login`, `/auth/signup`)
- Minimal, centered card on dark background
- Email/password fields + Google OAuth button (via NextAuth)
- On signup: collect Name, Age, Biological Sex, Height, Weight, Primary Goal (lose weight / build muscle / improve endurance / general fitness)
- After signup, create a MongoDB `User` document with profile fields

---

### 3. Dashboard (`/dashboard`)
This is the main home screen after login.

**Layout**: Left sidebar (72px collapsed, 240px expanded on hover) + main content area.

**Sidebar nav items** (icon + label):
- Dashboard (home icon)
- AI Analysis (camera/scan icon)
- Workouts (dumbbell icon)
- Nutrition (leaf/fork icon)
- Progress (chart icon)
- Settings (gear icon)

**Dashboard widgets**:
- **Today's Workout Card** — Shows today's scheduled workout with a "Start" button
- **Weekly Ring / Streak** — Visual ring showing workouts completed this week (goal: 5)
- **Calories Summary** — Donut chart: consumed vs. target
- **AI Insight Card** — A short motivational or analytical insight generated by Claude based on recent activity (refresh daily)
- **Progress Photo Thumbnail** — Latest uploaded photo vs. first uploaded photo side by side
- **Macros Bar** — Horizontal bar: Protein / Carbs / Fat progress today
- **Upcoming Schedule** — Next 3 workout sessions listed

---

### 4. AI Body Analysis Page (`/analysis`)

This is the core differentiating feature.

**Step 1 — Photo Upload**
- Large upload zone with dashed border: "Take or upload a photo"
- Support camera capture on mobile (`accept="image/*" capture="user"`)
- Support file upload on desktop
- Preview the uploaded image before submitting
- Privacy disclaimer: *"Your photo is analyzed in real-time and never stored unless you choose to save it to your Progress timeline."*

**Step 2 — User Context Form** (shown alongside preview)
Collect:
- Current goal (dropdown: lose fat / build muscle / maintain / improve performance)
- Fitness level (beginner / intermediate / advanced)
- Available equipment (none/bodyweight / dumbbells / full gym / home gym)
- Days per week available to train (1–7 slider)
- Any injuries or limitations (text field, optional)

**Step 3 — AI Analysis (streaming)**
On submit, call `/api/analyze` with the image (base64) + user context.

Claude prompt should analyze and return structured JSON with:
```json
{
  "bodyType": "Mesomorph / Ectomorph / Endomorph or combo",
  "estimatedBodyFatRange": "15–20%",
  "visibleStrengths": ["Strong shoulders", "Good leg development"],
  "areasToFocus": ["Core definition", "Upper chest"],
  "postureObservations": "Slight forward head posture noted",
  "fitnessLevelEstimate": "Intermediate",
  "summary": "2–3 sentence personalized summary",
  "recommendedSplit": "Push/Pull/Legs",
  "calorieTarget": 2400,
  "proteinTarget": 180,
  "carbTarget": 240,
  "fatTarget": 80
}
```

Display analysis results as a beautiful "report card" style UI:
- Body type badge
- Stat grid (body fat estimate, calorie target, macros)
- Strengths vs. Focus Areas as two columns with icons
- Posture note
- Recommended workout split badge

**CTA buttons after analysis**:
- "Generate My Workout Plan" → pre-fills `/workouts` planner
- "Set My Nutrition Goals" → pre-fills `/nutrition`
- "Save to Progress Timeline" → uploads photo to S3, saves analysis + CloudFront URL to MongoDB

---

### 5. Workout Planner (`/workouts`)

**Two sub-tabs**: Plan Builder | Schedule

**Plan Builder**:
- If AI analysis was done, show a pre-generated plan
- Otherwise show a manual plan builder
- Workout split selector: Full Body / Upper-Lower / PPL / Bro Split / Custom
- Day-by-day view with exercise cards
- Each exercise card shows: name, sets × reps, rest time, muscle group tag, optional YouTube link icon
- "Regenerate with AI" button calls `/api/workout-plan` with user profile

**Schedule**:
- Weekly calendar view (Mon–Sun)
- Drag-and-drop workout sessions onto days
- Each day shows: workout name, estimated duration, muscle groups targeted
- "Log Workout" button on each scheduled session — opens a modal to log sets/reps/weight completed
- Completed sessions get a checkmark + green accent

**Workout Logging Modal**:
- Table of exercises with input fields for sets, reps, weight
- Notes field
- Save → stores to MongoDB `workoutLogs` collection

---

### 6. Nutrition Tracker (`/nutrition`)

**Daily Log**:
- Date picker (defaults to today)
- Meal sections: Breakfast / Lunch / Dinner / Snacks
- Add food items to each meal (name + calories + macros)
- Running daily totals shown at top: Calories / Protein / Carbs / Fat vs. targets

**Targets Bar**:
- If AI analysis was done, targets are pre-set from analysis
- Otherwise user sets manually in Settings
- Visual progress bars for each macro

**AI Meal Suggestion**:
- Button: "Suggest a meal to hit my remaining macros"
- Calls Claude API with remaining macro budget
- Returns 2–3 meal suggestions with estimated macros

**Weekly Summary**:
- Recharts line chart showing daily calorie intake over past 7 days vs. target
- Average protein / carbs / fat for the week

---

### 7. Progress Tracker (`/progress`)

**Photo Timeline**:
- Grid of all uploaded progress photos, sorted by date
- Each photo card: thumbnail (served via CloudFront), date, weight at time of upload
- Click to expand full size

**Comparison View**:
- Side-by-side slider: pick two dates to compare photos
- Overlay toggle: show AI analysis tags on each photo

**Stats Over Time**:
- Line charts (Recharts) for body weight, estimated body fat %, weekly workout volume, weekly calorie average

**Milestone Cards**:
- Auto-generated milestones: "First workout logged", "30-day streak", "Lost 5 lbs", etc.

---

### 8. Settings (`/settings`)
- Profile info (name, age, sex, height, weight — editable)
- Goal & fitness level
- Units (imperial / metric)
- Delete account / data

---

## MongoDB Schema (Mongoose Models)

### `User` (`/models/User.ts`)
```ts
const UserSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: String,           // null if Google OAuth user
  googleId: String,
  age: Number,
  sex: String,
  heightCm: Number,
  weightKg: Number,
  goal: String,
  fitnessLevel: String,
  equipment: String,
  daysPerWeek: Number,
  calorieTarget: Number,
  proteinTarget: Number,
  carbTarget: Number,
  fatTarget: Number,
  units: { type: String, default: 'imperial' },
  createdAt: { type: Date, default: Date.now },
});
```

### `Analysis` (`/models/Analysis.ts`)
```ts
const AnalysisSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  photoUrl: String,               // CloudFront URL (null if not saved)
  s3Key: String,
  bodyType: String,
  bodyFatRange: String,
  strengths: [String],
  focusAreas: [String],
  postureNotes: String,
  fitnessLevelEstimate: String,
  summary: String,
  recommendedSplit: String,
  calorieTarget: Number,
  proteinTarget: Number,
  carbTarget: Number,
  fatTarget: Number,
  rawJson: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});
```

### `WorkoutPlan` (`/models/WorkoutPlan.ts`)
```ts
const WorkoutPlanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: String,
  split: String,
  isActive: { type: Boolean, default: true },
  days: [{
    day: String,
    focus: String,
    exercises: [{
      name: String,
      sets: Number,
      reps: String,
      rest: String,
      muscleGroup: String,
    }],
  }],
  createdAt: { type: Date, default: Date.now },
});
```

### `ScheduledWorkout` (`/models/ScheduledWorkout.ts`)
```ts
const ScheduledWorkoutSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'WorkoutPlan' },
  scheduledDate: { type: Date, index: true },
  dayName: String,
  focus: String,
  exercises: [{ name: String, sets: Number, reps: String, rest: String, muscleGroup: String }],
  completed: { type: Boolean, default: false },
  completedAt: Date,
});
// Compound index:
ScheduledWorkoutSchema.index({ userId: 1, scheduledDate: 1 });
```

### `WorkoutLog` (`/models/WorkoutLog.ts`)
```ts
const WorkoutLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduledWorkoutId: { type: Schema.Types.ObjectId, ref: 'ScheduledWorkout' },
  loggedAt: { type: Date, default: Date.now },
  durationMinutes: Number,
  notes: String,
  exercisesCompleted: [{
    name: String,
    sets: [{ reps: Number, weightKg: Number }],
  }],
});
```

### `NutritionLog` (`/models/NutritionLog.ts`)
```ts
const NutritionLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  logDate: { type: Date, index: true },
  meal: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'] },
  foodName: String,
  calories: Number,
  proteinG: Number,
  carbsG: Number,
  fatG: Number,
  createdAt: { type: Date, default: Date.now },
});
// Compound index:
NutritionLogSchema.index({ userId: 1, logDate: -1 });
```

### `ProgressPhoto` (`/models/ProgressPhoto.ts`)
```ts
const ProgressPhotoSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  photoUrl: String,               // CloudFront URL — full size
  s3Key: String,
  thumbnailUrl: String,           // CloudFront URL — resized thumbnail
  thumbnailS3Key: String,
  weightKg: Number,
  notes: String,
  analysisId: { type: Schema.Types.ObjectId, ref: 'Analysis' },
  takenAt: Date,
  createdAt: { type: Date, default: Date.now },
});
```

---

## AWS S3 + CloudFront Setup

### S3 Bucket Configuration
1. Create a bucket in your preferred region (e.g., `us-east-1`), name it `apex-fitness-photos`
2. **Block all public access** — the bucket must be private
3. Enable **server-side encryption**: SSE-S3 (AES-256)

### S3 Folder Structure
```
apex-fitness-photos/
  users/{userId}/
    analysis/{timestamp}-original.jpg
    progress/{timestamp}-original.jpg
    progress/{timestamp}-thumb.jpg
```

### IAM Policy for the App
Create a dedicated IAM user (`apex-app`) with programmatic access only. Attach this inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3PhotoAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::apex-fitness-photos/users/*"
    }
  ]
}
```

> Scope to `users/*` prefix only — never grant `s3:ListBucket` or root bucket access to the app IAM user.

### CloudFront Distribution
1. Create a CloudFront distribution with the S3 bucket as origin
2. Use **Origin Access Control (OAC)** — not legacy OAI
3. Add the generated bucket policy to your S3 bucket (CloudFront console generates this for you)
4. Set Viewer Protocol Policy: **Redirect HTTP to HTTPS**
5. Cache Policy: **CachingOptimized**
6. Note your CloudFront domain (e.g., `d1abc123.cloudfront.net`) → becomes `CLOUDFRONT_DOMAIN` in env vars

### S3 Helper (`/lib/s3.ts`)
```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const CDN = process.env.CLOUDFRONT_DOMAIN!;

export async function uploadPhoto(
  buffer: Buffer,
  userId: string,
  folder: 'analysis' | 'progress'
) {
  const timestamp = Date.now();
  const originalKey = `users/${userId}/${folder}/${timestamp}-original.jpg`;
  const thumbKey = `users/${userId}/${folder}/${timestamp}-thumb.jpg`;

  const [originalBuffer, thumbBuffer] = await Promise.all([
    sharp(buffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
    sharp(buffer).resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer(),
  ]);

  await Promise.all([
    s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: originalKey, Body: originalBuffer, ContentType: 'image/jpeg' })),
    s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: thumbKey, Body: thumbBuffer, ContentType: 'image/jpeg' })),
  ]);

  return {
    originalUrl: `https://${CDN}/${originalKey}`,
    originalKey,
    thumbUrl: `https://${CDN}/${thumbKey}`,
    thumbKey,
  };
}

export async function deletePhoto(s3Key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
}
```

---

## MongoDB Connection Singleton (`/lib/mongodb.ts`)

```ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');

let cached = (global as any).mongoose ?? { conn: null, promise: null };
(global as any).mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false, dbName: 'apex' });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

> This singleton is critical for Vercel serverless functions — without it, each invocation opens a new connection and exhausts the Atlas connection pool.

---

## NextAuth Configuration (`/lib/auth.ts`)

```ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { connectDB } from './mongodb';
import User from '@/models/User';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        await connectDB();
        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;
        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectDB();
        await User.findOneAndUpdate(
          { email: user.email },
          { $setOnInsert: { name: user.name, email: user.email, googleId: user.id } },
          { upsert: true, new: true }
        );
      }
      return true;
    },
  },
  pages: { signIn: '/auth/login', error: '/auth/login' },
  session: { strategy: 'jwt' },
});
```

---

## API Routes

### `POST /api/analyze`
```ts
export const runtime = 'nodejs';
export const maxDuration = 60;
// 1. Verify session — return 401 if unauthenticated
// 2. Parse multipart form: image buffer + userContext JSON
// 3. Pass image as base64 to Claude via streamText
// 4. If user opts to save: call uploadPhoto() then save Analysis doc to MongoDB
```
System prompt: *"You are an expert personal trainer and sports nutritionist. Analyze the photo and user context. Return ONLY valid JSON matching the specified schema. Be specific, encouraging — never use shame or negative language."*

### `POST /api/workout-plan`
```ts
export const runtime = 'nodejs';
export const maxDuration = 60;
// Accepts: { analysisId, userContext }
// Fetches Analysis from MongoDB, sends to Claude, saves WorkoutPlan doc
```

### `POST /api/nutrition-plan`
```ts
export const runtime = 'nodejs';
export const maxDuration = 60;
// Accepts: { analysisId, userContext }
// Returns macro targets + 3-day sample meal plan, updates User doc
```

### `DELETE /api/progress/:id`
```ts
// Fetch ProgressPhoto doc
// Call deletePhoto() for both s3Key and thumbnailS3Key
// Delete MongoDB doc
```

---

## Vercel AI SDK Streaming Pattern

Use this pattern for all three Claude API routes:

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { messages, systemPrompt } = await req.json();
  const result = await streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: systemPrompt,
    messages,
    maxTokens: 2000,
  });
  return result.toDataStreamResponse();
}
```

---

## Route Protection Middleware (`/middleware.ts`)

```ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtected = req.nextUrl.pathname.match(
    /^\/(dashboard|analysis|workouts|nutrition|progress|settings)/
  );
  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/login', req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Environment Variables

### Local (`.env.local`)
```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=    # generate: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=apex-fitness-photos
CLOUDFRONT_DOMAIN=d1abc123.cloudfront.net   # no https:// prefix

# Anthropic
ANTHROPIC_API_KEY=
```

### Vercel Dashboard
Set all of the above in **Vercel → Project → Settings → Environment Variables**, applied to Production, Preview, and Development environments.

> ⚠️ No `NEXT_PUBLIC_` prefixes needed for any of these — all keys stay server-side only.

---

## Vercel Configuration (`vercel.json`)

```json
{
  "functions": {
    "app/api/analyze/route.ts": { "maxDuration": 60 },
    "app/api/workout-plan/route.ts": { "maxDuration": 60 },
    "app/api/nutrition-plan/route.ts": { "maxDuration": 60 }
  }
}
```

> Default Vercel timeout is 10s on Hobby, 60s on Pro. Use streaming for all Claude calls — streaming bypasses the timeout limit since the connection stays open.

---

## `next.config.js`

```js
/** @type {import('next').NextConfig} */
module.exports = {
  serverExternalPackages: ['sharp', 'mongoose'],
  images: {
    domains: ['d1abc123.cloudfront.net'],   // replace with your CloudFront domain
  },
};
```

---

## Suggested npm Packages

```json
{
  "dependencies": {
    "next": "^14",
    "next-auth": "^5",
    "mongoose": "^8",
    "@aws-sdk/client-s3": "^3",
    "sharp": "^0.33",
    "@anthropic-ai/sdk": "^0.24",
    "ai": "^3",
    "@ai-sdk/anthropic": "^0.0.40",
    "bcryptjs": "^2",
    "recharts": "^2",
    "react-hook-form": "^7",
    "zod": "^3",
    "zustand": "^4",
    "browser-image-compression": "^2",
    "sonner": "^1",
    "date-fns": "^3",
    "@dnd-kit/core": "^6",
    "@dnd-kit/sortable": "^8",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2"
  }
}
```

---

## Key Implementation Notes for Cursor

1. **MongoDB connection**: Always call `await connectDB()` at the top of every API route before any Mongoose query. Use the singleton in `/lib/mongodb.ts` — never call `mongoose.connect()` directly in a route.

2. **Auth in API routes**: Use `const session = await auth()` from NextAuth v5 at the top of every protected API route. Return `401` if no session. Use `session.user.id` as `userId` for all DB queries — never trust a `userId` from the request body.

3. **Image pipeline**: Use `sharp` server-side to generate a 1200px original and 400px thumbnail before uploading both to S3. Store both CloudFront URLs in MongoDB. Serve thumbnails in grids, originals only on expand/compare views.

4. **Streaming AI responses**: All three Claude API routes must use `streamText` from the Vercel AI SDK and return `result.toDataStreamResponse()`. On the client, use the `useChat` or `useCompletion` hooks from the `ai` package to consume the stream.

5. **Optimistic UI**: When logging a workout as complete, update Zustand state immediately before the API call confirms. Roll back on error.

6. **Mobile responsiveness**: Sidebar collapses to a bottom tab bar on mobile (≤768px). All cards should be full-width on mobile.

7. **Photo deletion**: When a user deletes a progress photo, delete both `s3Key` and `thumbnailS3Key` from S3 before removing the MongoDB document.

8. **Error handling**: All API routes return structured `{ error: string, code: string }` JSON on failure. Show toast notifications via `sonner` for success/error states.

9. **Loading states**: Every AI call shows a skeleton loader or animated "thinking" state. Use `suspense` boundaries where appropriate.

10. **First-time user flow**: If a user has no analysis or plan yet, show an onboarding empty state on the dashboard with a clear CTA to start with AI Analysis.

11. **MongoDB Atlas Network Access**: Add `0.0.0.0/0` to Atlas Network Access to allow Vercel's dynamic IPs. For production hardening, use Atlas Private Endpoints instead.

12. **`sharp` on Vercel**: It's included in `serverExternalPackages` in `next.config.js` above — this is required for Vercel to bundle it correctly for the Node.js runtime.

---

## Deployment Checklist

Before going live:
- [ ] All env vars set in Vercel for Production environment
- [ ] `vercel.json` with function timeouts committed to repo
- [ ] `sharp` and `mongoose` in `serverExternalPackages` in `next.config.js`
- [ ] CloudFront domain added to `images.domains` in `next.config.js`
- [ ] S3 bucket is private with OAC-based CloudFront distribution configured
- [ ] IAM user scoped to `users/*` prefix only
- [ ] MongoDB Atlas Network Access open to `0.0.0.0/0` (or Private Endpoint configured)
- [ ] Compound indexes added to `NutritionLog` and `ScheduledWorkout` collections
- [ ] Google OAuth: add Vercel production URL to authorized redirect URIs in Google Cloud Console (`https://yourdomain.com/api/auth/callback/google`)
- [ ] `NEXTAUTH_URL` updated to production domain in Vercel env vars
- [ ] `NEXTAUTH_SECRET` set in Vercel env vars (same value as local)
- [ ] Test full photo upload → AI analysis → save flow on a Preview deployment before merging to main
- [ ] Test photo deletion cleans up both S3 keys

---

## Estimated Monthly Cost (5–10 users)

| Service | Plan | Cost |
|---|---|---|
| Vercel | Pro | $20/mo |
| MongoDB Atlas | M0 Free | $0 |
| AWS S3 + CloudFront | Pay-as-you-go | ~$1–2/mo |
| Anthropic API | Pay-as-you-go | ~$5–10/mo |
| **Total** | | **~$26–32/mo** |

---

*This document is a complete spec for Cursor agent. Recommended build order: MongoDB models → NextAuth → dashboard shell → AI Analysis page (core feature) → Workout planner → Nutrition tracker → Progress timeline → Polish & deploy.*
