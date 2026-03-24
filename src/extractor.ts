const preferenceRegex = /\b(i like|i love|i prefer|my favorite|i dislike|i hate|i enjoy|i avoid|i always|i never use|i usually)\b/i;
const profileRegex = /\b(i am|i work|i live|my name is|my birthday|my timezone|i'm a|i have been|my role|i studied|i went to|i grew up)\b/i;
const projectRegex = /\b(working on|building|project|roadmap|deadline|milestone|launching|shipping|release|sprint|backlog|feature)\b/i;
const explicitMemoryRegex = /\b(remember (this|that|me)|important:|note that|keep in mind|don'?t forget|key point|take note)/i;

// Single-word/short trivial responses to skip
const trivialPattern = /^(ok|okay|thanks|thank you|cool|nice|yes|no|sure|got it|sounds good|perfect|great|alright|right)[.!?]?$/i;

export function isMemoryWorthy(text: string): boolean {
  if (!text || text.trim().length < 12) return false;
  if (trivialPattern.test(text.trim())) return false;
  return (
    preferenceRegex.test(text) ||
    profileRegex.test(text) ||
    projectRegex.test(text) ||
    explicitMemoryRegex.test(text)
  );
}

export function detectCategory(text: string): string {
  if (explicitMemoryRegex.test(text)) {
    // Explicit memory requests: sub-classify if possible, else general
    if (preferenceRegex.test(text)) return 'preference';
    if (profileRegex.test(text)) return 'profile';
    if (projectRegex.test(text)) return 'project';
    return 'general';
  }
  if (preferenceRegex.test(text)) return 'preference';
  if (profileRegex.test(text)) return 'profile';
  if (projectRegex.test(text)) return 'project';
  return 'general';
}
