import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { connectDB } from '@/lib/mongodb';
import { uploadPhoto } from '@/lib/storage';
import Analysis from '@/models/Analysis';
import ProgressPhoto from '@/models/ProgressPhoto';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert personal trainer and sports nutritionist. Analyze the photo and user context. Return ONLY valid JSON with no markdown or code fences, matching this exact structure. Be specific, encouraging — never use shame or negative language.

{
  "bodyType": "string (e.g. Mesomorph / Ectomorph / Endomorph or combo)",
  "estimatedBodyFatRange": "string (e.g. 15–20%)",
  "visibleStrengths": ["string", "string"],
  "areasToFocus": ["string", "string"],
  "postureObservations": "string or empty string",
  "fitnessLevelEstimate": "string (Beginner/Intermediate/Advanced)",
  "summary": "2–3 sentence personalized encouraging summary",
  "recommendedSplit": "string (e.g. Push/Pull/Legs)",
  "calorieTarget": number,
  "proteinTarget": number,
  "carbTarget": number,
  "fatTarget": number
}`;

type AnalysisResult = {
  bodyType: string;
  estimatedBodyFatRange: string;
  visibleStrengths: string[];
  areasToFocus: string[];
  postureObservations: string;
  fitnessLevelEstimate: string;
  summary: string;
  recommendedSplit: string;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
};

function parseAnalysisJson(text: string): AnalysisResult | null {
  const cleaned = text.replace(/^```json?\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(cleaned) as AnalysisResult;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI not configured', code: 'CONFIG' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { image, userContext, saveToProgress } = body as {
      image: string;
      userContext?: Record<string, unknown>;
      saveToProgress?: boolean;
    };

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Missing image (base64)', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const contextStr = userContext
      ? JSON.stringify(userContext, null, 2)
      : 'No additional context provided.';

    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `User context:\n${contextStr}\n\nAnalyze the attached photo and return the JSON object only.`,
            },
            {
              type: 'image',
              image: base64Data,
              mimeType: 'image/jpeg',
            },
          ],
        },
      ],
      maxTokens: 2000,
    });

    const result = parseAnalysisJson(text);
    if (!result) {
      return NextResponse.json(
        { error: 'AI returned invalid format', code: 'PARSE_ERROR', raw: text.slice(0, 200) },
        { status: 500 }
      );
    }

    let analysisId: string | null = null;
    let photoUrl: string | null = null;
    let thumbUrl: string | null = null;

    if (saveToProgress) {
      const buffer = Buffer.from(base64Data, 'base64');
      const upload = await uploadPhoto(buffer, session.user.id, 'progress');
      await connectDB();

      const analysisDoc = await Analysis.create({
        userId: session.user.id,
        photoUrl: upload.originalUrl,
        s3Key: upload.originalKey,
        bodyType: result.bodyType,
        bodyFatRange: result.estimatedBodyFatRange,
        strengths: result.visibleStrengths,
        focusAreas: result.areasToFocus,
        postureNotes: result.postureObservations,
        fitnessLevelEstimate: result.fitnessLevelEstimate,
        summary: result.summary,
        recommendedSplit: result.recommendedSplit,
        calorieTarget: result.calorieTarget,
        proteinTarget: result.proteinTarget,
        carbTarget: result.carbTarget,
        fatTarget: result.fatTarget,
        rawJson: result,
      });

      await ProgressPhoto.create({
        userId: session.user.id,
        photoUrl: upload.originalUrl,
        s3Key: upload.originalKey,
        thumbnailUrl: upload.thumbUrl,
        thumbnailS3Key: upload.thumbKey,
        analysisId: analysisDoc._id,
        takenAt: new Date(),
      });

      analysisId = analysisDoc._id.toString();
      photoUrl = upload.originalUrl;
      thumbUrl = upload.thumbUrl;
    }

    return NextResponse.json({
      ...result,
      analysisId,
      photoUrl,
      thumbUrl,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('Analyze error:', err.message);
    if (e instanceof Error && e.cause) console.error('Cause:', e.cause);
    const isModelOrAuth =
      /model|invalid|unauthorized|api.key|rate.limit/i.test(err.message);
    const userMessage = isModelOrAuth
      ? 'AI service error. Please check your API key and model configuration.'
      : 'Analysis failed. Please try again.';
    const body: { error: string; code: string; detail?: string } = {
      error: userMessage,
      code: 'SERVER_ERROR',
    };
    if (process.env.NODE_ENV === 'development') {
      body.detail = err.message;
    }
    return NextResponse.json(body, { status: 500 });
  }
}
