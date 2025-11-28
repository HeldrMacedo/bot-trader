/**
 * Utility functions for the Deriv Analyzer
 */

// Counter function to count occurrences of each element in an array
export function Counter<T>(array: T[]): Record<string, number> {
  const counter: Record<string, number> = {};
  
  for (const item of array) {
    const key = String(item);
    counter[key] = (counter[key] || 0) + 1;
  }
  
  return counter;
}

// Helper function to compare arrays
export function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}