const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type Attempt = { count: number; resetsAt: number };
const attempts = new Map<string, Attempt>();

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkLoginRateLimit(request: Request) {
  const key = clientKey(request);
  const attempt = attempts.get(key);
  if (!attempt || attempt.resetsAt <= Date.now()) {
    attempts.delete(key);
    return { allowed: true as const, key };
  }
  if (attempt.count < MAX_ATTEMPTS) return { allowed: true as const, key };
  return {
    allowed: false as const,
    key,
    retryAfter: Math.max(1, Math.ceil((attempt.resetsAt - Date.now()) / 1000)),
  };
}

export function recordFailedLogin(key: string) {
  const current = attempts.get(key);
  if (!current || current.resetsAt <= Date.now()) {
    attempts.set(key, { count: 1, resetsAt: Date.now() + WINDOW_MS });
    return;
  }
  current.count += 1;
}

export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
