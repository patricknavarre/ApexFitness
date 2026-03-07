import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a nutrition expert. Given the user's remaining daily calories and macros (protein, carbs, fat in grams), suggest ONE simple meal or snack that fits within these numbers. When the user specifies a meal type (breakfast, lunch, dinner, or snack), suggest something appropriate for that meal—e.g. breakfast ideas like eggs or oatmeal, lunch like a sandwich or salad, dinner like a protein with sides, snack like fruit or nuts.

Return ONLY valid JSON with no markdown or code fences, in this exact structure:
{
  "foodName": "short description of the meal or snack",
  "estimatedCalories": number,
  "proteinG": number,
  "carbsG": number,
  "fatG": number
}

Keep the suggestion practical and realistic. Numbers must be non-negative and should not exceed the remaining amounts. If remaining is 0 or very low, suggest something minimal (e.g. "Water or black coffee").`;

type SuggestResult = {
  foodName: string;
  estimatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function parseSuggestJson(text: string): SuggestResult | null {
  const cleaned = text.replace(/^```json?\s*|\s*```$/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as SuggestResult;
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
    const {
      remainingCalories,
      remainingProteinG,
      remainingCarbsG,
      remainingFatG,
      mealType,
    } = body as {
      remainingCalories?: number;
      remainingProteinG?: number;
      remainingCarbsG?: number;
      remainingFatG?: number;
      mealType?: string;
    };
    const cal = Math.max(0, Number(remainingCalories) ?? 0);
    const p = Math.max(0, Number(remainingProteinG) ?? 0);
    const c = Math.max(0, Number(remainingCarbsG) ?? 0);
    const f = Math.max(0, Number(remainingFatG) ?? 0);
    const mealLabel = ['breakfast', 'lunch', 'dinner', 'snack', 'snacks'].includes(
      String(mealType).toLowerCase()
    )
      ? String(mealType).toLowerCase().replace('snacks', 'snack')
      : null;

    const userMessage = mealLabel
      ? `Remaining today: ${cal} calories, ${p}g protein, ${c}g carbs, ${f}g fat. Suggest one ${mealLabel} that fits.`
      : `Remaining today: ${cal} calories, ${p}g protein, ${c}g carbs, ${f}g fat. Suggest one meal or snack that fits.`;

    const { text } = await generateText({
      model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      maxTokens: 300,
    });

    const result = parseSuggestJson(text);
    if (!result) {
      return NextResponse.json(
        { error: 'AI returned invalid format', code: 'PARSE_ERROR', raw: text.slice(0, 200) },
        { status: 500 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('Nutrition suggest error:', err.message);
    const isModelOrAuth =
      /model|invalid|unauthorized|api.key|rate.limit/i.test(err.message);
    const userMessage = isModelOrAuth
      ? 'AI service error. Please check your API key and model configuration.'
      : 'Suggestion failed. Please try again.';
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
