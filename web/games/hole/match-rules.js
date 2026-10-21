// Shared pure match-rule helpers; kept separate so winner logic is easy to verify.
export function countStaticEdibles(objects) {
  let count = 0;
  for (const object of objects) if (object.state === 0 && !object.moving) count++;
  return count;
}

export function respawnEligible(hole) {
  return !hole.noRespawn;
}

export function matchEndReason({ mode, aliveCount, staticLeft, lastEater, clockExpired }) {
  if (mode === 'bite' && staticLeft === 0 && lastEater) return 'last-bite';
  if (mode === 'standing' && aliveCount === 1) return 'last-standing';
  if (mode === 'standing' && aliveCount === 0) return 'empty';
  return clockExpired ? 'timeout' : null;
}

export function rankMatchHoles(holes, mode, reason, winner) {
  return [...holes].sort((a, b) => {
    if (mode === 'standing' && a.alive !== b.alive) return a.alive ? -1 : 1;
    if (mode === 'bite' && reason === 'last-bite' && a === winner) return -1;
    if (mode === 'bite' && reason === 'last-bite' && b === winner) return 1;
    return b.score - a.score;
  });
}
