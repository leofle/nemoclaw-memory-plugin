const EMBEDDING_SIZE = 64;

export function embedText(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_SIZE).fill(0);
  const normalized = text.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    const idx = code % EMBEDDING_SIZE;
    vec[idx] += ((code % 29) + 1) / 30;
  }
  return normalize(vec);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let an = 0;
  let bn = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    an += a[i] * a[i];
    bn += b[i] * b[i];
  }
  if (!an || !bn) return 0;
  return dot / (Math.sqrt(an) * Math.sqrt(bn));
}

function normalize(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((acc, n) => acc + n * n, 0));
  if (!mag) return vec;
  return vec.map((v) => v / mag);
}
