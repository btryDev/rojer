// Le détail que la page « Ce que Rojer ne couvre pas » ne montre plus, pour
// l'annexe du PDF du référentiel complet (2026-10-17, ADR-046).
//
// LA RÈGLE DU LOT : TOUT CE QUI SORT DE LA PAGE VA DANS LE PDF. La page est
// passée d'environ cinq cents éléments à environ vingt-cinq ; ce qu'elle a
// cessé de dire — les références et les phrases des annonces, les articles
// écartés avec leur motif, les régimes refusés à l'entrée, les obligations au
// niveau audit avec leur référence — se lit ici, pour le relecteur (préventeur,
// contrôle). Le dirigeant n'a pas accès à ce document (Q1, propriétaire,
// 2026-10-17) : rien de ce qui le concerne ne doit y être SEUL, et la page ne
// renvoie jamais au PDF.
//
// DONNÉES, PAS MISE EN PAGE. Ce module rassemble ; `pdf/AnnexeCeQueRojerNeSuitPas`
// imprime. `parite-page-pdf.test.ts` confronte les clés rendues ici à
// l'inventaire figé de la page d'avant (`inventaire-page-a493461c.ts`).
//
// Module pur : il appelle les projections qui existent, il ne déclare rien.

import { CORPUS } from "@/lib/referentiels/corpus";
import {
  MENTION_NIVEAU_AUDIT,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import {
  exclusionsDeclarees,
  refusAlEntree,
  type ExclusionDeclaree,
  type RefusAlEntree,
} from "./exclusions";
import { FAMILLES_NON_GEREES, type FamilleNonGeree } from "./familles-non-gerees";
import { toutesLesAnnonces, type DomaineAnnonce } from "./manques-annonces";
import { gesteHorsQuotidien } from "./niveau-audit";

/** Une obligation au niveau audit, telle que l'annexe l'imprime. */
export type LigneAuditDetail = {
  id: string;
  libelle: string;
  /** `MENTION_NIVEAU_AUDIT` — « Audit » —, que la page n'affiche jamais. */
  mention: string;
  reference: string;
  url: string | null;
  geste: string;
};

export type DetailHorsPage = {
  /** Toutes les annonces, à tout dossier, avec références et phrases. */
  annonces: DomaineAnnonce[];
  /** Toutes les obligations au niveau audit, marquées « Audit ». */
  niveauAudit: LigneAuditDetail[];
  /** Les régimes refusés à l'entrée — document seul (décision c6, Q5). */
  refus: RefusAlEntree[];
  /** Les quatre exclusions, avec chaque article écarté et son motif. */
  exclusions: ExclusionDeclaree[];
  /** Les cinq familles, telles que la page les dit. */
  familles: readonly FamilleNonGeree[];
};

function ligneAudit(o: Obligation): LigneAuditDetail {
  const [fondement] = o.referencesLegales;
  return {
    id: o.id,
    libelle: o.libelle,
    mention: MENTION_NIVEAU_AUDIT,
    reference: fondement.reference,
    url: fondement.url ?? null,
    geste: gesteHorsQuotidien(o),
  };
}

/** Tout ce que la page ne montre plus, et ce qu'elle montre, pour le PDF. */
export function detailHorsPage(): DetailHorsPage {
  return {
    annonces: toutesLesAnnonces(CORPUS),
    niveauAudit: obligationsConformite.filter(estNiveauAudit).map(ligneAudit),
    refus: refusAlEntree(),
    exclusions: exclusionsDeclarees(),
    familles: FAMILLES_NON_GEREES,
  };
}

/**
 * Les clés que le détail porte, dans l'espace de l'inventaire figé
 * (`inventaire-page-a493461c.ts`) : `domaine:`, `annonce:`, `audit:`,
 * `refus:`, `exclusion:`, `ecarte:<motif>|<id du corpus>|<ref>`, et `famille:`.
 * ~~`<corpus>` = l'intitulé~~ [2026-10-17, revue : l'identifiant, stable ;
 * un intitulé renommé faisait rougir la parité sans aucune perte.]
 */
export function clesDuDetail(d: DetailHorsPage): Set<string> {
  const cles = new Set<string>();
  for (const dom of d.annonces) {
    cles.add(`domaine:${dom.cle}`);
    for (const a of dom.articles) cles.add(`annonce:${a.ref}`);
  }
  for (const l of d.niveauAudit) cles.add(`audit:${l.id}`);
  for (const r of d.refus) cles.add(`refus:${r.cle}`);
  for (const e of d.exclusions) {
    cles.add(`exclusion:${e.cle}`);
    for (const a of e.articles) cles.add(`ecarte:${e.cle}|${a.corpusId}|${a.ref}`);
  }
  for (const f of d.familles) cles.add(`famille:${f.cle}`);
  return cles;
}
