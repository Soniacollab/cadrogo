import type { CompanyProfile, Requirement } from "@/types/analysis";

export function applyCompanyGaps(
  requirements: Requirement[],
  profile: CompanyProfile | null | undefined
): Requirement[] {
  if (!profile) {
    return requirements.map((r) => ({
      ...r,
      companyGap: "unknown" as const,
      gapReason: "Complétez le profil entreprise pour le gap-check.",
    }));
  }

  const certs = profile.certifications.map((c) => c.toLowerCase());
  const has = (re: RegExp) => certs.some((c) => re.test(c));

  return requirements.map((req) => {
    const d = req.description.toLowerCase();
    let companyGap: Requirement["companyGap"] = "ok";
    let gapReason = "Couverture a priori OK au regard du profil.";

    if (/secnumcloud/.test(d)) {
      if (profile.hasSecNumCloudPartner || has(/secnumcloud/)) {
        companyGap = "ok";
        gapReason = "Partenaire / certif SecNumCloud déclaré.";
      } else {
        companyGap = "missing";
        gapReason = "SecNumCloud exigé — non déclaré dans le profil.";
      }
    } else if (/iso\s*27001|iso27001/.test(d)) {
      if (has(/27001/)) {
        companyGap = "ok";
        gapReason = "ISO 27001 présente.";
      } else {
        companyGap = "missing";
        gapReason = "ISO 27001 manquante dans le profil.";
      }
    } else if (/hds/.test(d)) {
      if (has(/hds/) || profile.hasSecNumCloudPartner) {
        companyGap = "ok";
        gapReason = "HDS / équivalent déclaré.";
      } else {
        companyGap = "missing";
        gapReason = "HDS exigé — non couvert.";
      }
    } else if (/rgaa|accessibilit/.test(d)) {
      if (has(/rgaa|accessibilit/)) {
        companyGap = "ok";
        gapReason = "Compétence accessibilité déclarée.";
      } else {
        companyGap = "missing";
        gapReason = "RGAA / accessibilité non déclarée.";
      }
    } else if (/référence|references|secteur public|collectivit/.test(d)) {
      if (profile.hasPublicReferences) {
        companyGap = "ok";
        gapReason = "Références publiques déclarées.";
      } else {
        companyGap = "missing";
        gapReason = "Références secteur public absentes du profil.";
      }
    } else if (/chiffre d'affaires|ca annuel|€/.test(d) && /≥|minimum|au moins|>\s*\d/.test(d)) {
      companyGap = "unknown";
      gapReason = "Vérifier le seuil de CA exigé vs votre profil.";
    }

    return { ...req, companyGap, gapReason };
  });
}
