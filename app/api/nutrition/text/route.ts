import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getAnthropicModelId } from '@/lib/anthropic-model';
import { parseFoodJson } from '@/lib/nutrition-food-parse';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_DESCRIPTION_LENGTH = 500;

const SYSTEM_PROMPT = `You are a nutrition expert. Given a natural-language food description, estimate nutrition for each distinct food item.

Interpret portions, quantities, and brands when provided (e.g. "2 scrambled eggs", "large banana", "Quest bar"). Use reasonable standard serving sizes when the user is vague.

Return ONLY valid JSON with no markdown or code fences. Use this exact structure:
{
  "items": [
    { "foodName": "short name", "estimatedCalories": number, "proteinG": number, "carbsG": number, "fatG": number },
    ...
  ]
}

Split multi-item descriptions into separate items (e.g. "eggs and toast with butter" → eggs, toast, butter). Do not combine into one "meal" entry. Each item gets its own object with foodName, estimatedCalories, proteinG, carbsG, fatG. All numbers must be non-negative.`;

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
    const rawDescription = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!rawDescription) {
      return NextResponse.json(
        { error: 'Missing food description', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }
    if (rawDescription.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        {
          error: `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`,
          code: 'BAD_REQUEST',
        },
        { status: 400 }
      );
    }

    const { text } = await generateText({
      model: anthropic(getAnthropicModelId()),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Estimate nutrition for: ${rawDescription}\n\nReturn the JSON object only.`,
        },
      ],
      maxTokens: 800,
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
    console.error('Nutrition text lookup error:', err.message);
    if (e instanceof Error && e.cause) console.error('Cause:', e.cause);
    const isModelOrAuth =
      /model|invalid|unauthorized|api.key|rate.limit/i.test(err.message);
    const userMessage = isModelOrAuth
      ? 'AI service error. Please check your API key and model configuration.'
      : 'Food lookup failed. Please try again.';
    const resBody: { error: string; code: string; detail?: string } = {
      error: userMessage,
      code: 'SERVER_ERROR',
    };
    if (process.env.NODE_ENV === 'development') {
      resBody.detail = err.message;
    } else if (isModelOrAuth) {
      resBody.detail = `Model: ${getAnthropicModelId()}`;
    }
    return NextResponse.json(resBody, { status: 500 });
  }
}
