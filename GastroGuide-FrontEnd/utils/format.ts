export function formatDurationFromMinutes(minutes: number): string {
  const safeMinutes = Math.max(1, Math.round(minutes));

  if (safeMinutes < 60) {
    return `${safeMinutes} мин`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч ${remainingMinutes} мин`;
}

export function formatDurationFromSeconds(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return formatDurationFromMinutes(minutes);
}

export function formatDistanceFromMeters(distanceMeters: number): string {
  const safeDistance = Math.max(0, Math.round(distanceMeters));

  if (safeDistance < 1000) {
    return `${safeDistance} м`;
  }

  return `${(safeDistance / 1000).toFixed(1)} км`;
}

export function parseDistanceToMeters(distance: string | null | undefined): number {
  if (!distance) {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = distance
    .replace(',', '.')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const value = Number.parseFloat(normalized);

  if (Number.isNaN(value)) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalized.includes('км')) {
    return value * 1000;
  }

  if (normalized.includes('м')) {
    return value;
  }

  return value;
}