import { describe, expect, it } from "vitest";
import { genererProchainesVerifications, periodicitesEffectives } from "@/lib/calendrier/generateur";
import {
  estEtatADeclarer,
  estFaitADater,
  figureSurLEcranEnPlace,
  modeDeclaration,
  modeDeclarationApplique,
} from "@/lib/etats-permanents/regle";
import {
  appliquerPrescriptions,
  prescriptionRenforce,
} from "@/lib/matching/prescriptions";
import type {
  EquipementMatching,
  ObligationApplicable,
  PrescriptionMatching,
} from "@/lib/matching/types";
import { indexArticlesParRef } from "../corpus";
import { empreinteReferentiel, obligationParId, obligationsConformite } from "./index";
import { mentionRythmeDeLigne, mentionRythmeRetenu } from "./mention-rythme";
import {
  controlerRythmeRetenu,
  periodiciteEffective,
  referencesCitees,
} from "./rythme-retenu";
import { porteurDe, type Obligation, type RythmeRetenu } from "./types";

/**
 * Le rythme retenu (ADR-039), éprouvé sur des obligations FABRIQUÉES : le lot 2
 * pose le modèle sans toucher au contenu, donc aucune obligation livrée n'en
 * porte. Chaque règle est cassée une à une sur une copie, et doit rougir.
 */

const index = indexArticlesParRef();
const articleDe = (cle: string) => index.get(cle);

function avec(id: string, rythmeRetenu: RythmeRetenu, extra: Partial<Obligation> = {}): Obligation {
  const base = obligationParId(id);
  if (!base) throw new Error(`fixture : ${id} introuvable`);
  return { ...base, id: `fixture-${id}`, rythmeRetenu, ...extra } as Obligation;
}

/** `L. 4141-2` : « Cette formation est répétée périodiquement… ». Établissement. */
const formationDefaut = () =>
  avec("formation-securite-etablissement-organisation", {
    motif: "defaut_annuel",
    periodicite: "annuelle",
    texteVague: "répétée périodiquement",
  });

/** `R. 4224-17` : « … vérifiés suivant une périodicité appropriée ». Équipement. */
const porteDefaut = () =>
  avec("porte-auto-maintien-en-etat", {
    motif: "defaut_annuel",
    periodicite: "annuelle",
    texteVague: "périodicité appropriée",
  });

/** `R. 4227-29` + NF S 61-919 § 5.1.1. État permanent d'établissement. */
const extincteursNorme = () =>
  avec("incendie-travail-extincteurs-dotation", {
    motif: "norme",
    periodicite: "annuelle",
    norme: "NF S 61-919",
    reference: {
      source: "NORME",
      reference: "NF S 61-919 (août 2001), § 5.1.1",
      article: "NF S 61-919 § 5.1.1",
    },
  });

describe("periodiciteEffective", () => {
  it("rend le rythme du texte, sinon le rythme retenu", () => {
    const o = formationDefaut();
    expect(o.periodicite).toBe("autre");
    expect(periodiciteEffective(o)).toBe("annuelle");
    const sans = obligationParId("formation-securite-etablissement-organisation")!;
    expect(periodiciteEffective(sans)).toBe("autre");
  });

  // « Aucune obligation livrée ne porte encore de rythme retenu » : borne haute
  // du lot 2, retirée le 2026-10-07 par le lot 3 (C55), qui en pose.
  it("le référentiel livré porte des rythmes retenus (borne basse, C55 lot 3)", () => {
    const motifs = new Set(obligationsConformite.map((o) => o.rythmeRetenu?.motif));
    expect(motifs.has("norme")).toBe(true);
  });

  it("la norme d'un rythme retenu fait partie des références citées", () => {
    const o = extincteursNorme();
    expect(referencesCitees(o).map((r) => r.article)).toContain("NF S 61-919 § 5.1.1");
  });
});

