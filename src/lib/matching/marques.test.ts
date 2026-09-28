import { describe, expect, it } from "vitest";
import {
  determineObligationsApplicables,
  type EtablissementMatching,
} from "./index";
import { marquesParObligation, phrasesAConfirmer, questionsQuiRetiennent } from "./marques";
import { PHRASE_SANS_REPONSE } from "./sans-reponse";
import type { QuestionSansReponse } from "./types";
import { evaluerSection } from "@/lib/registre/composition";
import { SECTIONS_REGISTRE } from "@/lib/registre/sections";
import { ligneVerif } from "@/lib/pdf/builders";
import type { VerificationListee } from "@/lib/calendrier/queries";

/**
 * La marque « à confirmer » voyage jusqu'aux surfaces (analyse du 2026-09-27,
 * § 6.3). Jusqu'ici, seul l'écran des états permanents traduisait
 * `sansReponse` : le calendrier, le dossier PDF, le registre et le MCP
 * affichaient comme due une ligne que seul un silence de la fiche retient.
 *
 * Chaque cas est éprouvé dans les deux sens : muet ⇒ marque, « non » ou
 * réponse donnée ⇒ pas de marque (ou pas de ligne).
 */

function etab(over: Partial<EtablissementMatching> = {}): EtablissementMatching {
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
    chiffonsImpregnes: null,
    ...over,
  };
}

const EXERCICE = "incendie-travail-exercice-semestriel";

describe("le moteur nomme la question dont le silence retient la ligne", () => {
  it("personnes présentes muettes, ERP sous les bornes ⇒ `personnes_presentes`", () => {
    const m = marquesParObligation(
      determineObligationsApplicables(
        etab({ estERP: true, typeErp: "N", categorieErp: "N5", effectifSurSite: 8, effectifEntreprise: 8, manipuleMatieresR422722: false }),
        [],
      ),
    );
    expect(m.get(EXERCICE)?.phrases).toEqual([PHRASE_SANS_REPONSE.personnes_presentes]);
    // Nombre déclaré au-dessus du seuil : la ligne est due, sans marque.
    const d = marquesParObligation(
      determineObligationsApplicables(
        etab({ estERP: true, typeErp: "N", categorieErp: "N5", effectifSurSite: 8, effectifEntreprise: 8, personnesPresentesHabituellement: 80 }),
        [],
      ),
    );
    expect(d.has(EXERCICE)).toBe(false);
  });

  it("sommeil sur un type non renseigné ⇒ `type_erp`, la question que la fiche pose", () => {
    const apps = determineObligationsApplicables(
      etab({ estERP: true, typeErp: null, categorieErp: "N5" }),
      [],
    );
    const sommeil = apps.find((a) => a.obligation.id === "incendie-erp-5-sommeil-consigne-chambres");
    expect(sommeil?.sansReponse).toEqual(["type_erp"]);
  });
});

describe("la traduction est unique", () => {
  it("chaque question a sa phrase, et `phrasesAConfirmer` la rend", () => {
    for (const q of Object.keys(PHRASE_SANS_REPONSE) as QuestionSansReponse[]) {
      expect(phrasesAConfirmer({ sansReponse: [q] })).toEqual([PHRASE_SANS_REPONSE[q]]);
    }
    expect(phrasesAConfirmer({})).toEqual([]);
  });
});

describe("registre de sécurité : la fiche due par le seul silence le dit", () => {
  // Contre-lecture du 2026-09-27 : un bureau de trois personnes muet sur les
  // matières reçoit les fiches d'exercices, et `SectionDue` perdait la marque.
  const duesAvecMarque = (e: EtablissementMatching) =>
    SECTIONS_REGISTRE.map((s) => evaluerSection(s, e, []))
      .filter((d) => d !== null && d.aConfirmer.length > 0)
      .map((d) => d!.section.id);

  it("muet ⇒ au moins une fiche marquée ; « non » ⇒ aucune", () => {
    expect(duesAvecMarque(etab())).not.toHaveLength(0);
    expect(duesAvecMarque(etab({ manipuleMatieresR422722: false, chiffonsImpregnes: false }))).toHaveLength(0);
  });
});

describe("PDF : la ligne de vérification porte sa marque", () => {
  const v = {
    id: "v1",
    obligationId: EXERCICE,
    prescriptionId: null,
    libelleObligation: "Essais du matériel et exercices d'évacuation semestriels",
    periodicite: "semestrielle",
    statut: "planifiee",
    datePrevue: new Date("2026-03-01T00:00:00Z"),
    archiveLe: null,
    salarieId: null,
    equipement: null,
    salarie: null,
    prescription: null,
    derniereRealisation: null,
  } as unknown as VerificationListee;
  const NOW = new Date("2026-02-01T00:00:00Z");

  it("marque connue ⇒ recopiée ; absente ⇒ vide", () => {
    const marques = new Map([[EXERCICE, { phrases: ["phrase"], effectif: false }]]);
    expect(ligneVerif(v, false, NOW, marques).aConfirmer).toEqual(["phrase"]);
    expect(ligneVerif(v, false, NOW).aConfirmer).toEqual([]);
  });

  it("D1 (a) : échue et marquée ⇒ « à confirmer », jamais « en retard »", () => {
    // Le registre PDF imprime cette colonne dans un document remis en
    // contrôle. Éprouvé en rendant `statutAffiche` nu dans `ligneVerif`.
    const APRES = new Date("2026-04-01T00:00:00Z");
    const marques = new Map([[EXERCICE, { phrases: ["phrase"], effectif: false }]]);
    expect(ligneVerif(v, false, APRES, marques).statut).toBe("a_confirmer");
    expect(ligneVerif(v, false, APRES).statut).toBe("en_retard");
  });
});

describe("la relance ne pose que les questions dont le silence retient une ligne", () => {
  it("bureau muet : matières et chiffons ; répondus : aucune", () => {
    const muet = questionsQuiRetiennent(determineObligationsApplicables(etab(), []));
    expect(muet).toContain("matieres_r4227_22");
    expect(muet).toContain("chiffons_impregnes");
    const repondu = questionsQuiRetiennent(
      determineObligationsApplicables(
        etab({ manipuleMatieresR422722: false, chiffonsImpregnes: true }),
        [],
      ),
    );
    expect(repondu).not.toContain("matieres_r4227_22");
    expect(repondu).not.toContain("chiffons_impregnes");
  });
});
