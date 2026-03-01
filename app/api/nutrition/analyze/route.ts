import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a nutrition expert. Analyze this food photo and estimate the meal's nutrition. Return ONLY valid JSON with no markdown or code fences, in this exact structure:
{
  "foodName": "string (short description of the food/meal)",
  "estimatedCalories": number,
  "proteinG": number,
  "carbsG": number,
  "fatG": number
}
Be reasonable with estimates. If the photo shows multiple items, estimate for the whole plate/meal. Numbers should be non-negative.`;

type FoodAnalysisResult = {
  foodName: string;
  estimatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function parseFoodJson(text: string): FoodAnalysisResult | null {
  const cleaned = text.replace(/^```json?\s*|\s*```$/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as FoodAnalysisResult;
    if (typeof parsed.foodName !== 'string') return null;
    return {
      foodName: parsed.foodName,
      estimatedCalories: Math.max(0, Number(parsed.estimatedCalories) || 0),
      proteinG: Math.max(0, Number(parsed.proteinG) || 0),
      carbsG: Math.max(0, Number(parsed.carbsG) || 0),
      fatG: Math.max(0, Number(parsed.fatG) || 0),
    };
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
    const { image } = body as { image: string };

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Missing image (base64)', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const { text } = await generateText({
      model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this food photo and return the JSON object only.' },
            {
              type: 'image',
              image: base64Data,
              mimeType: 'image/jpeg',
            },
          ],
        },
      ],
      maxTokens: 500,
    });

    const result = parseFoodJson(text);
    if (!result) {
      return NextResponse.json(
        { error: 'AI returned invalid format', code: 'PARSE_ERROR', raw: text.slice(0, 200) },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('Nutrition analyze error:', err.message);
    const isModelOrAuth =
      /model|invalid|unauthorized|api.key|rate.limit/i.test(err.message);
    const userMessage = isModelOrAuth
      ? 'AI service error. Please check your API key and model configuration.'
      : 'Food analysis failed. Please try again.';
    const resBody: { error: string; code: string; detail?: string } = {
      error: userMessage,
      code: 'SERVER_ERROR',
    };
    if (process.env.NODE_ENV === 'development') {
      resBody.detail = err.message;
    }
    return NextResponse.json(resBody, { status: 500 });
  }
}
