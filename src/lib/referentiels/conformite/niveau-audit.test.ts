// Le NIVEAU AUDIT (ADR-042) : une obligation légale au référentiel, que Rojer
// ne sert pas au quotidien et qu'il nomme sur la page « Ce que Rojer ne couvre
// pas ». Les gardes de ce fichier, chacune éprouvée en la cassant (voir le
// journal, C67) :
//
//  (a) une obligation audit ne produit aucune ligne — le moteur ne la rend
//      jamais applicable, et la voie des titres salarié non plus ;
//  (b) elle apparaît dans la rubrique « Niveau audit » du dossier qu'elle
//      concerne ;
//  (c) elle garde sa référence légale : un texte, un article lu au corpus,
//      retenu, qui la nomme ;
//  (d) borne basse, pas de liste exacte : AU MOINS les trois obligations de
//      la décision du 2026-10-08 sont au niveau audit. Une liste exhaustive
//      recopiée se réparerait en recopiant et cesserait de vérifier.

import { describe, expect, it } from "vitest";
import {
  determineObligationsApplicables,
  determineObligationsNiveauAudit,
} from "@/lib/matching";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching";
import { genererVerificationsDepuisTitres } from "@/lib/calendrier/generateur";
import { obligationsNiveauAuditDuDossier } from "@/lib/perimetre/niveau-audit";
import { surfacesDe } from "@/lib/surfaces/obligations-sans-surface";
import { cataloguerTitres } from "@/lib/salaries/catalogue";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import {
  empreinteReferentiel,
  estNiveauAudit,
  estPorteeParEquipement,
  obligationParId,
  obligationsConformite,
  type Obligation,
} from "@/lib/referentiels/conformite";

const AUDIT = obligationsConformite.filter(estNiveauAudit);

/** Un établissement où le CHAMP de chaque obligation audit est atteint. */
function etabLarge(): EtablissementMatching {
  return {
    id: "etab-audit",
    effectifSurSite: 8,
    effectifEntreprise: 8,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    chiffonsImpregnes: true,
  };
}

/** Un appareil de chaque catégorie que vise une obligation audit. */
function parcAudit(): EquipementMatching[] {
  const categories = new Set(
    AUDIT.flatMap((o) => (estPorteeParEquipement(o) ? o.categoriesEquipement : [])),
  );
  return [...categories].map((c) => ({
    id: `eq-${c}`,
    libelle: c,
    categorie: c,
    caracteristiques: null,
  }));
}

