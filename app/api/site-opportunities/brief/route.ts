import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { MARKET_CAPTURE_PHASES } from '@/lib/site-opportunity/capture-phases';

const briefSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  recommendation: z.enum(['strong', 'moderate', 'weak']),
  suggestedNextSteps: z.array(z.string()),
  estimatedRampMonths: z.number(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          'AI brief unavailable: set GOOGLE_GENERATIVE_AI_API_KEY in environment.',
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as {
    mode?: string;
    zone?: Record<string, unknown>;
    dataQuality?: Record<string, unknown>;
    warnings?: string[];
    orgBrandName?: string;
  };

  if (!payload.zone) {
    return Response.json({ error: 'zone is required' }, { status: 400 });
  }

  const orgBrandName =
    typeof payload.orgBrandName === 'string' && payload.orgBrandName.trim()
      ? payload.orgBrandName.trim()
      : 'the organisation';

  try {
    const { object } = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: briefSchema,
      prompt: `You are a retail expansion analyst for ${orgBrandName} (hardware/building supplies) in South Africa.

Analyze this site opportunity using ONLY the structured data below. Do not invent competitor names, counts, or revenue figures not present in the JSON.

Rules:
- Cite specific numbers from the data (client count, competitor count, addressable pool, potential low/high).
- Flag low geocode coverage if competitorCoveragePct is under 95 or warnings array is non-empty.
- Note that 5km radius is not drive time and overlapping catchments double-count nationally.
- Use the market capture phases for estimatedRampMonths (when high potential might be partially realised).
- recommendation: strong = high pool + demand with manageable competition; weak = thin pool or heavy cannibalization risk; moderate otherwise.

Mode: ${payload.mode ?? 'unknown'}

Zone data:
${JSON.stringify(payload.zone, null, 2)}

Data quality:
${JSON.stringify(payload.dataQuality ?? {}, null, 2)}

Warnings:
${JSON.stringify(payload.warnings ?? [], null, 2)}

Market capture phases:
${JSON.stringify(MARKET_CAPTURE_PHASES, null, 2)}`,
    });

    return Response.json(object);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
