import { MAX_LINKS } from "./constants";
import type { QuickLaunchLink, QuickLaunchSettings } from "./types";

export const defaultQuickLaunchSettings: QuickLaunchSettings = {
  links: Array.from({ length: MAX_LINKS }, () => ({ label: "", url: "" })),
};

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function parseQuickLaunchSettingsForm(formData: FormData): QuickLaunchSettings {
  const links: QuickLaunchLink[] = [];

  for (let i = 0; i < MAX_LINKS; i++) {
    const label = String(formData.get(`label${i}`) ?? "").trim();
    const url = String(formData.get(`url${i}`) ?? "").trim();

    if (!label && !url) {
      links.push({ label: "", url: "" });
      continue;
    }
    if (!label || !url) {
      throw new Error(`Link ${i + 1}: both a label and a URL are required`);
    }

    const normalized = normalizeUrl(url);
    try {
      new URL(normalized);
    } catch {
      throw new Error(`Link ${i + 1}: "${url}" is not a valid URL`);
    }

    links.push({ label, url: normalized });
  }

  return { links };
}
