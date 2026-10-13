import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { LIBELLE_ACTIVITE, matchTypologie } from "@/lib/matching/engine";
import type { EtablissementMatching } from "@/lib/matching/types";
import { CORPUS } from "@/lib/referentiels/corpus";
import type { ArticleDepouille } from "@/lib/referentiels/corpus/types";
import {
  TYPES_ERP,
  TYPES_ERP_A_SOMMEIL_PLAUSIBLE,
  type TypologieApplication,
} from "@/lib/referentiels/types-communs";
import {
  CRITERES_TYPOLOGIE,
  JAMAIS_RETENUE,
  LECTURE_LISIBLE,
  LEGENDE_REGIME,
  pourHelvetica,
  releveDe,
  STATUT_LISIBLE,
  texteProvenance,
  texteTypologie,
} from "./textes-grille-relecture";

/** La typologie d'une obligation réelle du référentiel — absente, le test tombe. */
function typo(id: string): TypologieApplication {
  const o = obligationsConformite.find((x) => x.id === id);
  if (!o) throw new Error(`obligation absente du référentiel : ${id}`);
  return o.typologies;
}

describe("texteTypologie — la ligne « Régime » de la grille de relecture", () => {
  // UNE TYPOLOGIE RÉELLE PAR CRITÈRE, et des assertions sur le SENS de la
  // phrase (revue de lot/dossier-relecture-2, C3) : « sauf » contre « de »,
  // « au moins » contre « au plus », le sort du silence. Une phrase qui dit le
  // contraire du moteur doit faire tomber un test, pas seulement une phrase
  // absente.

  it("hors champ de R. 4227-34 (R. 4227-37 al. 2) : « moins de 51 », jamais « au moins 51 », et le silence écarte", () => {
    const t = typo("incendie-travail-instructions-evacuation");
    expect(t.horsChampR422734).toBe(true);
    const ligne = texteTypologie(t);
    expect(ligne).not.toMatch(/au moins \d+ personnes/);
    expect(ligne).toContain(`moins de ${t.personnesPresentesMin} personnes habituellement présentes`);
    expect(ligne).toContain("matières R. 4227-22 déclarées « non »");
    expect(ligne).toContain(
      "matières sans réponse, ou ERP sans nombre de personnes déclaré : écartée, la consigne est retenue",
    );
    expect(ligne).not.toContain("à confirmer");
  });

  it("champ de R. 4227-34 : seuil OU matières « oui », matières muettes et ERP sans nombre → à confirmer (C1)", () => {
    const t = typo("incendie-travail-consigne-affichee");
    expect(t.champR422734).toBe(true);
    const ligne = texteTypologie(t);
    expect(ligne).toContain(
      `au moins ${t.personnesPresentesMin} personnes habituellement présentes OU matières R. 4227-22 déclarées « oui »`,
    );
    expect(ligne).toContain("sous le seuil, matières sans réponse : à confirmer");
    expect(ligne).toContain("ERP sans nombre de personnes déclaré");
    expect(ligne).toMatch(/ERP sans nombre de personnes déclaré[^;)]*: à confirmer/);
  });

  it("exclusion par type : « sauf type O », jamais « de type O », sans parler d'un type non déclaré (C-b)", () => {
    const t = typo("incendie-erp-5-instruction-personnel");
    expect(t.erp).toEqual({ categories: ["N5"], typesExclus: ["O"] });
    const ligne = texteTypologie(t);
    expect(ligne).toContain("sauf type O");
    expect(ligne).not.toMatch(/de type O\b/);
    expect(ligne).not.toContain("non déclaré");
  });

  it("restriction par type : « de type O », sans « sauf »", () => {
    const ligne = texteTypologie(typo("incendie-hotel-po-instruction-personnel-semestrielle"));
    expect(ligne).toMatch(/de type O\b/);
    expect(ligne).not.toContain("sauf");
  });

  it("catégorie : « 5ᵉ catégorie » comme le moteur, jamais « N5 » (R4)", () => {
    expect(texteTypologie(typo("incendie-erp-5-consignes-affichees"))).toBe(
      "ERP de 5ᵉ catégorie",
    );
    const n1a4 = texteTypologie(typo("elec-erp-presence-personne-qualifiee"));
    expect(n1a4).toBe("ERP de 1ʳᵉ ou 2ᵉ catégorie");
  });

  it("locaux à sommeil exigés : seuls les types plausibles (lus dans la constante), le silence → à confirmer (B1)", () => {
    const t = typo("incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale");
    expect(t.locauxSommeilPublic).toBe(true);
    const ligne = texteTypologie(t);
    expect(ligne).toContain("locaux à sommeil pour le public, seulement en ERP de type");
    for (const type of TYPES_ERP_A_SOMMEIL_PLAUSIBLE) expect(ligne).toMatch(new RegExp(`\\b${type}\\b`));
    expect(ligne).toContain("tout autre type : jamais, même sur un « oui »");
    expect(ligne).toContain("sans réponse : à confirmer");
    expect(ligne).not.toContain("sans locaux");
  });

  it("allègement sans locaux à sommeil : exige le « non » déclaré, le silence écarte", () => {
    const t = typo("incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale");
    expect(t.locauxSommeilPublic).toBe(false);
    const ligne = texteTypologie(t);
    expect(ligne).toContain("sans locaux à sommeil pour le public, « non » déclaré");
    expect(ligne).toContain("sans réponse : écartée");
    expect(ligne).not.toContain("à confirmer");
    expect(ligne).not.toContain("seulement en ERP");
  });

  it("fait d'activité : le « non » écarte, le silence → à confirmer — jamais « oui » exigé", () => {
    for (const [id, cle] of [
      ["formation-securite-etablissement-manutention", "manutentionManuelle"],
      ["epi-etablissement-consigne-utilisation", "epiPresents"],
    ] as const) {
      const ligne = texteTypologie(typo(id));
      expect(ligne).toContain(LIBELLE_ACTIVITE[cle]);
      expect(ligne).toContain("« non » : écartée");
      expect(ligne).toContain("sans réponse : à confirmer");
      expect(ligne).not.toContain("« oui »");
    }
  });

  it("SSI de catégorie A ou B : même règle que les faits d'activité", () => {
    const ligne = texteTypologie(typo("incendie-erp-desenfumage-triennale-mecanique-ssi"));
    expect(ligne).toContain(LIBELLE_ACTIVITE.ssiCategorieAouB);
    expect(ligne).toContain("« non » : écartée ; sans réponse : à confirmer");
  });

  it("effectif compté à l'entreprise : « au moins », et la prudence du site au-dessus (C2)", () => {
    const ligne = texteTypologie(typo("prevention-etablissement-reglement-interieur"));
    expect(ligne).toContain("effectif de l'entreprise d'au moins 50");
    expect(ligne).toContain("entreprise sous le seuil mais site au-dessus : à confirmer");
    expect(ligne).not.toContain("établissement");
    expect(ligne).not.toContain("au plus");
  });

  it("effectif compté à l'établissement : seuil bas « au moins », plafond « au plus », sans prudence", () => {
    const bas = texteTypologie(typo("locaux-etablissement-local-restauration"));
    expect(bas).toContain("effectif de l'établissement d'au moins 50");
    expect(bas).not.toContain("au plus");
    expect(bas).not.toContain("à confirmer");
    const haut = texteTypologie(typo("locaux-etablissement-emplacement-restauration"));
    expect(haut).toContain("effectif de l'établissement d'au plus 49");
    expect(haut).not.toContain("au moins");
  });

  it("séparateurs : « ou » entre régimes, « ; et » devant une condition (C4)", () => {
    const quatre = obligationsConformite.find(
      (o) => o.typologies.travail && o.typologies.erp === true && o.typologies.igh === true,
    );
    expect(quatre).toBeDefined();
    expect(texteTypologie(quatre!.typologies)).toBe("Travail ou ERP ou IGH ou Habitation");
    const horsErp = obligationsConformite.find(
      (o) => o.typologies.travail === true && o.typologies.erp === false,
    );
    expect(texteTypologie(horsErp!.typologies)).toBe("Travail ; et hors ERP");
    expect(texteTypologie(typo("prevention-etablissement-reglement-interieur"))).toMatch(
      /^Travail ; et effectif/,
    );
  });

  // Pas de liste de clés recopiée ici : le compilateur tient l'exhaustivité
  // (`Required<TypologieApplication>` dans le module). Ce test-ci tient l'autre
  // moitié — qu'une clé RENDUE ne le soit pas par un `null` de convenance —, sur
  // les typologies que le référentiel écrit réellement.
  it("retirer n'importe quel critère d'une typologie du référentiel change sa ligne", () => {
    const tues: string[] = [];
    let essais = 0;
    for (const o of obligationsConformite) {
      for (const k of Object.keys(o.typologies) as (keyof TypologieApplication)[]) {
        const sans = { ...o.typologies };
        delete sans[k];
        essais++;
        if (texteTypologie(sans) === texteTypologie(o.typologies)) {
          tues.push(`${o.id} : ${k}`);
        }
      }
    }
    expect(essais).toBeGreaterThan(obligationsConformite.length);
    expect(tues).toEqual([]);
  });

  it("chaque critère du référentiel figure parmi les critères rendus", () => {
    const rendus = new Set<string>(CRITERES_TYPOLOGIE);
    const ecrits = new Set(obligationsConformite.flatMap((o) => Object.keys(o.typologies)));
    expect([...ecrits].filter((k) => !rendus.has(k))).toEqual([]);
  });

  it("les critères sans obligation porteuse aujourd'hui ont aussi leur phrase", () => {
    expect(texteTypologie({ travail: false })).toBe(`hors Travail — ${JAMAIS_RETENUE}`);
    expect(texteTypologie({ igh: false })).toBe(`hors IGH — ${JAMAIS_RETENUE}`);
    expect(texteTypologie({ habitation: false })).toBe(`hors habitation — ${JAMAIS_RETENUE}`);
    expect(texteTypologie({ habitation: { familles: ["DEUXIEME"] } })).toBe(
      "Habitation de famille DEUXIEME (famille non déclarée : à confirmer)",
    );
    expect(texteTypologie({ horsChampR422734: true })).toContain("jamais retenue");
    expect(texteTypologie({ champR422734: true })).toBe(
      "matières R. 4227-22 déclarées « oui » (sans réponse : à confirmer)",
    );
    expect(texteTypologie({})).toBe(JAMAIS_RETENUE);
  });
});