describe("niveau audit — (d) borne basse, jamais la liste exacte", () => {
  it("au moins les trois obligations de la décision du 2026-10-08 sont au niveau audit", () => {
    const ids = new Set(AUDIT.map((o) => o.id));
    expect(ids.size).toBeGreaterThanOrEqual(3);
    for (const id of [
      "incendie-travail-chiffons-impregnes-recipients-clos",
      "epi-verification-generale-periodique-respiratoire",
      "epi-verification-generale-periodique-gilet-sauvetage",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("l'antichute n'est PAS au niveau audit : la scission l'a laissée servie", () => {
    const antichute = obligationParId("epi-verification-generale-periodique");
    expect(antichute).toBeDefined();
    expect(estNiveauAudit(antichute!)).toBe(false);
    const res = determineObligationsApplicables(etabLarge(), [
      { id: "h", libelle: "harnais", categorie: "EPI_ANTICHUTE", caracteristiques: null },
    ]);
    expect(res.map((r) => r.obligation.id)).toContain(
      "epi-verification-generale-periodique",
    );
  });
});

describe("niveau audit — (a) aucune ligne", () => {
  it("le champ de chaque obligation audit est atteint par le profil (sinon la garde serait vide)", () => {
    const atteintes = determineObligationsNiveauAudit(etabLarge(), parcAudit()).map(
      (a) => a.obligation.id,
    );
    const nonSalarie = AUDIT.filter((o) => o.porteur !== "salarie").map((o) => o.id);
    expect([...atteintes].sort()).toEqual([...nonSalarie].sort());
  });

  it("le moteur ne rend aucune obligation audit applicable", () => {
    const servies = determineObligationsApplicables(etabLarge(), parcAudit())
      .map((a) => a.obligation)
      .filter(estNiveauAudit)
      .map((o) => o.id);
    expect(servies).toEqual([]);
  });

  it("la porte est au moteur : la même obligation SANS le marqueur redevient applicable", () => {
    // Ce qui prouve que c'est le marqueur, et lui seul, qui l'écarte.
    const leves = AUDIT.map(
      (o) => ({ ...o, niveau: undefined }) as Obligation,
    );
    const servies = determineObligationsApplicables(etabLarge(), parcAudit(), {
      obligations: leves,
    }).map((a) => a.obligation.id);
    const nonSalarie = AUDIT.filter((o) => o.porteur !== "salarie").map((o) => o.id);
    expect([...servies].sort()).toEqual([...nonSalarie].sort());
  });

  it("la voie des titres salarié ne produit aucune ligne pour une obligation audit", () => {
    // Aucun titre n'est au niveau audit aujourd'hui : la garde se pose sur une
    // obligation salarié réelle, marquée pour l'occasion.
    const titre = obligationsConformite.find((o) => o.porteur === "salarie")!;
    const marque = { ...titre, niveau: "audit" } as Obligation;
    const titres = new Map([
      [
        titre.id,
        [
          {
            salarieId: "s-1",
            libelle: "Personne",
            delivreLe: new Date("2025-01-01T00:00:00Z"),
            echeanceLe: new Date("2027-01-01T00:00:00Z"),
          },
        ],
      ],
    ]);
    expect(genererVerificationsDepuisTitres(titres, () => titre)).toHaveLength(1);
    expect(genererVerificationsDepuisTitres(titres, () => marque)).toEqual([]);
  });

  it("le catalogue de l'écran Équipe ne propose aucun titre audit", () => {
    expect(cataloguerTitres().filter(estNiveauAudit)).toEqual([]);
  });

  it("l'empreinte bouge quand on lève le marqueur (réconciliation de tous les dossiers)", () => {
    const leve = obligationsConformite.map((o) =>
      estNiveauAudit(o) ? ({ ...o, niveau: undefined } as Obligation) : o,
    );
    expect(empreinteReferentiel(leve)).not.toBe(empreinteReferentiel());
  });
});

describe("niveau audit — (b) nommée dans la rubrique « Niveau audit »", () => {
  it("chaque obligation audit atteinte figure dans la rubrique du dossier", () => {
    const rubrique = obligationsNiveauAuditDuDossier(etabLarge(), parcAudit()).map(
      (l) => l.id,
    );
    for (const o of AUDIT) expect(rubrique, o.id).toContain(o.id);
  });

  it("la rubrique suit le dossier : un « non » aux chiffons et aucun appareil n'y laissent rien", () => {
    const rubrique = obligationsNiveauAuditDuDossier(
      { ...etabLarge(), chiffonsImpregnes: false },
      [],
    );
    expect(rubrique.filter((l) => obligationParId(l.id)?.porteur !== "salarie")).toEqual([]);
  });

  it("sa seule surface est la rubrique, jamais une surface du quotidien", () => {
    for (const o of AUDIT) expect(surfacesDe(o), o.id).toEqual(["niveau_audit"]);
  });
});

describe("niveau audit — (c) la référence légale reste", () => {
  const parRef = indexArticlesParRef();

  // Le FONDEMENT, pas n'importe quel article : un article de contexte qui
  // nomme l'obligation (R. 4323-100 pour les EPI) laissait passer un
  // fondement vidé — éprouvé en retirant le gilet des renvois de l'art. 1er.
  it("chaque obligation audit cite un fondement, lu au corpus, retenu, qui la nomme", () => {
    for (const o of AUDIT) {
      const [fondement] = o.referencesLegales;
      expect(fondement.reference.trim(), o.id).not.toBe("");
      expect(fondement.article, o.id).toBeTruthy();
      const art = parRef.get(fondement.article!)?.article;
      expect(art?.statut, `${o.id} : ${fondement.article}`).toBe("retenu");
      expect(
        art?.statut === "retenu" ? art.obligations : [],
        `${o.id} : ${fondement.article} ne la nomme plus`,
      ).toContain(o.id);
    }
  });

  it("la rubrique imprime cette référence, pas un résumé", () => {
    const rubrique = obligationsNiveauAuditDuDossier(etabLarge(), parcAudit());
    for (const l of rubrique) {
      expect(l.reference).toBe(obligationParId(l.id)!.referencesLegales[0].reference);
    }
  });
});
