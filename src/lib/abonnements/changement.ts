// Monter ou baisser de formule (ADR-053 § 10) : la formule d'abord (Essentiel
// < Pro), puis le rythme (le mensuel avant l'annuel). Une montée s'applique
// tout de suite, une baisse à la fin de la période payée.

import { CLES_FORMULES, FORMULES, LIBELLES_PLAFONDS, PERIODICITES, formuleDeLookupKey, type CleFormule, type Quotas } from "./formules";
import type { Depassement } from "./quotas";

export type Sens = "montee" | "baisse" | "identique";

/** Le sens d'un changement entre deux `lookup_key` ; `null` : l'une des deux est inconnue. */
export function sensDuChangement(actuelle: string | null | undefined, visee: string): Sens | null {
  const a = formuleDeLookupKey(actuelle);
  const v = formuleDeLookupKey(visee);
  if (!a || !v) return null;
  const ecart =
    CLES_FORMULES.indexOf(v.formule) - CLES_FORMULES.indexOf(a.formule) ||
    PERIODICITES.indexOf(v.periodicite) - PERIODICITES.indexOf(a.periodicite);
  return ecart > 0 ? "montee" : ecart < 0 ? "baisse" : "identique";
}

/** Les volumes d'usage : ce qui se compte d'une formule à l'autre, hors sites et personnes. */
const VOLUMES = ["permisDeFeuParAn", "plansDePreventionParAn", "signaturesParAn", "stockageGo", "prestataires", "liensAccesActifs", "importsDuerp"] as const;

/** « triplés », « doublés » ; « plus grands » ou « réduits » quand le rapport n'est pas le même partout. */
function evolutionDesVolumes(de: Quotas, vers: Quotas): string | null {
  const rapports = VOLUMES.flatMap((q) => {
    const a = de[q];
    const b = vers[q];
    return a && b && a !== b ? [b / a] : [];
  });
  if (rapports.length === 0) return null;
  const k = rapports[0];
  const meme = rapports.every((r) => Math.abs(r - k) < 1e-9);
  if (k > 1) return `Volumes d'usage ${meme && k === 2 ? "doublés" : meme && k === 3 ? "triplés" : "plus grands"}`;
  const divise = meme && Math.abs(1 / k - Math.round(1 / k)) < 1e-9 ? Math.round(1 / k) : null;
  return `Volumes d'usage ${divise === 2 ? "divisés par deux" : divise === 3 ? "divisés par trois" : "réduits"} (permis de feu, plans de prévention, signatures, stockage)`;
}

/**
 * Ce qu'une montée ouvre, dit avant le geste (retour de test du 2026-11-23) :
 * sites et personnes, volumes, assistant, expert. Vide pour un simple
 * changement de rythme.
 */
export function ceQuiSOuvre(de: CleFormule, vers: CleFormule): string[] {
  const a = FORMULES[de].quotas;
  const b = FORMULES[vers].quotas;
  const lignes: string[] = [];
  for (const q of ["etablissements", "membres"] as const) {
    const av = a[q];
    const ap = b[q];
    if (av !== null && ap !== null && ap > av) lignes.push(`${LIBELLES_PLAFONDS[q](ap)} au lieu de ${av}`);
  }
  const volumes = evolutionDesVolumes(a, b);
  if (volumes) lignes.push(volumes);
  if (b.connecterUnAssistant && !a.connecterUnAssistant) lignes.push("Connecter un assistant IA");
  if (b.heuresExpertParAn > a.heuresExpertParAn) lignes.push(`L'expert : vos questions, et ${b.heuresExpertParAn} h de rendez-vous par an`);
  return lignes;
}

/**
 * Ce qu'une baisse ferme à sa date : ce qui passerait en lecture seule
 * (`depassements` ; trop de personnes empêche la baisse, et la carte le dit),
 * volumes, assistant, expert.
 */
export function ceQuiSeFerme(de: CleFormule, vers: CleFormule, depassements: readonly Depassement[]): string[] {
  const a = FORMULES[de].quotas;
  const b = FORMULES[vers].quotas;
  const lignes = depassements.flatMap((d) => {
    if (d.quota === "membres") return [];
    const libelle = LIBELLES_PLAFONDS[d.quota as keyof typeof LIBELLES_PLAFONDS];
    if (!libelle) return [];
    const n = d.utilise - d.plafond;
    return [
      `${libelle(n)} sur ${d.utilise} ${n > 1 ? "passent" : "passe"} en lecture seule, ${n > 1 ? "les plus récents" : "le plus récent"} : consultables et exportables, plus modifiables`,
    ];
  });
  const volumes = evolutionDesVolumes(a, b);
  if (volumes) lignes.push(volumes);
  if (a.connecterUnAssistant && !b.connecterUnAssistant) lignes.push("L'assistant IA connecté est débranché");
  if (a.heuresExpertParAn > b.heuresExpertParAn) lignes.push("Plus de question à l'expert ni de rendez-vous annuel");
  return lignes;
}
