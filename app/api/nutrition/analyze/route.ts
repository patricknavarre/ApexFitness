import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a nutrition expert. Analyze this food photo and list each distinct food item separately with estimated nutrition.

Return ONLY valid JSON with no markdown or code fences. Use this exact structure:
{
  "items": [
    { "foodName": "short name", "estimatedCalories": number, "proteinG": number, "carbsG": number, "fatG": number },
    ...
  ]
}

List each visible food item separately (e.g. scrambled eggs, bacon, baked beans, toast, tomatoes). Do not combine into one "meal" entry. Each item gets its own object with foodName, estimatedCalories, proteinG, carbsG, fatG. All numbers must be non-negative.`;

export type FoodItem = {
  foodName: string;
  estimatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function normalizeItem(raw: unknown): FoodItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.foodName !== 'string') return null;
  return {
    foodName: o.foodName,
    estimatedCalories: Math.max(0, Number(o.estimatedCalories) || 0),
    proteinG: Math.max(0, Number(o.proteinG) || 0),
    carbsG: Math.max(0, Number(o.carbsG) || 0),
    fatG: Math.max(0, Number(o.fatG) || 0),
  };
}

function parseFoodJson(text: string): FoodItem[] | null {
  const cleaned = text.replace(/^```json?\s*|\s*```$/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    let arr: unknown[];
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown[] }).items)) {
      arr = (parsed as { items: unknown[] }).items;
    } else if (parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).foodName === 'string') {
      const one = normalizeItem(parsed);
      return one ? [one] : null;
    } else {
      return null;
    }
    const items: FoodItem[] = [];
    for (const entry of arr) {
      const item = normalizeItem(entry);
      if (item) items.push(item);
    }
    return items.length > 0 ? items : null;
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
      maxTokens: 1000,
    });

    const items = parseFoodJson(text);
    if (!items) {
      return NextResponse.json(
        { error: 'AI returned invalid format', code: 'PARSE_ERROR', raw: text.slice(0, 200) },
        { status: 500 }
      );
    }

    return NextResponse.json({ items });
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
