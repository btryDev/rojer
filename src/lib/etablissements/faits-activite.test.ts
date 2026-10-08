// Les faits d'activité (ADR-041) : du fait déclaré à ce qu'il rend dû —
// obligation d'établissement, risque et mesure au DUERP, titre sur la fiche.
//
// La garde ne recopie pas la liste des liens : elle les confronte au DROIT déjà
// écrit ailleurs. Un titre ou une obligation n'est attaché à un fait que si
// l'un des articles qui le fondent est cité par le fait lui-même (`pourquoi`)
// ou par le risque que sa question ajoute au DUERP. Une inversion entre deux
// faits fait tomber la garde : la conduite cite R. 4323-55/56, l'électricité
// R. 4544-9/10.

import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { questionsDetectionTransverses, tousRisquesConnus } from "@/lib/referentiels";
import { matchTypologie, type EtablissementMatching } from "@/lib/matching";
import { titreParId } from "@/lib/salaries/catalogue";
import { titresDuDuerpPourUnePersonne } from "@/lib/salaries/titres-du-duerp";
import { FAITS_ACTIVITE, type ReponsesFaitsActivite } from "./faits-activite";

const ARTICLE = /\b[LRD]\. ?\d{4}-\d+(?:-\d+)*/g;
const articlesCites = (texte: string) =>
  new Set((texte.match(ARTICLE) ?? []).map((a) => a.replace(/\s+/g, " ")));

const AUCUN: ReponsesFaitsActivite = {
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
};

/** Ce que le fait cite : sa raison, et le risque que sa question ajoute au DUERP. */
function citesDuFait(f: (typeof FAITS_ACTIVITE)[number]): Set<string> {
  const q = questionsDetectionTransverses.find((x) => x.id === f.questionTransverse);
  const r = q ? tousRisquesConnus().get(q.risqueIdAssocie) : undefined;
  return articlesCites(
    [f.pourquoi, r?.description ?? "", ...(r?.mesuresRecommandees.map((m) => m.libelle) ?? [])].join(" "),
  );
}

describe("le registre — chaque lien est fondé", () => {
  it("borne basse : l'électricité, la conduite et le CMR déclenchent leurs titres", () => {
    const de = (c: string) => FAITS_ACTIVITE.find((f) => f.champ === c)!.declencheTitres;
    expect(de("operationsElectriques")).toContain("elec-salarie-habilitation");
    expect(de("conduiteEngins")).toContain("conduite-salarie-formation");
    expect(de("expositionCMR")).toContain("sante-travail-salarie-sir");
  });

  for (const f of FAITS_ACTIVITE) {
    describe(f.champ, () => {
      it("sa question transverse, s'il en a une, existe et ajoute un risque connu", () => {
        if (!f.questionTransverse) return;
        const q = questionsDetectionTransverses.find((x) => x.id === f.questionTransverse);
        expect(q, f.questionTransverse).toBeDefined();
        expect(tousRisquesConnus().get(q!.risqueIdAssocie), q!.risqueIdAssocie).toBeDefined();
      });

      it("ne déclenche que des titres du catalogue fondés sur un article qu'il cite", () => {
        const cites = citesDuFait(f);
        const sansFondement = f.declencheTitres.filter((id) => {
          const t = titreParId(id);
          return !t || !t.referencesLegales.some((r) => r.article && cites.has(r.article));
        });
        expect(sansFondement, `articles cités : ${[...cites].join(", ")}`).toEqual([]);
      });

      it("conditionne des obligations fondées sur un article qu'il cite", () => {
        const cites = citesDuFait(f);
        const sansFondement = obligationsConformite
          .filter((o) => o.typologies.activite === f.champ)
          .filter((o) => !o.referencesLegales.some((r) => r.article && cites.has(r.article)))
          .map((o) => o.id);
        expect(sansFondement, `articles cités : ${[...cites].join(", ")}`).toEqual([]);
      });

      it("sert à quelque chose : il conditionne une obligation ou déclenche un titre", () => {
        // Un fait qu'on pose au dirigeant sans qu'aucune ligne n'en dépende
        // serait une question à vide — le défaut même que l'ADR-041 corrige.
        const obligations = obligationsConformite.filter((o) => o.typologies.activite === f.champ);
        expect(obligations.length + f.declencheTitres.length).toBeGreaterThan(0);
      });

      it("sur un « oui », la fiche montre exactement ses titres", () => {
        if (f.declencheTitres.length === 0) return;
        const fiche = titresDuDuerpPourUnePersonne({ ...AUCUN, [f.champ]: true }, []);
        const ligne = fiche.find((x) => x.champ === f.champ)!;
        expect(ligne.reponse).toBe("oui");
        expect(ligne.titres.map((t) => t.obligation.id).sort()).toEqual([...f.declencheTitres].sort());
        expect(fiche.filter((x) => x.reponse === "oui").map((x) => x.champ)).toEqual([f.champ]);
      });
    });
  }
});

describe("le moteur lit le fait — la règle du non-renseigné", () => {
  const etab = (over: Partial<EtablissementMatching>): EtablissementMatching => ({
    id: "e", effectifSurSite: 4, effectifEntreprise: 4, estEtablissementTravail: true,
    estERP: false, estIGH: false, estHabitation: false, typeErp: null, categorieErp: null,
    classeIgh: null, familleHabitation: null, personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null, comporteLocauxSommeilPublic: null, chiffonsImpregnes: null,
    manutentionManuelle: null, travailSurEcran: null, operationsElectriques: null,
    conduiteEngins: null, expositionCMR: null, epiPresents: null,
    ...over,
  });
  const conditionnees = obligationsConformite.filter((o) => o.typologies.activite !== undefined);

  it("il y en a : manutention, écran, électricité, EPI", () => {
    const champs = new Set(conditionnees.map((o) => o.typologies.activite));
    for (const c of ["manutentionManuelle", "travailSurEcran", "operationsElectriques", "epiPresents"]) {
      expect(champs.has(c as never), c).toBe(true);
    }
  });

  for (const o of conditionnees) {
    const champ = o.typologies.activite!;
    it(`${o.id} : retirée sur « non », retenue sur « oui », « à confirmer » sur le silence`, () => {
      expect(matchTypologie(o.typologies, etab({ [champ]: false })).ok).toBe(false);
      const oui = matchTypologie(o.typologies, etab({ [champ]: true }));
      expect(oui.ok).toBe(true);
      expect(oui.ok && oui.sansReponse).toBeFalsy();
      const silence = matchTypologie(o.typologies, etab({}));
      expect(silence.ok).toBe(true);
      expect(silence.ok && silence.sansReponse?.length).toBeGreaterThan(0);
    });
  }
});
