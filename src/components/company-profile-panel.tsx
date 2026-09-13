"use client";

import { useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CERTIFICATION_OPTIONS,
  DEFAULT_COMPANY_PROFILE,
  readCompanyProfile,
  saveCompanyProfile,
} from "@/lib/company-profile";
import { trackEvent } from "@/lib/analytics";
import type { CompanyProfile } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface CompanyProfilePanelProps {
  onChange?: (profile: CompanyProfile) => void;
  compact?: boolean;
}

export function CompanyProfilePanel({
  onChange,
  compact = false,
}: CompanyProfilePanelProps) {
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const current = readCompanyProfile();
    setProfile(current);
    onChange?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleCert = (cert: string) => {
    setProfile((prev) => {
      const has = prev.certifications.includes(cert);
      return {
        ...prev,
        certifications: has
          ? prev.certifications.filter((c) => c !== cert)
          : [...prev.certifications, cert],
      };
    });
    setSaved(false);
  };

  const handleSave = () => {
    const next = saveCompanyProfile(profile);
    setProfile(next);
    onChange?.(next);
    setSaved(true);
    trackEvent("company_profile_saved", {
      tjm: next.tjmEur,
      margin: next.targetMarginPercent,
      certs: next.certifications.length,
    });
  };

  return (
    <Card className={cn(compact && "border-line/80")}>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Profil entreprise</CardTitle>
        </div>
        <CardDescription>
          Calibre le Win-Engine (TJM, marge, certifs). Sans ça, le % de gain reste générique.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted">Raison sociale</span>
            <input
              className="h-9 w-full rounded-md border border-line bg-background px-3 text-sm"
              value={profile.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="Ex. Nova Digital"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Région</span>
            <input
              className="h-9 w-full rounded-md border border-line bg-background px-3 text-sm"
              value={profile.region}
              onChange={(e) => update("region", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">TJM (€)</span>
            <input
              type="number"
              min={100}
              className="h-9 w-full rounded-md border border-line bg-background px-3 text-sm"
              value={profile.tjmEur}
              onChange={(e) => update("tjmEur", Number(e.target.value) || 0)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Marge cible (%)</span>
            <input
              type="number"
              min={0}
              max={80}
              className="h-9 w-full rounded-md border border-line bg-background px-3 text-sm"
              value={profile.targetMarginPercent}
              onChange={(e) =>
                update("targetMarginPercent", Number(e.target.value) || 0)
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Jours dispo / an</span>
            <input
              type="number"
              min={1}
              className="h-9 w-full rounded-md border border-line bg-background px-3 text-sm"
              value={profile.availableDays}
              onChange={(e) =>
                update("availableDays", Number(e.target.value) || 0)
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">CA annuel (€)</span>
            <input
              type="number"
              min={0}
              className="h-9 w-full rounded-md border border-line bg-background px-3 text-sm"
              value={profile.annualRevenueEur}
              onChange={(e) =>
                update("annualRevenueEur", Number(e.target.value) || 0)
              }
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted">Certifications</p>
          <div className="flex flex-wrap gap-2">
            {CERTIFICATION_OPTIONS.map((cert) => {
              const active = profile.certifications.includes(cert);
              return (
                <button
                  key={cert}
                  type="button"
                  onClick={() => toggleCert(cert)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                    active
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-line bg-surface text-muted hover:text-foreground"
                  )}
                >
                  {cert}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.hasSecNumCloudPartner}
              onChange={(e) => update("hasSecNumCloudPartner", e.target.checked)}
            />
            Partenaire SecNumCloud / HDS
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.hasPublicReferences}
              onChange={(e) => update("hasPublicReferences", e.target.checked)}
            />
            Références secteur public
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" />
            Enregistrer le profil
          </Button>
          {saved && (
            <span className="text-xs text-success">Profil sauvegardé localement</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
