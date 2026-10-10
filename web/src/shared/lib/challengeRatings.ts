// The official D&D 5e challenge ratings: 0, 1/8, 1/4, 1/2, then 1 to 30.
export const challengeRatings: readonly number[] = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, index) => index + 1)]
