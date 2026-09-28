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
//
// REVUE INDÉPENDANTE DU LOT 3 (2026-09-28). ~~Le rythme attendu suivait
// « l'ordre que le référentiel tranche » (chariot d'abord, puis personnes)~~ :
// il ne lisait pas le III de l'art. 20, auquel le a) renvoie, et affirmait
// conformes douze mois que le texte fixe à six (appareil manuel ne levant pas
// de personnes). Le rythme attendu est désormais celui du TEXTE, écrit comme
// une règle (`rythmeDuTexte`), et le silence se juge par le principe : une
// réponse absente retient le rythme le plus exigeant qu'une réponse possible
// donnerait. Art. 20 (API, LEGIARTI000006680466) : II, la liste — chariots
// élévateurs, hayons élévateurs, grues auxiliaires, monte-meubles, plates-formes
// élévatrices mobiles de personnes… ; III, « les appareils de levage, non
// conçus spécialement pour lever des personnes, mus par la force humaine
// employée directement ».
import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "./engine";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { FAUTE_DE_REPONSE_LEVAGE } from "@/lib/referentiels/conformite/levage";
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
  it("bornes : les lignes de VGP lisent les réponses, 27 combinaisons", () => {
    expect(VGP.size).toBeGreaterThanOrEqual(3);
    expect(COMBINAISONS).toHaveLength(27);
  });

  it.each(COMBINAISONS.map((r) => [nom(r), r] as const))("%s → une ligne, et une seule", (_n, r) => {
    const l = lignes(r);
    expect(l.map((a) => a.obligation.id), nom(r)).toHaveLength(1);
  });

  /**
   * L'art. 23, pour un appareil dont on connaît les trois réponses.
   * `chariot` : de la liste du II de l'art. 20 ; `personnes` : lever des
   * personnes ou élever un poste de travail ; `humaine` : mû par la force
   * humaine employée directement.
   *  - b) trois mois : mû par la force humaine ET élève un poste de travail ;
   *  - a) six mois : liste du II ; OU manuel et non conçu pour lever des
   *    personnes (III) ; OU motorisé et transporte des personnes ou élève un
   *    poste de travail ;
   *  - sinon douze mois.
   * Quand deux dérogations s'appliquent (un appareil du II, manuel, élevant un
   * poste de travail), la plus courte satisfait les deux.
   */
  const rythmeDuTexte = (chariot: boolean, personnes: boolean, humaine: boolean) =>
    humaine && personnes ? 3 : chariot || humaine || personnes ? 6 : 12;

  it("réponses complètes : le rythme que le texte donne (art. 23, art. 20-II et III)", () => {
    for (const r of COMBINAISONS.filter((c) => c.every((v) => v !== undefined))) {
      const [chariot, personnes, humaine] = r as boolean[];
      expect(moisDe(r), nom(r)).toBe(rythmeDuTexte(chariot, personnes, humaine));
    }
  });

  it("au silence, le rythme le plus exigeant qu'une réponse possible donnerait", () => {
    // ~~« au silence, la ligne la plus exigeante des deux que le silence
    // faisait naître reste » (six mois)~~ [2026-09-28 : le principe porte sur
    // les RÉPONSES possibles, pas sur les lignes que l'ancien encodage faisait
    // naître. Au silence complet, l'appareil peut être manuel et élever un
    // poste de travail : trois mois.]
    const possibles = (v: Reponse) => (v === undefined ? [true, false] : [v]);
    for (const r of COMBINAISONS) {
      const [c, p, h] = r;
      const attendu = Math.min(
        ...possibles(c).flatMap((cc) =>
          possibles(p).flatMap((pp) => possibles(h).map((hh) => rythmeDuTexte(cc, pp, hh))),
        ),
      );
      expect(moisDe(r), nom(r)).toBe(attendu);
    }
  });
});

describe("levage : le libellé ne dit pas un fait que le silence laisse ouvert (contre-revue du lot 3)", () => {
  // Un chariot électrique muet sur la force humaine reçoit la trimestrielle :
  // son libellé ne peut pas dire « appareil manuel élevant un poste de
  // travail ». Pour toute combinaison, la ligne servie qui ne l'est QUE par le
  // silence sur une réponse (condition `non_infirmee` sur cette réponse,
  // absente) a un libellé réduit au rythme et à son fondement, et une
  // description qui dit la réponse manquante. Rien n'est recopié : les
  // conditions et les combinaisons viennent du référentiel et du moteur.
  // Éprouvé en remettant l'ancien libellé de la trimestrielle.
  it.each(COMBINAISONS.map((r) => [nom(r), r] as const))("%s", (_n, r) => {
    const o = lignes(r)[0].obligation;
    const conds = "conditions" in o ? (o.conditions ?? []) : [];
    const ouvertes = PROPRIETES.filter(
      (p, i) =>
        r[i] === undefined &&
        conds.some((c) => c.propriete === p && c.type === "equipement_propriete_non_infirmee"),
    );
    for (const p of ouvertes) {
      expect(o.libelle, `${o.id} : ${p} sans réponse`).toMatch(
        /^Vérification générale périodique \w+ \(arrêté du 1er mars 2004, art\. /,
      );
      expect(o.description, `${o.id} : ${p} sans réponse`).toContain(FAUTE_DE_REPONSE_LEVAGE[p]);
    }
  });
});
