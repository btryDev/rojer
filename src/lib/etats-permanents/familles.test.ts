// Le rangement de l'écran « Ce qui doit être en place » par familles d'usage.
//
// Le champ `usageEcran` est requis par le type, mais le type admet `null` :
// il ne sait pas dire qu'une ligne de l'écran DOIT être rangée, ni qu'une
// sous-catégorie appartient à sa famille. C'est ici. ~~Une ligne de l'écran sans
// rangement n'aurait aucune famille où s'afficher — il n'y a plus de groupe
// « autres » pour la recueillir.~~ [2026-10-17, revue indépendante : elle
// tombe dans le repli « Autres obligations » (`familles.ts`), pour que
// l'oubli se voie au lieu de faire lever le score, le PDF et le widget. Ce
// test reste le garde-fou : le repli n'est qu'une ceinture.]
//
// « À l'écran », c'est `figureSurLEcranEnPlace` — qui, depuis le même jour,
// écarte le niveau audit (ADR-042) comme la porte du moteur : les chiffons
// imprégnés y passaient, portaient un rangement et servaient de borne nommée,
// alors que l'écran ne les a jamais affichés.
//
// Aucune liste recopiée : la propriété se vérifie sur ce que `regle.ts` dit de
// chaque obligation, et un ajout au référentiel entre dans le relevé de
// lui-même.

import { describe, expect, it } from "vitest";
import {
  obligationParId,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import { PERIODICITES } from "@/lib/referentiels/types-communs";
import { estPeriodicitePlusStricte } from "@/lib/calendrier/periodicite";
import { prescriptionRenforce } from "@/lib/matching/prescriptions";
import { figureSurLEcranEnPlace } from "./regle";
import { ORDRE_GROUPES, ORDRE_SOUS_CATEGORIES, rangementDe } from "./familles";

const SUR_L_ECRAN = obligationsConformite.filter(figureSurLEcranEnPlace);
const HORS_ECRAN = obligationsConformite.filter(
  (o) => !figureSurLEcranEnPlace(o),
);

describe("le rangement de l'écran « Ce qui doit être en place »", () => {
  it("le relevé voit les lignes de l'écran — sinon ce test ne contrôle rien", () => {
    // Borne basse, pas un compte : ~~58~~ ~~57~~ 51 obligations au 2026-10-17
    // (58 − 1, les chiffons imprégnés, niveau audit ; puis 57 − 6, les six
    // états permanents d'établissement passés au niveau audit le même jour —
    // relevé en appelant `figureSurLEcranEnPlace`).
    expect(SUR_L_ECRAN.length).toBeGreaterThanOrEqual(45);
  });

  it("aucune ligne au niveau audit n'est comptée à l'écran — le moteur ne la rend jamais", () => {
    // Borne basse du relevé hors écran : le référentiel en porte au moins une.
    const audit = obligationsConformite.filter((o) => estNiveauAudit(o));
    expect(audit.length).toBeGreaterThanOrEqual(1);
    for (const o of audit) expect(figureSurLEcranEnPlace(o), o.id).toBe(false);
  });

  // LA DÉPENDANCE QUE CE RELEVÉ SUPPOSE. Il lit le référentiel sans
  // prescription ; un dossier, lui, peut en porter (ADR-035). Une surcharge
  // pourrait faire SORTIR une ligne de l'écran (un rythme la porte au
  // calendrier), jamais la faire ENTRER : il faudrait qu'elle donne un rythme
  // sans échéance à une ligne datée, et aucun rythme sans échéance n'est
  // « plus strict » que quoi que ce soit. Sans cet invariant, une ligne
  // pourrait s'afficher sans rangement sur un seul dossier, hors de ce relevé.
  it.each(PERIODICITES.map((p) => [p] as const))(
    "invariant : une périodicité sans échéance ne renforce jamais « %s »",
    (p) => {
      expect(estPeriodicitePlusStricte("autre", p)).toBe(false);
      expect(estPeriodicitePlusStricte("mise_en_service_uniquement", p)).toBe(
        false,
      );
    },
  );

  it("invariant : aucune prescription « autre » n'est retenue, sur aucune obligation", () => {
    // La garde que le moteur (`appliquerPrescriptions`) et le formulaire
    // (`prescriptions/schema.ts`) appellent tous deux.
    for (const o of obligationsConformite) {
      expect(prescriptionRenforce("autre", o), o.id).toBe(false);
    }
  });

  it("le relevé voit des lignes hors de l'écran, dont des titres salarié", () => {
    expect(HORS_ECRAN.some((o) => o.porteur === "salarie")).toBe(true);
  });

  it.each(SUR_L_ECRAN.map((o) => [o.id, o] as const))(
    "%s : figure à l'écran, donc porte un rangement",
    (_id, o) => {
      expect(rangementDe(o), "ligne de l'écran sans famille").not.toBeNull();
    },
  );

  it.each(HORS_ECRAN.map((o) => [o.id, o] as const))(
    "%s : hors de l'écran, donc sans rangement",
    (_id, o) => {
      expect(rangementDe(o)).toBeNull();
    },
  );

  it.each(
    obligationsConformite
      .filter((o) => rangementDe(o) !== null)
      .map((o) => [o.id, o] as const),
  )("%s : la sous-catégorie appartient à sa famille", (_id, o) => {
    const { groupe, sous } = rangementDe(o)!;
    expect(ORDRE_GROUPES).toContain(groupe);
    const permises = ORDRE_SOUS_CATEGORIES[groupe];
    if (permises.length === 0) expect(sous).toBeNull();
    else expect(permises).toContain(sous);
  });

  it.each([
    ["information-etablissement-avis-acces-duerp", "quotidien", "informer"],
    // 2026-10-17, revue de c6 : ~~incendie_secours / alerter~~. Les
    // coordonnées de `D. 4711-1` (médecin du travail, secours, inspection)
    // servent d'abord à informer les travailleurs — règle de frontière.
    ["information-etablissement-affichages-obligatoires", "quotidien", "informer"],
    // ~~chiffons imprégnés~~ (2026-10-17) : niveau audit, jamais à l'écran.
    ["incendie-erp-interdiction-fumer-affichee", "incendie_secours", "prevenir"],
    ["incendie-registre-securite", "installations", null],
  ] as const)("borne nommée : %s → %s / %s", (id, groupe, sous) => {
    const o = obligationParId(id);
    expect(o, `${id} a quitté le référentiel`).toBeDefined();
    expect(rangementDe(o!)).toEqual({ groupe, sous });
  });
});