describe("releveDe — le relevé imprimé sous chaque référence", () => {
  // Non tautologique (revue, R1) : l'attendu n'est pas `indexArticlesParRef()`
  // relu, mais la règle de départage refaite à la main sur `CORPUS` — le
  // premier corpus qui a DÉPOUILLÉ l'article, à défaut le premier qui le cite.
  // Et le test exige qu'au moins un article cité soit en doublon avec un
  // dernier différent du premier : sinon il ne départagerait rien.
  function attendu(ref: string): ArticleDepouille | undefined {
    const tous = CORPUS.flatMap((c) => c.articles).filter((a) => a.ref === ref);
    return tous.find((a) => a.statut !== "non_depouille") ?? tous[0];
  }

  it("est le premier dépouillé de CORPUS, pour toute référence citée — doublons de corpus compris", () => {
    const refs = obligationsConformite
      .flatMap((o) => o.referencesLegales)
      .filter((r) => r.article);
    const ecarts = refs.filter((r) => releveDe(r) !== attendu(r.article!)).map((r) => r.article);
    expect(ecarts).toEqual([]);

    const departages = refs.filter((r) => {
      const tous = CORPUS.flatMap((c) => c.articles).filter((a) => a.ref === r.article);
      return tous.length > 1 && tous[tous.length - 1] !== releveDe(r);
    });
    expect(departages.length).toBeGreaterThan(0);
    // R. 4121-4 : le dernier corpus n'a pas de citation, le premier en a une.
    const r41214 = refs.find((r) => r.article === "R. 4121-4");
    expect(releveDe(r41214!)?.citationCle).toBeTruthy();
  });

  it("une référence sans clé d'article n'a pas de relevé", () => {
    expect(releveDe({})).toBeUndefined();
  });
});

