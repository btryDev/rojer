"use client";

import { usePathname } from "next/navigation";
import { FilUnite } from "./FilUnite";
import { LienRetour } from "./LienRetour";

/** Ce que la mise en page sait du DUERP, pour nommer les retours. */
export type DonneesRetour = {
  /** Où mène l'étape « Votre activité » : précisions s'il y en a, sinon secteur. */
  hrefActivite: string;
  unites: Record<string, { nom: string; risques: Record<string, string> }>;
};

/**
 * Le retour d'une page du DUERP, tout à gauche de la barre du haut, à la
 * place de l'ancienne ligne « NAF · secteur · salariés » (2026-11-12,
 * décision de la propriétaire) : le contenu remonte d'autant. Lu sur
 * l'adresse — la mise en page ne connaît pas la page ouverte.
 *
 * Étape : « ← étape précédente ». Dans une unité : « Toutes les unités /
 * unité / risque / Mesures ».
 */
export function RetourDuerp({ duerpId, donnees }: { duerpId: string; donnees: DonneesRetour }) {
  const [, , , page, uniteId, risqueId, sous] = usePathname().split("/");
  const base = `/duerp/${duerpId}`;

  if (page === "risques" && uniteId) {
    const toutes = { libelle: "Toutes les unités", href: `${base}/risques` };
    const unite = donnees.unites[uniteId];
    // Une unité ou un risque inconnus (données d'avant une mutation) : le
    // fil s'arrête au dernier niveau connu, qui devient la page courante.
    if (!unite) return <FilUnite niveaux={[toutes]} />;
    const libelleRisque = risqueId ? unite.risques[risqueId] : undefined;
    const niveaux: { libelle: string; href?: string }[] = [
      toutes,
      { libelle: unite.nom, href: libelleRisque ? `${base}/risques/${uniteId}` : undefined },
    ];
    if (libelleRisque)
      niveaux.push({
        libelle: libelleRisque,
        href: sous === "mesures" ? `${base}/risques/${uniteId}/${risqueId}` : undefined,
      });
    if (libelleRisque && sous === "mesures") niveaux.push({ libelle: "Mesures" });
    return <FilUnite niveaux={niveaux} />;
  }

  const precedente: Record<string, { href: string; libelle: string }> = {
    activites: { href: `${base}/secteur`, libelle: "Secteur d'activité" },
    unites: { href: donnees.hrefActivite, libelle: "Votre activité" },
    risques: { href: `${base}/unites`, libelle: "Unités de travail" },
    transverses: { href: `${base}/risques`, libelle: "Risques par unité" },
    synthese: { href: `${base}/transverses`, libelle: "Questions transverses" },
  };
  const retour = page ? precedente[page] : undefined;
  if (!retour) return null;
  return (
    <nav aria-label="Retour">
      <LienRetour href={retour.href}>{retour.libelle}</LienRetour>
    </nav>
  );
}
