type Bucket = {
  hourCount: number;
  hourResetAt: number;
  dayCount: number;
  dayResetAt: number;
};

const ipBuckets = new Map<string, Bucket>();

let globalDayCount = 0;
let globalDayResetAt = 0;

function now() {
  return Date.now();
}

function getBucket(key: string): Bucket {
  const t = now();
  const existing = ipBuckets.get(key);
  if (!existing) {
    const fresh: Bucket = {
      hourCount: 0,
      hourResetAt: t + 60 * 60 * 1000,
      dayCount: 0,
      dayResetAt: t + 24 * 60 * 60 * 1000,
    };
    ipBuckets.set(key, fresh);
    return fresh;
  }
  if (t > existing.hourResetAt) {
    existing.hourCount = 0;
    existing.hourResetAt = t + 60 * 60 * 1000;
  }
  if (t > existing.dayResetAt) {
    existing.dayCount = 0;
    existing.dayResetAt = t + 24 * 60 * 60 * 1000;
  }
  return existing;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; error: string; details: string };

/**
 * Best-effort limits for serverless (in-memory per instance).
 * Enough to stop casual infinite testing; not a hard distributed lock.
 */
export function checkAnalyzeRateLimit(ip: string): RateLimitResult {
  const perHour = Number(process.env.ANALYZE_LIMIT_PER_IP_HOUR ?? 3);
  const perDay = Number(process.env.ANALYZE_LIMIT_PER_IP_DAY ?? 8);
  const globalDay = Number(process.env.ANALYZE_LIMIT_GLOBAL_DAY ?? 40);

  const t = now();
  if (!globalDayResetAt || t > globalDayResetAt) {
    globalDayCount = 0;
    globalDayResetAt = t + 24 * 60 * 60 * 1000;
  }

  if (globalDayCount >= globalDay) {
    return {
      ok: false,
      error: "Quota journalier atteint",
      details:
        "Le quota global d'audits de la démo est atteint pour aujourd'hui. Réessayez demain ou contactez-nous en DM.",
    };
  }

  const bucket = getBucket(ip || "unknown");
  if (bucket.hourCount >= perHour) {
    return {
      ok: false,
      error: "Trop de requêtes",
      details: `Limite : ${perHour} audits / heure pour cette connexion. Réessayez plus tard.`,
    };
  }
  if (bucket.dayCount >= perDay) {
    return {
      ok: false,
      error: "Limite quotidienne atteinte",
      details: `Limite : ${perDay} audits / jour pour cette connexion.`,
    };
  }

  bucket.hourCount += 1;
  bucket.dayCount += 1;
  globalDayCount += 1;
  return { ok: true };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkAccessCode(provided: string | null | undefined): RateLimitResult {
  const expected =
    process.env.CADROGO_ACCESS_CODE?.trim() ||
    process.env.TENDERPULSE_ACCESS_CODE?.trim();
  if (!expected) {
    return { ok: true };
  }
  if (!provided || provided.trim() !== expected) {
    return {
      ok: false,
      error: "Accès refusé",
      details:
        "Code d'accès invalide ou manquant. Demandez le code en DM LinkedIn.",
    };
  }
  return { ok: true };
}
