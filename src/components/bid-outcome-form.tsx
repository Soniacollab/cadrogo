"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { saveBidOutcome } from "@/lib/bid-outcomes";
import { trackEvent } from "@/lib/analytics";
import type { BidOutcomeRecord, TenderAnalysisResult } from "@/types/analysis";

interface BidOutcomeFormProps {
  analysis: TenderAnalysisResult;
}

export function BidOutcomeForm({ analysis }: BidOutcomeFormProps) {
  const [outcome, setOutcome] =
    useState<BidOutcomeRecord["outcome"]>("pending");
  const [bidPriceEur, setBidPriceEur] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveBidOutcome({
      title: analysis.title,
      clientName: analysis.clientName,
      outcome,
      bidPriceEur: bidPriceEur === "" ? undefined : Number(bidPriceEur),
      notes: notes || undefined,
    });
    trackEvent("bid_outcome_saved", { outcome, title: analysis.title });
    setSaved(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Suivi win / loss</CardTitle>
        <CardDescription>
          Enregistrez le résultat réel — c&apos;est le dataset propriétaire qui
          améliorera le modèle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["won", "Gagné"],
              ["lost", "Perdu"],
              ["passed", "Passé"],
              ["pending", "En cours"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setOutcome(value);
                setSaved(false);
              }}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                outcome === value
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-line bg-surface text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-muted">Prix proposé (€)</span>
          <input
            type="number"
            className="h-9 w-full max-w-xs rounded-md border border-line bg-background px-3 text-sm"
            value={bidPriceEur}
            onChange={(e) =>
              setBidPriceEur(e.target.value ? Number(e.target.value) : "")
            }
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted">Notes</span>
          <textarea
            className="min-h-[72px] w-full rounded-md border border-line bg-background px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex. perdu sur le prix, gagné après négociation lot 2…"
          />
        </label>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={handleSave}>
            Enregistrer l&apos;outcome
          </Button>
          {saved && (
            <span className="text-xs text-success">Outcome sauvegardé</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
