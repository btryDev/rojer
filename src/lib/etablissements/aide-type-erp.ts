// L'aide par type d'ERP — 2026-10-17, sous-lot D du plan « mise à jour du
// référentiel ». Un fichier à part, et non `aides-regimes.ts` : le balayage de
// non-couverture lit ce module en entier, et la prose des régimes (habitation)
// n'y a pas sa place.
//
// Module pur : il se charge dans un composant client.

import { nonPorte } from "@/lib/perimetre/non-couverture";
import type { TypeErp } from "@/lib/referentiels/types-communs";

/**
 * Ce que Rojer ne suit pas pour un type d'activité, dit sous le choix du type
 * — à la création (`onboarding/StepTypologie.tsx`) et sur la fiche
 * (`etablissements/EtablissementForm.tsx`), pour le type principal comme pour
 * chacun des autres types déclarés. SURFACE NOUVELLE du sous-lot D du plan
 * « mise à jour du référentiel » (découpage validé par c6 le 2026-10-17).
 *
 * C'est une ADRESSE : le `declareA` des articles qu'elle annonce cite sa
 * phrase mot pour mot, avec `AIDE_TYPE_ERP.<type>` ; `aide-type-erp.test.ts`
 * le vérifie. Chaque sujet non suivi passe par `nonPorte(…)` : le balayage de
 * `perimetre/non-couverture-balayage.ts` lit ce module.
 *
 * Le titre II du livre II ne vise que les quatre premières catégories : chaque
 * phrase le dit. Aucune ne qualifie la situation (ligne de partage 8).
 *
 * X : EMPLACEMENT RÉSERVÉ, vide. La phrase « piscines » du type X viendra avec
 * le lot « filtre à l'accueil » (plan, § 5) ; rien n'est dit d'ici là.
 */
export const AIDE_TYPE_ERP: Partial<Record<TypeErp, string>> = {
  // M 35 : annonce, décision de c6 du 2026-10-17 — une niche, et la mise à
  // disposition de machines-outils au public est un fait d'activité que le
  // modèle ne porte pas.
  M: `Dans un magasin des quatre premières catégories qui met des machines-outils à la disposition du public, Rojer ne suit pas ${nonPorte("la surveillance directe de ces machines par un personnel compétent de l'établissement")} (règlement de sécurité, art. M 35).`,
  // T 52 § 2, T 29 § 3, T 33 § 2, T 43, T 44 : annonces (décisions de c6 du
  // 2026-10-17 ; plan, § 5).
  T: `Dans une salle d'exposition des quatre premières catégories, Rojer ne suit pas ${nonPorte("le nettoyage quotidien des locaux et l'enlèvement des déchets chaque jour avant l'ouverture au public")} (règlement de sécurité, art. T 52 § 2), ni ${nonPorte("la présence d'une personne compétente pendant l'ouverture au public, au-delà de 200 kW de puissance utile installée ou de 200 kVA de puissance électrique mise en œuvre")} (art. T 29 § 3 et T 33 § 2), ni ${nonPorte("la demande d'autorisation de présenter des machines utilisant des substances radioactives ou génératrices de rayons X")} (art. T 43), ni ${nonPorte("la déclaration préalable de l'emploi de lasers dans les salles")} (art. T 44).`,
};

/** Les aides des types déclarés, dans l'ordre de la déclaration, sans doublon. */
export function aidesDesTypes(types: readonly (string | null | undefined)[]): { type: TypeErp; aide: string }[] {
  const vus = new Set<string>();
  const sortie: { type: TypeErp; aide: string }[] = [];
  for (const t of types) {
    if (!t || vus.has(t)) continue;
    vus.add(t);
    const aide = AIDE_TYPE_ERP[t as TypeErp];
    if (aide) sortie.push({ type: t as TypeErp, aide });
  }
  return sortie;
}