describe("controlerRythmeRetenu — chaque règle rougit quand on la casse", () => {
  it("les obligations livrées tiennent toutes les règles", () => {
    expect(obligationsConformite.flatMap((o) => controlerRythmeRetenu(o, articleDe))).toEqual([]);
  });

  it("les trois fixtures valides passent", () => {
    for (const o of [formationDefaut(), porteDefaut(), extincteursNorme()]) {
      expect(controlerRythmeRetenu(o, articleDe), o.id).toEqual([]);
    }
  });

  it("1. interdit si le texte chiffre déjà le rythme", () => {
    const o = { ...formationDefaut(), periodicite: "triennale" } as Obligation;
    expect(controlerRythmeRetenu(o, articleDe).join()).toMatch(/porte déjà « triennale »/);
    const m = { ...formationDefaut(), periodicite: "mise_en_service_uniquement" } as Obligation;
    expect(controlerRythmeRetenu(m, articleDe).join()).toMatch(/porte déjà/);
  });

  it("2. interdit sur une obligation événementielle ou ponctuelle", () => {
    for (const nature of ["evenementielle", "ponctuelle"] as const) {
      const o = { ...formationDefaut(), nature } as Obligation;
      expect(controlerRythmeRetenu(o, articleDe).join(), nature).toMatch(/nature/);
    }
  });

  it("3. une norme doit être citée sous NORME, lue, au corpus des normes", () => {
    const base = extincteursNorme();
    const r = base.rythmeRetenu as Extract<RythmeRetenu, { motif: "norme" }>;
    const varier = (reference: typeof r.reference, norme = r.norme) =>
      controlerRythmeRetenu({ ...base, rythmeRetenu: { ...r, reference, norme } } as Obligation, articleDe).join();

    expect(varier({ ...r.reference, source: "ARRETE" })).toMatch(/pas « NORME »/);
    expect(varier({ ...r.reference, article: "NF X 00-000" })).toMatch(/n'est dans aucun corpus/);
    expect(varier({ ...r.reference, article: undefined })).toMatch(/n'est dans aucun corpus/);
    // Un article de droit lu ne devient pas une norme parce qu'on le range sous NORME.
    expect(varier({ ...r.reference, article: "R. 4227-29" })).toMatch(/pas au corpus des normes/);
    // NF C 18-510 est au corpus, mais lue indirectement : elle ne fonde rien.
    expect(
      varier({ source: "NORME", reference: "NF C 18-510, recyclage", article: "NF C 18-510" }, "NF C 18-510"),
    ).toMatch(/indirectement/);
    expect(varier(r.reference, "NF S 61-920")).toMatch(/ne commence pas/);
  });

  it("4. le texte vague est recopié mot pour mot d'une citation lue", () => {
    const o = formationDefaut();
    const paraphrase = {
      ...o,
      rythmeRetenu: { motif: "defaut_annuel", periodicite: "annuelle", texteVague: "renouvelée régulièrement" },
    } as Obligation;
    expect(controlerRythmeRetenu(paraphrase, articleDe).join()).toMatch(/mot pour mot/);
    const vide = { ...o, rythmeRetenu: { motif: "defaut_annuel", periodicite: "annuelle", texteVague: " " } } as Obligation;
    expect(controlerRythmeRetenu(vide, articleDe).join()).toMatch(/vide/);
  });

  it("le défaut n'est qu'annuel, et un rythme retenu est un rythme", () => {
    const o = formationDefaut();
    const serre = { ...o, rythmeRetenu: { ...o.rythmeRetenu!, periodicite: "semestrielle" } } as Obligation;
    expect(controlerRythmeRetenu(serre, articleDe).join()).toMatch(/le défaut est annuel/);
    const n = extincteursNorme();
    const sansRythme = { ...n, rythmeRetenu: { ...n.rythmeRetenu!, periodicite: "autre" } } as Obligation;
    expect(controlerRythmeRetenu(sansRythme, articleDe).join()).toMatch(/n'est pas un rythme/);
  });
});

describe("empreinte", () => {
  it("un rythme retenu déplace l'empreinte ; son absence ne déplace rien", () => {
    const sans = obligationParId("formation-securite-etablissement-organisation")!;
    const avecR = { ...formationDefaut(), id: sans.id };
    expect(empreinteReferentiel([avecR])).not.toBe(empreinteReferentiel([sans]));
    // Un champ explicitement `undefined` produit la même chaîne qu'avant.
    expect(empreinteReferentiel([{ ...sans, rythmeRetenu: undefined }])).toBe(
      empreinteReferentiel([sans]),
    );
    // Passer du défaut à une norme, au même rythme, la déplace aussi.
    const norme = {
      ...avecR,
      rythmeRetenu: {
        motif: "norme",
        periodicite: "annuelle",
        norme: "NF S 61-919",
        reference: { source: "NORME", reference: "NF S 61-919 § 5.1.1", article: "NF S 61-919 § 5.1.1" },
      },
    } as Obligation;
    expect(empreinteReferentiel([norme])).not.toBe(empreinteReferentiel([avecR]));
  });
});

function applicable(o: Obligation, equipements: EquipementMatching[] = []): ObligationApplicable {
  return { obligation: o, equipementsConcernes: equipements, porteur: porteurDe(o), raisons: ["fixture"] };
}

describe("générateur et états permanents : une surface, jamais deux", () => {
  it("une récurrente `autre` à rythme retenu naît au calendrier, annuelle", () => {
    const sans = obligationParId("formation-securite-etablissement-organisation")!;
    expect(genererProchainesVerifications([applicable(sans)])).toEqual([]);
    const lignes = genererProchainesVerifications([applicable(formationDefaut())]);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].periodicite).toBe("annuelle");
    expect(lignes[0].sources.premierPas).toBe("annuelle");
    // Aucune date inventée ici : la ligne sera datée par `echeanceDeLigne`,
    // « à planifier » à l'origine de son suivi (ADR-036, règles 4 et 5).
    expect(lignes[0].sources.miseEnService).toBeNull();
  });

  it("un état permanent à rythme retenu quitte l'écran « en place » pour le calendrier", () => {
    const sans = obligationParId("incendie-travail-extincteurs-dotation")!;
    expect(estEtatADeclarer(sans)).toBe(true);
    const o = extincteursNorme();
    expect(estEtatADeclarer(o)).toBe(false);
    expect(estFaitADater(o)).toBe(false);
    expect(modeDeclaration(o)).toBeNull();
    // La garde de l'action et les liens vers l'écran passent par ces deux-là :
    // un POST « déclarer en place » sur une ligne passée au calendrier serait
    // la double surface que l'ADR-027 interdit.
    expect(modeDeclarationApplique(applicable(o))).toBeNull();
    expect(figureSurLEcranEnPlace(o)).toBe(false);
    expect(genererProchainesVerifications([applicable(o)])).toHaveLength(1);
  });

  it("le réconciliateur réaligne sur le rythme effectif, pas sur `autre`", () => {
    const table = periodicitesEffectives([applicable(formationDefaut())]);
    expect([...table.values()]).toEqual(["annuelle"]);
  });

  it("une ligne d'appareil reçoit le rythme retenu, par équipement", () => {
    const porte: EquipementMatching = { id: "eq-porte", libelle: "Porte", categorie: porteDefaut().categoriesEquipement![0], caracteristiques: null };
    const lignes = genererProchainesVerifications([applicable(porteDefaut(), [porte])]);
    expect(lignes.map((l) => [l.equipementId, l.periodicite])).toEqual([["eq-porte", "annuelle"]]);
  });
});

describe("préséance avec une prescription (ADR-039 § 3)", () => {
  it("face au texte : strictement plus stricte ; face à un rythme retenu : au moins aussi stricte", () => {
    const texte = obligationParId("incendie-erp-extincteurs-annuelle")!;
    expect(texte.periodicite).toBe("annuelle");
    expect(prescriptionRenforce("annuelle", texte)).toBe(false);
    expect(prescriptionRenforce("semestrielle", texte)).toBe(true);

    const retenu = porteDefaut();
    expect(prescriptionRenforce("annuelle", retenu)).toBe(true);
    expect(prescriptionRenforce("semestrielle", retenu)).toBe(true);
    expect(prescriptionRenforce("biennale", retenu)).toBe(false);
    expect(prescriptionRenforce("autre", retenu)).toBe(false);
  });

  it("une demande d'assureur égale au rythme retenu s'applique, marquée, et la ligne perd la mention de rythme retenu", () => {
    const o = porteDefaut();
    const porte: EquipementMatching = { id: "eq-porte", libelle: "Porte", categorie: o.categoriesEquipement![0], caracteristiques: null };
    const p: PrescriptionMatching = {
      id: "presc-assureur",
      source: "demande_assureur",
      effet: "renforce_periodicite",
      reference: "Contrat 2026",
      autorite: "Assureur",
      dateDocument: new Date("2026-03-01T00:00:00Z"),
      dateFin: null,
      obligationId: o.id,
      libelle: null,
      description: null,
      periodicite: "annuelle",
      realisateurRequis: ["personne_qualifiee"],
      categorieEquipement: null,
      equipementId: null,
    };
    const r = appliquerPrescriptions([applicable(o, [porte])], [p], [porte], new Date("2026-10-07T00:00:00Z"));
    expect(r.ignorees).toEqual([]);
    const s = r.applicables[0].surcharges?.["eq-porte"];
    expect(s?.prescriptionId).toBe("presc-assureur");
    expect(s?.raison).toMatch(/Engagement d'assurance/);
    const [ligne] = genererProchainesVerifications(r.applicables);
    expect(ligne.prescriptionId).toBe("presc-assureur");
    expect(mentionRythmeDeLigne(o, ligne)).toBeNull();
    expect(mentionRythmeDeLigne(o, { prescriptionId: null })).not.toBeNull();
  });
});

describe("la mention", () => {
  it("dit la norme comme norme, et le défaut comme défaut, avec le mot du texte", () => {
    const n = mentionRythmeRetenu(extincteursNorme())!;
    expect(n.court).toBe("Rythme de la norme NF S 61-919");
    expect(n.long).toContain("NF S 61-919 (août 2001), § 5.1.1");
    expect(n.long).toContain("pas un article de loi");
    const d = mentionRythmeRetenu(formationDefaut())!;
    expect(d.court).toBe("Rythme retenu par défaut");
    expect(d.long).toBe("Le texte dit « répétée périodiquement » ; rythme retenu par défaut : annuel.");
    expect(mentionRythmeRetenu(obligationParId("incendie-erp-extincteurs-annuelle")!)).toBeNull();
  });

  it("ne qualifie rien", () => {
    for (const m of [mentionRythmeRetenu(extincteursNorme())!, mentionRythmeRetenu(formationDefaut())!]) {
      expect(`${m.court} ${m.long}`).not.toMatch(/opposab|valeur\s+légale|fait\s+foi|en\s+règle|conforme/i);
    }
  });
});
