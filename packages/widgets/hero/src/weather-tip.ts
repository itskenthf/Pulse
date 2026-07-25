const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]);
const FOG_CODES = new Set([45, 48]);
const SNOW_CODES = new Set([71, 73, 75]);
const CLEAR_CODES = new Set([0, 1]);

/**
 * Deterministic, rule-based — no LLM call, no external cost (Ken's
 * explicit preference over an "AI assistant" hero). One `weatherCode` in,
 * one short suggestion out; falls back to no tip when nothing's
 * actionable, rather than forcing a generic line onto every render.
 */
export function weatherTip(weatherCode: number, temperatureC: number): string | null {
  if (RAIN_CODES.has(weatherCode)) return "Take an umbrella.";
  if (FOG_CODES.has(weatherCode)) return "Drive carefully — foggy out there.";
  if (SNOW_CODES.has(weatherCode)) return "Bundle up, it's snowing.";
  if (CLEAR_CODES.has(weatherCode) && temperatureC >= 30) return "Stay hydrated out there.";
  return null;
}
