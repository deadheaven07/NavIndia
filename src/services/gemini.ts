import { GoogleGenAI } from '@google/genai';
import type { RouteOption, RouteLeg, TriggerIncidentPayload } from '../algorithms/types';

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface ParsedCommuteIntent {
  originQuery: string;
  destinationQuery: string;
  maxBudgetInr?: number;
  preference?: 'FASTEST' | 'CHEAPEST' | 'BALANCED' | 'ECO';
  avoidChokepoints?: string[];
  explanation?: string;
}

export async function parseCommuteIntent(
  userPrompt: string,
  availableLandmarks: { id: string; name: string }[]
): Promise<ParsedCommuteIntent | null> {
  if (!ai || !apiKey) {
    console.warn('[Gemini] Missing VITE_GEMINI_API_KEY in environment');
    return fallbackRegexParser(userPrompt, availableLandmarks);
  }

  const landmarkList = availableLandmarks.map((l) => `${l.name} (id: ${l.id})`).join(', ');

  const systemInstruction = `You are NavIndia's AI Geospatial Dispatcher.
Your task is to parse a commuter's natural language routing query in Bengaluru, India.
Given the query and a list of available transit nodes, extract:
1. originQuery: exact landmark name or closest matching node
2. destinationQuery: destination landmark name or closest matching node
3. maxBudgetInr: number if mentioned (e.g. "under 150 rs" -> 150)
4. preference: "FASTEST" | "CHEAPEST" | "BALANCED" | "ECO"
5. avoidChokepoints: array of area names to avoid if mentioned
6. explanation: 1 concise sentence summarizing the route request

Return ONLY valid JSON matching this structure:
{
  "originQuery": string,
  "destinationQuery": string,
  "maxBudgetInr": number | null,
  "preference": "FASTEST" | "CHEAPEST" | "BALANCED" | "ECO",
  "avoidChokepoints": string[],
  "explanation": string
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Available Transit Nodes:\n${landmarkList}\n\nCommuter Query: "${userPrompt}"`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    return {
      originQuery: parsed.originQuery || '',
      destinationQuery: parsed.destinationQuery || '',
      maxBudgetInr: parsed.maxBudgetInr || undefined,
      preference: parsed.preference || 'BALANCED',
      avoidChokepoints: parsed.avoidChokepoints || [],
      explanation: parsed.explanation || '',
    };
  } catch (err) {
    console.error('[Gemini] Error parsing commute intent:', err);
    return fallbackRegexParser(userPrompt, availableLandmarks);
  }
}

