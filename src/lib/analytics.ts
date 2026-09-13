type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

const STORAGE_KEY = "cadrogo-analytics";

export function trackEvent(name: string, payload: AnalyticsPayload = {}): void {
  const entry = {
    name,
    payload,
    at: new Date().toISOString(),
  };

  if (typeof window === "undefined") {
    console.info("[analytics]", entry);
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    const next = Array.isArray(list) ? [...list, entry].slice(-200) : [entry];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[analytics]", entry);
  }
}

export function readAnalyticsEvents(): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  } catch {
    return [];
  }
}
