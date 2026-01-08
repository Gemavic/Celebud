const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  rateLimitMap.set(identifier, record);
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

export function cleanupRateLimiter() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

setInterval(cleanupRateLimiter, 60000);

export function getRateLimitHeaders(
  allowed: boolean,
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
    ...(allowed ? {} : { 'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString() }),
  };
}
