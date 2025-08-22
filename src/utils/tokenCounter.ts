/**
 * Simple token estimation utility
 * Uses approximation: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Remove extra whitespace and estimate
  const cleanText = text.trim().replace(/\s+/g, ' ');
  return Math.ceil(cleanText.length / 4);
}

/**
 * Calculate total tokens from an array of text chunks
 */
export function calculateChunkTokens(chunks: string[]): number {
  return chunks.reduce((total, chunk) => total + estimateTokens(chunk), 0);
}

/**
 * Create a brief excerpt from the first chunk
 */
export function createChunkExcerpt(chunks: string[], maxLength: number = 100): string {
  if (!chunks || chunks.length === 0) return '';
  
  const firstChunk = chunks[0].trim();
  if (firstChunk.length <= maxLength) return firstChunk;
  
  // Find last complete word within limit
  const truncated = firstChunk.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const excerpt = lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated;
  
  return excerpt + '...';
}