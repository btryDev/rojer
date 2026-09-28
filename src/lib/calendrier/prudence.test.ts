import { describe, expect, it } from "vitest";
import {
  determineObligationsApplicables,
  type EtablissementMatching,
} from "@/lib/matching";
import { marquesParObligation } from "@/lib/matching/marques";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";
import { calculerScoreDepuisEtat } from "@/lib/dashboard/score";
import {
  AUCUNE_PRUDENCE,
  retenueParPrudence,
  statutAffichePrudent,
} from "./prudence";

/**
 * D1 (a), décision de la propriétaire du 2026-09-28 : une ligne que seul le
 * silence de la fiche retient n'entre ni dans les retards ni dans l'indice.
 *
 * Les marques viennent du MOTEUR, appelé ici sur le cas même que la décision
 * cite — un bureau de trois personnes muet sur les matières de R. 4227-22 —,
 * et jamais d'une liste : la prudence est ce que la marque dit, rien d'autre.
 * Le même dossier, la question répondue « oui », rend la ligne due : elle
 * compte alors en retard, et l'indice la paie.
 */

function bureau(over: Partial<EtablissementMatching> = {}): EtablissementMatching {
  return {
    id: "e",
    effectifSurSite: 3,
    effectifEntreprise: 3,
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
    chiffonsImpregnes: false,
    ...over,
  };
}

/** Les marques du dossier, par le moteur — comme `marquesAConfirmerDuDossier`. */
const marquesDe = (e: EtablissementMatching) =>
  marquesParObligation(determineObligationsApplicables(e, []));

const NOW = new Date("2026-09-28T07:00:00Z");

/** Une ligne de chaque obligation que le moteur retient, toutes échues. */
function lignesEchues(e: EtablissementMatching) {
  return determineObligationsApplicables(e, [])
    .filter((a) => a.obligation.nature !== "etat_permanent")
    .map((a) => ({
      obligationId: a.obligation.id,
      libelleObligation: a.obligation.libelle,
      statut: "planifiee",
      datePrevue: new Date("2026-03-01T00:00:00Z"),
      periodicite: "semestrielle",
      archiveLe: null as Date | null,
      derniereRealisation: null as Date | null,
    }));
}

describe("D1 (a) : la ligne retenue par prudence ne compte ni en retard ni dans l'indice", () => {
  const muet = bureau();
  const repondu = bureau({ manipuleMatieresR422722: true });

  it("le cas de la décision existe : le moteur marque au moins une ligne datée du bureau muet", () => {
    const marques = marquesDe(muet);
    const prudente = lignesEchues(muet).filter((l) => marques.has(l.obligationId));
    expect(prudente.length).toBeGreaterThan(0);
  });

  it("muet : chaque ligne marquée sort des retards et du total ; répondu « oui » : elle y entre", () => {
    const marquesMuet = marquesDe(muet);
    const lignes = lignesEchues(muet);
    const marquees = lignes.filter((l) => marquesMuet.has(l.obligationId));

    const etatMuet = repartirVerifications(lignes, NOW, retenueParPrudence(marquesMuet));
    for (const l of marquees) {
      expect(etatMuet.enRetard).not.toContain(l);
      expect(etatMuet.retenuesParPrudence).toContain(l);
    }
    expect(etatMuet.total).toBe(lignes.length - marquees.length);

    // Répondu : la marque est levée par le moteur, la même ligne est due.
    const marquesRepondu = marquesDe(repondu);
    for (const l of marquees) expect(marquesRepondu.has(l.obligationId)).toBe(false);
    const etatRepondu = repartirVerifications(
      marquees,
      NOW,
      retenueParPrudence(marquesRepondu),
    );
    expect(etatRepondu.enRetard).toHaveLength(marquees.length);
    expect(etatRepondu.retenuesParPrudence).toHaveLength(0);
  });

  it("l'indice : 100 quand seules des lignes prudentes sont échues ; moins dès qu'elles sont dues", () => {
    const marques = marquesDe(muet);
    const marquees = lignesEchues(muet).filter((l) => marques.has(l.obligationId));
    const score = (prudence: Parameters<typeof repartirVerifications>[2]) => {
      const etat = repartirVerifications(marquees, NOW, prudence);
      return calculerScoreDepuisEtat({
        verifs: { total: etat.total, enRetard: etat.enRetard.length },
        actions: { ouvertesTotal: 0, enRetard: 0 },
        duerp: null,
        etatsPermanents: { total: 0, enPlace: 0 },
        couverture: { indeterminations: 0 },
      }).valeur;
    };
    expect(score(retenueParPrudence(marques))).toBe(100);
    expect(score(AUCUNE_PRUDENCE)).toBeLessThan(100);
  });

  it("une ligne ARCHIVÉE n'est retenue par rien : elle garde sa place de preuve", () => {
    const marques = marquesDe(muet);
    const [l] = lignesEchues(muet).filter((x) => marques.has(x.obligationId));
    const archivee = {
      ...l,
      archiveLe: new Date("2026-06-01T00:00:00Z"),
      derniereRealisation: new Date("2026-05-01T00:00:00Z"),
    };
    const etat = repartirVerifications([archivee], NOW, retenueParPrudence(marques));
    expect(etat.retenuesParPrudence).toHaveLength(0);
    expect(etat.realisees12m).toEqual([archivee]);
  });

  it("peinte « à confirmer », jamais « en retard » ; « en retard » dès qu'elle est due", () => {
    const marques = marquesDe(muet);
    const [l] = lignesEchues(muet).filter((x) => marques.has(x.obligationId));
    expect(statutAffichePrudent(l, NOW, retenueParPrudence(marques))).toBe("a_confirmer");
    expect(statutAffichePrudent(l, NOW, retenueParPrudence(marquesDe(repondu)))).toBe(
      "en_retard",
    );
  });
});
