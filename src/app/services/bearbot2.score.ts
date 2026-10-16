/** 0 desliga o veto; os demais valores exigem igualdade ou funcionam como piso. */
export function aiScoreMatches(score: number, minScore: number, atLeast = false): boolean {
  return minScore === 0 || (atLeast ? score >= minScore : score === minScore);
}

/** Escolhe pelo Score de Oportunidade mostrado em Top Oportunidades. */
export function topOpportunityCandidate<T extends { score: number }>(candidates: T[]): T | undefined {
  return candidates.reduce<T | undefined>((best, candidate) =>
    !best || candidate.score > best.score ? candidate : best, undefined);
}