describe("texteProvenance — la ligne sous chaque référence du dossier détaillé", () => {
  const base = {
    ref: "R. 0000-0",
    statut: "retenu",
    obligations: [],
  } as unknown as ArticleDepouille;

  it("dit le statut, la lecture et la date de lecture", () => {
    const a = { ...base, lecture: "premiere_main", luLe: "2026-09-03" } as ArticleDepouille;
    expect(texteProvenance(a, {})).toBe(
      "corpus : retenu · lecture : première main · lu le 2026-09-03",
    );
  });

  it("dit le silence : un mode de lecture non noté s'imprime comme tel", () => {
    expect(texteProvenance(base, {})).toBe("corpus : retenu · mode de lecture non noté");
  });

  it("ne répète pas la version constatée, mais imprime l'écart avec le corpus", () => {
    const a = { ...base, versionEnVigueur: "2011-11-10" } as ArticleDepouille;
    expect(texteProvenance(a, { versionConstatee: "2011-11-10" })).not.toContain("version");
    expect(texteProvenance(a, { versionConstatee: "2008-05-01" })).toContain(
      "version lue au corpus 2011-11-10",
    );
    expect(texteProvenance(a, {})).toContain("version lue au corpus 2011-11-10");
  });

  it("chaque référence citée qui a un relevé reçoit sa ligne, avec le statut et la lecture du corpus", () => {
    const refs = obligationsConformite.flatMap((o) => o.referencesLegales);
    const avecReleve = refs.filter((r) => releveDe(r) !== undefined);
    expect(avecReleve.length).toBeGreaterThan(0);
    const fautives = avecReleve.filter((r) => {
      const a = releveDe(r)!;
      const ligne = texteProvenance(a, r);
      return (
        !ligne.startsWith(`corpus : ${STATUT_LISIBLE[a.statut]}`) ||
        (a.lecture !== undefined && !ligne.includes(LECTURE_LISIBLE[a.lecture])) ||
        (a.luLe !== undefined && !ligne.includes(a.luLe))
      );
    });
    expect(fautives.map((r) => r.article)).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// Le texte contre le moteur (seconde revue, C-c). Chaque phrase qui nomme une
// issue — retenue, écartée, à confirmer — est confrontée à `matchTypologie`
// sur l'établissement du cas : le fragment doit être dans la ligne, ET le
// moteur doit rendre l'issue que le fragment annonce. Les cas sont ceux des
// sondes de la revue (`evaluerObligation` sur les vraies obligations).
// -----------------------------------------------------------------------------

const ETAB = {
  id: "e",
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
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
} as unknown as EtablissementMatching;

type Issue = "retenue" | "écartée" | "à confirmer";
type Patch = Record<string, unknown>;

function issue(t: TypologieApplication, patch: Patch): Issue {
  const r = matchTypologie(t, { ...ETAB, ...patch } as EtablissementMatching);
  if (!r.ok) return "écartée";
  return r.sansReponse?.length || r.effectifAConfirmer ? "à confirmer" : "retenue";
}

const ERP = (categorieErp: string, typeErp: string): Patch => ({ estERP: true, categorieErp, typeErp });

const CONSIGNE = "incendie-travail-consigne-affichee";
const INSTRUCTIONS = "incendie-travail-instructions-evacuation";
const SOMMEIL = "incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale";
const SANS_SOMMEIL = "incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale";
const PE4 = "incendie-erp-pe4-entretien-installations-techniques";
const MANUT = "formation-securite-etablissement-manutention";
const SSI = "incendie-erp-desenfumage-triennale-mecanique-ssi";
const RI = "prevention-etablissement-reglement-interieur";

// [obligation, cas, établissement, issue, fragment de la ligne qui la dit]
const CAS: [string, string, Patch, Issue, string][] = [
  [SOMMEIL, "type R, « oui »", { ...ERP("N4", "R"), comporteLocauxSommeilPublic: true }, "retenue", "seulement en ERP de type"],
  [SOMMEIL, "type R, silence", { ...ERP("N4", "R"), comporteLocauxSommeilPublic: null }, "à confirmer", "(sans réponse : à confirmer)"],
  [SOMMEIL, "type R, « non »", { ...ERP("N4", "R"), comporteLocauxSommeilPublic: false }, "écartée", "seulement en ERP de type"],
  [SOMMEIL, "type N, « oui »", { ...ERP("N4", "N"), comporteLocauxSommeilPublic: true }, "écartée", "tout autre type : jamais, même sur un « oui »"],
  [SANS_SOMMEIL, "type R, « non »", { ...ERP("N4", "R"), comporteLocauxSommeilPublic: false }, "retenue", "« non » déclaré"],
  [SANS_SOMMEIL, "type R, silence", { ...ERP("N4", "R"), comporteLocauxSommeilPublic: null }, "écartée", "(sans réponse : écartée)"],
  [PE4, "5ᵉ type O", ERP("N5", "O"), "écartée", "sauf type O"],
  [PE4, "5ᵉ type N", ERP("N5", "N"), "retenue", "ERP de 5ᵉ catégorie"],
  ["incendie-erp-visite-commission-cat4-quinquennale", "4ᵉ type U", ERP("N4", "U"), "écartée", "de type L, M"],
  ["elec-erp-presence-personne-qualifiee", "ERP de 5ᵉ : la catégorie restreint en plus", ERP("N5", "N"), "écartée", "de 1ʳᵉ ou 2ᵉ catégorie"],
  [MANUT, "« oui »", { manutentionManuelle: true }, "retenue", "manutention manuelle"],
  [MANUT, "« non »", { manutentionManuelle: false }, "écartée", "« non » : écartée"],
  [MANUT, "silence", { manutentionManuelle: null }, "à confirmer", "sans réponse : à confirmer"],
  [SSI, "ERP 3ᵉ, SSI « oui »", { ...ERP("N3", "N"), ssiCategorieAouB: true }, "retenue", "catégorie A ou B"],
  [SSI, "ERP 3ᵉ, SSI « non »", { ...ERP("N3", "N"), ssiCategorieAouB: false }, "écartée", "« non » : écartée"],
  [SSI, "ERP 3ᵉ, SSI silence", { ...ERP("N3", "N"), ssiCategorieAouB: null }, "à confirmer", "sans réponse : à confirmer"],
  [RI, "entreprise 55, site 8", { effectifEntreprise: 55 }, "retenue", "effectif de l'entreprise d'au moins 50"],
  [RI, "entreprise 30, site 55", { effectifEntreprise: 30, effectifSurSite: 55 }, "à confirmer", "entreprise sous le seuil mais site au-dessus : à confirmer"],
  [RI, "entreprise 30, site 30", { effectifEntreprise: 30, effectifSurSite: 30 }, "écartée", "effectif de l'entreprise d'au moins 50"],
  ["locaux-etablissement-emplacement-restauration", "site 49", { effectifSurSite: 49 }, "retenue", "d'au plus 49"],
  ["locaux-etablissement-emplacement-restauration", "site 50", { effectifSurSite: 50 }, "écartée", "d'au plus 49"],
  ["locaux-etablissement-local-restauration", "site 49", { effectifSurSite: 49 }, "écartée", "d'au moins 50"],
  [CONSIGNE, "travail seul 8, matières silence", {}, "à confirmer", "sous le seuil, matières sans réponse : à confirmer"],
  [CONSIGNE, "travail seul 8, matières « non »", { manipuleMatieresR422722: false }, "écartée", "OU matières R. 4227-22 déclarées « oui »"],
  [CONSIGNE, "travail seul 8, matières « oui »", { manipuleMatieresR422722: true }, "retenue", "OU matières R. 4227-22 déclarées « oui »"],
  [CONSIGNE, "travail seul 60, matières silence : au-dessus, due", { effectifSurSite: 60, effectifEntreprise: 60 }, "retenue", "au moins 51 personnes"],
  [CONSIGNE, "ERP 5ᵉ sans nombre, matières « non »", { ...ERP("N5", "N"), manipuleMatieresR422722: false }, "à confirmer", "ERP sans nombre de personnes déclaré, que sa catégorie et son effectif ne placent pas au-dessus : à confirmer"],
  [CONSIGNE, "ERP 3ᵉ sans nombre, matières « non » : la catégorie place au-dessus", { ...ERP("N3", "N"), manipuleMatieresR422722: false }, "retenue", "que sa catégorie et son effectif ne placent pas au-dessus"],
  [INSTRUCTIONS, "travail seul 8 sans nombre, matières « non »", { manipuleMatieresR422722: false }, "retenue", "moins de 51 personnes habituellement présentes ET matières R. 4227-22 déclarées « non »"],
  [INSTRUCTIONS, "travail seul 8, matières silence", {}, "écartée", "(matières sans réponse, ou ERP sans nombre de personnes déclaré : écartée"],
  [INSTRUCTIONS, "ERP 5ᵉ sans nombre, matières « non »", { ...ERP("N5", "N"), manipuleMatieresR422722: false }, "écartée", "ou ERP sans nombre de personnes déclaré : écartée"],
  [INSTRUCTIONS, "ERP 5ᵉ, 30 déclarées, matières « non »", { ...ERP("N5", "N"), personnesPresentesHabituellement: 30, manipuleMatieresR422722: false }, "retenue", "moins de 51 personnes"],
  [INSTRUCTIONS, "travail seul 60, matières « non »", { effectifSurSite: 60, effectifEntreprise: 60, manipuleMatieresR422722: false }, "écartée", "moins de 51 personnes"],
];

describe("texteTypologie contre matchTypologie — l'issue que la phrase annonce est celle du moteur", () => {
  it.each(CAS)("%s — %s", (id, _cas, patch, attendue, fragment) => {
    expect(texteTypologie(typo(id))).toContain(fragment);
    expect(issue(typo(id), patch)).toBe(attendue);
  });

  it("locaux à sommeil : la phrase cite EXACTEMENT les types de la constante, qui seuls retiennent sur un « oui »", () => {
    const ligne = texteTypologie(typo(SOMMEIL));
    const m = /seulement en ERP de type (.+?) — tout autre type/.exec(ligne);
    expect(m).not.toBeNull();
    const cites = m![1].split(/, | ou /);
    expect([...cites].sort()).toEqual([...TYPES_ERP_A_SOMMEIL_PLAUSIBLE].sort());
    for (const type of TYPES_ERP) {
      const plausible = (TYPES_ERP_A_SOMMEIL_PLAUSIBLE as readonly string[]).includes(type);
      expect(
        issue({ erp: true, locauxSommeilPublic: true }, { ...ERP("N5", type), comporteLocauxSommeilPublic: true }),
        type,
      ).toBe(plausible ? "retenue" : "écartée");
    }
  });

  it("aucun régime ni critère positif : « jamais retenue », et le moteur écarte (C-d)", () => {
    for (const t of [{}, { travail: false }, { erp: false, igh: false }] as TypologieApplication[]) {
      expect(texteTypologie(t)).toContain(JAMAIS_RETENUE);
      for (const patch of [{}, ERP("N5", "N"), { ...ERP("N5", "N"), estEtablissementTravail: false }]) {
        expect(issue(t, patch)).toBe("écartée");
      }
    }
    // Aucune obligation du référentiel n'est dans ce cas.
    expect(
      obligationsConformite
        .filter((o) => texteTypologie(o.typologies).includes(JAMAIS_RETENUE))
        .map((o) => o.id),
    ).toEqual([]);
  });
});

describe("pourHelvetica — ponctuation haute (seconde revue, R-c)", () => {
  it("met une espace insécable avant « ; » et « : », jamais une espace sécable", () => {
    expect(pourHelvetica("Travail ; et effectif : 50")).toBe("Travail ; et effectif : 50");
    expect(pourHelvetica(texteTypologie(typo(RI)))).not.toMatch(/ [;:]/);
  });
});

describe("LEGENDE_REGIME — ce que la légende doit dire (seconde revue, R-a et C-b)", () => {
  it("les séparateurs, la restriction EN PLUS du régime, le type et la catégorie exigés en base, « à confirmer »", () => {
    expect(LEGENDE_REGIME).toContain("« ou » sépare les régimes, dont un seul suffit");
    expect(LEGENDE_REGIME).toContain("« ; et » ajoute une condition");
    expect(LEGENDE_REGIME).toContain("La catégorie, le type, la classe ou la famille écrits après un régime restreignent EN PLUS");
    expect(LEGENDE_REGIME).toContain("même s'il relève aussi d'un autre régime de la ligne");
    expect(LEGENDE_REGIME).toContain("Le type et la catégorie d'ERP sont toujours renseignés (exigés en base)");
    // La restriction en plus, dite par la légende, est celle du moteur : un
    // employeur en ERP de 5ᵉ n'a pas une ligne bornée aux 1ʳᵉ et 2ᵉ catégories
    // par sa seule qualité d'employeur (bloc 1 bis de `matchTypologie`).
    const t = { travail: true, erp: { categories: ["N1", "N2"] } } as TypologieApplication;
    expect(issue(t, {})).toBe("retenue");
    expect(issue(t, ERP("N5", "N"))).toBe("écartée");
  });
});
