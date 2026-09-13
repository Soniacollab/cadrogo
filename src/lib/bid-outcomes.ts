import type { BidOutcomeRecord } from "@/types/analysis";

const STORAGE_KEY = "cadrogo-bid-outcomes";

export function readBidOutcomes(): BidOutcomeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BidOutcomeRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBidOutcome(
  record: Omit<BidOutcomeRecord, "id" | "createdAt"> & { id?: string }
): BidOutcomeRecord {
  const next: BidOutcomeRecord = {
    id: record.id ?? `out-${Date.now()}`,
    title: record.title,
    clientName: record.clientName,
    outcome: record.outcome,
    bidPriceEur: record.bidPriceEur,
    notes: record.notes,
    createdAt: new Date().toISOString(),
  };
  const list = readBidOutcomes();
  const updated = [next, ...list].slice(0, 100);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return next;
}
