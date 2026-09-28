// UN SEUL RYTHME DE VGP PAR APPAREIL DE LEVAGE (D7, option (a), décision de la
// propriétaire du 2026-09-28 ; anomalie A2 du lot 2, maillon 3).
//
// Arrêté du 1er mars 2004, art. 23 (API, LEGIARTI000006680469, en vigueur
// depuis le 2005-03-31) : « La vérification générale périodique […] doit avoir
// lieu tous les douze mois. Toutefois, cette périodicité est de : a) Six mois
// pour les appareils de levage ci-après : - appareils de levage listés aux II et
// III de l'article 20 ; - appareils de levage, mus par une énergie autre que la
// force humaine employée directement, utilisés pour le transport des personnes
// ou pour déplacer en élévation un poste de travail ; b) Trois mois pour les
// appareils de levage, mus par la force humaine employée directement, utilisés
// pour déplacer en élévation un poste de travail. » Un rythme, pas deux.
//
// Rien n'est recopié : les lignes de VGP sont celles du référentiel qui citent
// l'art. 23 et lisent l'une des trois réponses ; les combinaisons sont le
// produit des trois réponses sur {oui, non, sans réponse} ; la périodicité est
// celle que le référentiel porte.
//
// Éprouvé en cassant (2026-09-28) : la condition « levage de personnes = non »
// de l'annuelle rendue `infirmee` (la lettre de l'option (a)) — rouge au
// silence, deux lignes ; la condition « chariot non infirmé » retirée de la
// semestrielle « personnes » — rouge, deux semestrielles.
import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "./engine";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import type { EtablissementMatching } from "./types";

const PROPRIETES = ["estChariotOuGerbeur", "sertAuLevageDePersonnes", "estMuParForceHumaine"] as const;
type Reponse = boolean | undefined;

const bureau: EtablissementMatching = {
  id: "e", effectifSurSite: 10, effectifEntreprise: 10, estEtablissementTravail: true,
  estERP: false, estIGH: false, estHabitation: false, typeErp: null, categorieErp: null,
  classeIgh: null, familleHabitation: null, personnesPresentesHabituellement: null,
  manipuleMatieresR422722: false, comporteLocauxSommeilPublic: null, chiffonsImpregnes: null,
};

/** Les lignes de VGP : citent l'art. 23 ET lisent l'une des trois réponses. */
const VGP = new Set(
  obligationsConformite
    .filter(
      (o) =>
        o.referencesLegales.some((r) => r.article === "Arrêté 2004-03-01 art. 23") &&
        ("conditions" in o ? (o.conditions ?? []) : []).some((c) =>
          (PROPRIETES as readonly string[]).includes(c.propriete),
        ),
    )
    .map((o) => o.id),
);

const COMBINAISONS: Reponse[][] = PROPRIETES.reduce<Reponse[][]>(
  (acc) => acc.flatMap((c) => [true, false, undefined].map((v) => [...c, v])),
  [[]],
);

function lignes(reponses: Reponse[]) {
  const car: Record<string, boolean> = {};
  PROPRIETES.forEach((p, i) => {
    if (reponses[i] !== undefined) car[p] = reponses[i]!;
  });
  return determineObligationsApplicables(bureau, [
    { id: "q", libelle: "q", categorie: "EQUIPEMENT_LEVAGE", caracteristiques: car },
  ]).filter((a) => VGP.has(a.obligation.id));
}

const MOIS = { trimestrielle: 3, semestrielle: 6, annuelle: 12 } as const;
const moisDe = (reponses: Reponse[]) => MOIS[lignes(reponses)[0].obligation.periodicite as keyof typeof MOIS];
const nom = (r: Reponse[]) =>
  PROPRIETES.map((p, i) => `${p}=${r[i] === undefined ? "?" : r[i] ? "oui" : "non"}`).join(" ");

describe("levage : un seul rythme de VGP par appareil (D7)", () => {
  it("bornes : quatre lignes de VGP lisent les réponses, 27 combinaisons", () => {
    expect(VGP.size).toBeGreaterThanOrEqual(3);
    expect(COMBINAISONS).toHaveLength(27);
  });

  it.each(COMBINAISONS.map((r) => [nom(r), r] as const))("%s → une ligne, et une seule", (_n, r) => {
    const l = lignes(r);
    expect(l.map((a) => a.obligation.id), nom(r)).toHaveLength(1);
  });

  it("réponses complètes : le rythme que l'art. 23 donne, chariot en premier", () => {
    // Le texte, lu dans l'ordre que le référentiel tranche : chariot ou
    // gerbeur (art. 20-II) → six mois ; sinon levage de personnes → trois mois
    // à la force humaine (b), six sinon (a) ; sinon douze.
    for (const r of COMBINAISONS.filter((c) => c.every((v) => v !== undefined))) {
      const [chariot, personnes, humaine] = r as boolean[];
      const attendu = chariot ? 6 : personnes ? (humaine ? 3 : 6) : 12;
      expect(moisDe(r), nom(r)).toBe(attendu);
    }
  });

  it("au silence, la ligne la plus exigeante des deux que le silence faisait naître reste", () => {
    // Avant D7, un appareil sans réponse recevait l'annuelle ET la semestrielle
    // « personnes » : c'est la semestrielle qui reste.
    expect(moisDe([undefined, undefined, undefined])).toBe(6);
    // Jamais moins exigeant que la réponse « non » partout, qui est le seul
    // cas où l'annuelle vaut.
    for (const r of COMBINAISONS) {
      const toutNon = r.map((v) => (v === undefined ? false : v));
      expect(moisDe(r), nom(r)).toBeLessThanOrEqual(moisDe(toutNon));
    }
  });
});
