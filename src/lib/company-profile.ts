import type { CompanyProfile } from "@/types/analysis";

const STORAGE_KEY = "cadrogo-company-profile";

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: "",
  tjmEur: 650,
  targetMarginPercent: 25,
  availableDays: 120,
  annualRevenueEur: 800_000,
  certifications: [],
  hasSecNumCloudPartner: false,
  hasPublicReferences: true,
  region: "Pays de la Loire",
  updatedAt: new Date(0).toISOString(),
};

export const CERTIFICATION_OPTIONS = [
  "ISO 27001",
  "ISO 9001",
  "SecNumCloud",
  "HDS",
  "RGAA / accessibilité",
  "Qualiopi",
] as const;

export function readCompanyProfile(): CompanyProfile {
  if (typeof window === "undefined") {
    return { ...DEFAULT_COMPANY_PROFILE };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COMPANY_PROFILE };
    const parsed = JSON.parse(raw) as Partial<CompanyProfile>;
    return {
      ...DEFAULT_COMPANY_PROFILE,
      ...parsed,
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications.filter((c): c is string => typeof c === "string")
        : [],
    };
  } catch {
    return { ...DEFAULT_COMPANY_PROFILE };
  }
}

export function saveCompanyProfile(profile: CompanyProfile): CompanyProfile {
  const next: CompanyProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}
