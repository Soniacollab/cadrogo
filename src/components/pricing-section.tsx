"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";

const PLANS = [
  {
    id: "audit",
    name: "Audit one-shot",
    price: "249 €",
    detail: "/ dossier",
    blurb: "PDF in → note de décision DG + Win-Engine. Idéal pour tester sur un vrai DCE.",
    features: [
      "Go / No-Go + exposition €",
      "Citations page & gap certifs",
      "Comparables BeauAMP IT",
      "Export note DG + Excel",
    ],
    cta: "Demander un audit",
    highlighted: false,
  },
  {
    id: "pilot",
    name: "Pack pilote",
    price: "1 200 €",
    detail: "/ 5 dossiers",
    blurb: "Pour une ESN qui veut industrialiser le tri Go/No-Go ce trimestre.",
    features: [
      "5 audits inclus",
      "Profil entreprise calibré",
      "Suivi win/loss",
      "Revue de 45 min avec vous",
    ],
    cta: "Lancer un pilote",
    highlighted: true,
  },
  {
    id: "saas",
    name: "Abonnement",
    price: "179 €",
    detail: "/ mois",
    blurb: "Si vous traitez ≥ 4 dossiers / mois. Historique et prior win améliorés.",
    features: [
      "8 audits / mois",
      "Win-Engine illimité",
      "Comparables à jour",
      "Support prioritaire",
    ],
    cta: "Précommander",
    highlighted: false,
  },
] as const;

export function PricingSection() {
  return (
    <section id="pricing" className="space-y-4">
      <div className="max-w-2xl space-y-1">
        <p className="text-sm font-medium text-accent">Monétisation</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Faites payer la décision, pas le résumé
        </h2>
        <p className="text-sm text-muted sm:text-base">
          Vertical IT / numérique marchés publics. Hybride : cash immédiat à
          l&apos;audit, abonnement quand le volume suit.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={
              plan.highlighted
                ? "border-brand shadow-panel ring-1 ring-brand/20"
                : undefined
            }
          >
            <CardHeader>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <CardDescription>{plan.blurb}</CardDescription>
              <p className="pt-2 text-3xl font-semibold tracking-tight">
                {plan.price}
                <span className="text-sm font-normal text-muted">
                  {" "}
                  {plan.detail}
                </span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "secondary"}
                onClick={() =>
                  trackEvent("pricing_cta_click", { plan: plan.id })
                }
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
