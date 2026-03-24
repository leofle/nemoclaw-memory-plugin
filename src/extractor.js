const preferenceRegex = /\b(i like|i love|i prefer|my favorite|i dislike|i hate)\b/i;
const profileRegex = /\b(i am|i work|i live|my name is|my birthday|my timezone)\b/i;
const projectRegex = /\b(working on|building|project|roadmap|deadline|milestone)\b/i;

export function isMemoryWorthy(text) {
  if (!text || text.trim().length < 12) return false;
  if (/^(ok|thanks|cool|nice|yes|no)[.!]?$/i.test(text.trim())) return false;
  return preferenceRegex.test(text) || profileRegex.test(text) || projectRegex.test(text) || /remember this/i.test(text);
}

export function detectCategory(text) {
  if (preferenceRegex.test(text)) return "preference";
  if (profileRegex.test(text)) return "profile";
  if (projectRegex.test(text)) return "project";
  return "general";
}