export async function generateCopilotAdvice(
  route: RouteOption,
  activeIncident: TriggerIncidentPayload | null,
  isPeakHour: boolean,
  isMonsoonFlooded: boolean
): Promise<string> {
  if (!ai || !apiKey) {
    return generateOfflineAdvice(route, activeIncident, isPeakHour, isMonsoonFlooded);
  }

  const legsSummary = route.legs
    .map(
      (l: RouteLeg) =>
        `- ${l.mode}: ${l.fromNode.name} -> ${l.toNode.name} (${l.durationMinutes.toFixed(1)}m, ₹${l.costINR.toFixed(0)}, ${l.distanceKm.toFixed(1)}km)`
    )
    .join('\n');

  const prompt = `You are the NavIndia Bengaluru Commute Copilot, an elite Staff Transit Advisor.
Analyze this multi-modal journey and give 3 short, punchy, hyper-local bullet points with tactical commute advice.

Journey Details:
- Archetype: ${route.archetype}
- Total Time: ${route.totalDurationMinutes.toFixed(1)} mins
- Total Fare: ₹${route.totalCostINR.toFixed(0)}
- Carbon Emissions: ${(route.co2Grams || 0).toFixed(0)}g CO2
- Peak Hour Active: ${isPeakHour ? 'YES (High Road Gridlock)' : 'NO'}
- Silk Board Incident Active: ${activeIncident ? `YES (${activeIncident.name} - ${activeIncident.severityMultiplier}x penalty)` : 'NO'}
- Monsoon Flood Status: ${isMonsoonFlooded ? 'YES (Ecospace/Bellandur/Silk Board waterlogged)' : 'NO'}

Legs:
${legsSummary}

Provide:
1. 💡 Efficiency & Modal Transition Tip (e.g. platform change at Majestic, interchange walk time)
2. ⚠️ Traffic & Chokepoint Warning (Silk Board, ORR, Hebbal, waterlogging)
3. 💰 Wallet & Comfort Advice (Metro smartcard savings, auto meter bargaining, umbrella/walking tips)

Keep it under 90 words. Format with bold headers and emojis.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.4,
      },
    });

    return response.text?.trim() || generateOfflineAdvice(route, activeIncident, isPeakHour, isMonsoonFlooded);
  } catch (err) {
    console.error('[Gemini] Error generating copilot advice:', err);
    return generateOfflineAdvice(route, activeIncident, isPeakHour, isMonsoonFlooded);
  }
}

// Deterministic offline fallbacks in case API key is missing or device is offline
function fallbackRegexParser(
  prompt: string,
  landmarks: { id: string; name: string }[]
): ParsedCommuteIntent {
  const lower = prompt.toLowerCase();
  let origin = '';
  let dest = '';

  const fromMatch = lower.match(/from\s+([a-z0-9\s]+?)\s+(to|until|for)/i);
  const toMatch = lower.match(/to\s+([a-z0-9\s]+?)(\s+(under|avoiding|with|on|at)|$)/i);

  if (fromMatch) origin = fromMatch[1].trim();
  if (toMatch) dest = toMatch[1].trim();

  // Find best substring match from landmarks if not explicitly extracted
  if (!origin || !dest) {
    for (const lm of landmarks) {
      if (lower.includes(lm.name.toLowerCase())) {
        if (!origin) origin = lm.name;
        else if (!dest) dest = lm.name;
      }
    }
  }

  const budgetMatch = lower.match(/(under|below|max|budget)\s*(?:rs|₹)?\s*(\d+)/i);
  const budget = budgetMatch ? parseInt(budgetMatch[2], 10) : undefined;

  let preference: 'FASTEST' | 'CHEAPEST' | 'BALANCED' | 'ECO' = 'BALANCED';
  if (lower.includes('fast') || lower.includes('quick')) preference = 'FASTEST';
  if (lower.includes('cheap') || lower.includes('budget')) preference = 'CHEAPEST';
  if (lower.includes('eco') || lower.includes('green') || lower.includes('carbon')) preference = 'ECO';

  return {
    originQuery: origin || landmarks[0]?.name || 'Majestic',
    destinationQuery: dest || landmarks[landmarks.length - 1]?.name || 'Whitefield',
    maxBudgetInr: budget,
    preference,
    avoidChokepoints: lower.includes('silk board') ? ['Silk Board'] : [],
    explanation: 'Matched via local heuristic NLP parser.',
  };
}

function generateOfflineAdvice(
  route: RouteOption,
  activeIncident: TriggerIncidentPayload | null,
  isPeakHour: boolean,
  isMonsoonFlooded: boolean
): string {
  const hasMetro = route.legs.some((l: RouteLeg) => l.mode === 'METRO');
  const hasCab = route.legs.some((l: RouteLeg) => l.mode === 'CAB' || l.mode === 'AUTO');

  let advice = '';
  if (isMonsoonFlooded) {
    advice += '🌧️ **Monsoon Alert**: Low-lying underpasses on ORR and Silk Board are severely waterlogged. ';
    advice += hasMetro
      ? 'Elevated Namma Metro lines provide complete immunity from surface flooding.\n'
      : 'Consider switching to a Metro-linked route to avoid stalled road traffic.\n';
  } else if (activeIncident || isPeakHour) {
    advice += '⚡ **Congestion Warning**: Severe surface gridlock detected. ';
    advice += hasMetro
      ? 'Your rail leg bypasses the bottleneck, saving an estimated 25–40 minutes over road cabs.\n'
      : 'High road delays expected; auto-rickshaw fares will face 1.5x surge pricing.\n';
  } else {
    advice += '✅ **Smooth Traffic Corridor**: Nominal traversal speeds across Bengaluru arterial roads.\n';
  }

  if (hasMetro) {
    advice += '🚇 **Transit Tip**: Keep your Namma Metro Smart Card or QR ticket ready at the turnstiles for frictionless platform transfer.';
  } else if (hasCab) {
    advice += '🚖 **Cab Tip**: For autos, ensure meter compliance or book via Namma Yatri to avoid arbitrary peak surcharges.';
  }

  return advice;
}
