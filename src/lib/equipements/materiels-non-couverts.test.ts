import { describe, expect, it } from "vitest";
import { CORPUS, articlesNonCouverts } from "@/lib/referentiels/corpus";
import {
  ADRESSE_MANQUES_ANNONCES,
  ADRESSE_MATERIELS_NON_COUVERTS,
} from "@/lib/referentiels/corpus/adresses";
import type { Corpus } from "@/lib/referentiels/corpus/types";
import { ANNONCES } from "@/lib/perimetre/manques-annonces";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import { DESCRIPTION_CATEGORIE } from "./labels";
import {
  CLES_MATERIELS_NON_COUVERTS,
  MATERIELS_NON_COUVERTS,
  SANS_TEXTE_LU,
  AUCUN_TEXTE_LU,
  materielNonCouvert,
} from "./materiels-non-couverts";
import { equipementSchema } from "./schema";

// La liste des matériels non couverts (décision de la propriétaire du
// 2026-10-14). Trois gardes : la liste et le corpus se citent dans les deux
// sens ; AUCUN article non porté ne perd son adresse visible dans le
// déplacement ; la clé ne s'enregistre qu'en « Autre équipement ».

/** Les articles du corpus, à plat, avec leur texte. */
const articles = (corpus: readonly Corpus[] = CORPUS) => corpus.flatMap((c) => c.articles);

const refsCitees = () =>
  new Set(MATERIELS_NON_COUVERTS.flatMap((m) => m.references.flatMap((r) => (r.corpus ? [r.corpus] : []))));

/**
 * Où un article non porté est annoncé, résolu — `null` si l'adresse ne mène
 * nulle part. Trois adresses structurées, chacune vérifiée par ce qu'elle
 * désigne et non par sa seule présence :
 *  - la page « Ce que Rojer ne couvre pas » : l'article a une entrée dans
 *    `ANNONCES` ;
 *  - la liste des matériels non couverts : une entrée cite l'article ;
 *  - l'aide d'une catégorie : la phrase citée y figure mot pour mot.
 * Toute autre adresse (écran du permis de feu, carnet sanitaire…) est hors du
 * champ de ce test : elle n'a pas bougé le 2026-10-14.
 */
function resout(ref: string, declareA: string, cites: Set<string>): boolean {
  if (declareA === ADRESSE_MANQUES_ANNONCES) return ref in ANNONCES;
  if (declareA === ADRESSE_MATERIELS_NON_COUVERTS) return cites.has(ref);
  const m = /DESCRIPTION_CATEGORIE\.([A-Z_]+)`?\)?\s*:\s*«\s*([\s\S]+?)\s*»\s*$/.exec(declareA);
  if (m) {
    const aide = DESCRIPTION_CATEGORIE[m[1] as keyof typeof DESCRIPTION_CATEGORIE] ?? "";
    return aide.includes(m[2]);
  }
  return true;
}

/** Les clés d'une liste qui visent autre chose qu'un article citable par clé. */
function clesFautives(liste: typeof MATERIELS_NON_COUVERTS): string[] {
  const parRef = new Map(articles().map((a) => [a.ref, a] as const));
  return liste.flatMap((m) =>
    m.references.flatMap((r) => {
      if (!r.corpus) return [];
      const a = parRef.get(r.corpus);
      const admis =
        a !== undefined &&
        (a.statut === "retenu" ||
          a.statut === "sans_objet" ||
          (a.statut === "non_couvert" &&
            (a.declareA === ADRESSE_MATERIELS_NON_COUVERTS || a.declareA === ADRESSE_MANQUES_ANNONCES)));
      return admis ? [] : [`${m.cle} → ${r.corpus} (${a?.statut ?? "absent"})`];
    }),
  );
}

/** Les articles déplacés le 2026-10-14 : ceux dont l'adresse a changé. */
const DEPLACES = [
  "GZ 13",
  "GZ 14",
  "Arrêté 23-02-2018 art. 26 § 3",
  "AS 10",
  "R. 4323-63",
  "R. 1321-60",
  "Arrêté 10-09-2021 art. 4",
  "Arrêté 10-09-2021 art. 8",
  "Arrêté 10-09-2021 art. 9",
  "Arrêté 10-09-2021 art. 10",
  "Arrêté 10-09-2021 art. 12",
];

describe("matériels non couverts : la liste et le corpus se citent (2026-10-14)", () => {
  it("tout article qui donne la liste pour adresse y est cité par une entrée", () => {
    const cites = refsCitees();
    const orphelins = articles()
      .filter((a) => a.statut === "non_couvert" && a.declareA === ADRESSE_MATERIELS_NON_COUVERTS)
      .map((a) => a.ref)
      .filter((ref) => !cites.has(ref));
    expect(orphelins).toEqual([]);
  });

  it("toute référence de corpus citée par une entrée existe au corpus", () => {
    const connues = new Set(articles().map((a) => a.ref));
    expect([...refsCitees()].filter((r) => !connues.has(r))).toEqual([]);
  });

  it("toute entrée qui cite un article non porté le fait annoncer quelque part de visible", () => {
    // Un article `non_couvert` cité par la liste a pour adresse la liste, ou
    // la page (l'arrêté de 1986 art. 78-1 y reste, rubrique « Immeuble
    // d'habitation ») — jamais une note interne.
    const parRef = new Map(articles().map((a) => [a.ref, a] as const));
    for (const ref of refsCitees()) {
      const a = parRef.get(ref)!;
      if (a.statut !== "non_couvert") continue;
      expect([ADRESSE_MATERIELS_NON_COUVERTS, ADRESSE_MANQUES_ANNONCES], ref).toContain(a.declareA);
    }
  });

  it("une clé ne vise jamais un manque (revue de B, 2026-10-17, option (b) de c6)", () => {
    // Une clé vise un `non_couvert` adressé à la liste ou à la page, ou un
    // `retenu` / `sans_objet` cité en contexte. Un `obligation_manquante` cité
    // par clé passait pour annoncé : la piscine citait ainsi `X annexe`, et la
    // garde précédente ne regardait que les `non_couvert`.
    expect(clesFautives(MATERIELS_NON_COUVERTS)).toEqual([]);
  });

  it("cassure : l'entrée « Piscine » qui cite MS 41 par clé est vue", () => {
    const casse = MATERIELS_NON_COUVERTS.map((m) =>
      m.cle === "piscine_equipement_sportif"
        ? { ...m, references: [...m.references, { libelle: "MS 41", corpus: "MS 41" }] }
        : m,
    );
    expect(clesFautives(casse)).toEqual(["piscine_equipement_sportif → MS 41 (obligation_manquante)"]);
  });

  it("borne basse : la liste porte bien les articles déplacés de la page", () => {
    const parRef = new Map(articles().map((a) => [a.ref, a] as const));
    for (const ref of ["AS 10", "R. 4323-63", "R. 1321-60"]) {
      const a = parRef.get(ref);
      expect(a?.statut === "non_couvert" ? a.declareA : undefined, ref).toBe(
        ADRESSE_MATERIELS_NON_COUVERTS,
      );
    }
  });
});

describe("aucun article non porté ne perd son adresse visible (2026-10-14)", () => {
  it("chaque article déplacé reste `non_couvert`, et son adresse se résout", () => {
    const cites = refsCitees();
    const parRef = new Map(articles().map((a) => [a.ref, a] as const));
    for (const ref of DEPLACES) {
      const a = parRef.get(ref);
      expect(a?.statut, ref).toBe("non_couvert");
      const declareA = a?.statut === "non_couvert" ? (a.declareA ?? "") : "";
      expect(declareA, ref).not.toBe("");
      expect(resout(ref, declareA, cites), `${ref} : adresse qui ne mène nulle part`).toBe(true);
    }
  });

  it("aucun article non porté, déplacé ou non, n'a d'adresse structurée qui ne mène nulle part", () => {
    const cites = refsCitees();
    const morts = articlesNonCouverts()
      .filter((a) => a.declareA && !resout(a.ref, a.declareA, cites))
      .map((a) => a.ref);
    expect(morts).toEqual([]);
  });

  it("cassure : sans l'entrée « cabine UV », les quatre articles du bronzage sont orphelins (plan, § 3)", () => {
    const sansUv = new Set(
      MATERIELS_NON_COUVERTS.filter((m) => m.cle !== "cabine_uv").flatMap((m) =>
        m.references.flatMap((r) => (r.corpus ? [r.corpus] : [])),
      ),
    );
    const bronzage = CORPUS.find((c) => c.id === "csp-appareils-bronzage")!.articles;
    expect(bronzage.length).toBeGreaterThan(0);
    for (const a of bronzage) {
      expect(resout(a.ref, ADRESSE_MATERIELS_NON_COUVERTS, refsCitees()), a.ref).toBe(true);
      expect(resout(a.ref, ADRESSE_MATERIELS_NON_COUVERTS, sansUv), a.ref).toBe(false);
    }
  });

  it("épreuve : retirer une entrée de la liste rend son article orphelin", () => {
    // La garde ci-dessus, éprouvée sur une copie : sans l'entrée « échelle »,
    // R. 4323-63 garde une adresse qui ne mène plus nulle part.
    const sansEchelle = new Set(
      MATERIELS_NON_COUVERTS.filter((m) => m.cle !== "echelle").flatMap((m) =>
        m.references.flatMap((r) => (r.corpus ? [r.corpus] : [])),
      ),
    );
    expect(resout("R. 4323-63", ADRESSE_MATERIELS_NON_COUVERTS, sansEchelle)).toBe(false);
  });
});

/** La réserve de `AUCUN_TEXTE_LU`, écrite ici en toutes lettres : la garde ne se répare pas en raccourcissant la constante. */
const RESERVE = "ce qui ne veut pas dire qu'il n'en existe aucun.";

function sansReserve(liste: typeof MATERIELS_NON_COUVERTS): string[] {
  return liste
    .filter((m) => SANS_TEXTE_LU.has(m.cle))
    .filter((m) => !m.phrase.includes(AUCUN_TEXTE_LU) || !m.phrase.includes(RESERVE))
    .map((m) => m.cle);
}

describe("la liste elle-même", () => {
  it("une clé par entrée, et toutes les clés ont leur entrée", () => {
    expect(MATERIELS_NON_COUVERTS.map((m) => m.cle)).toEqual([...CLES_MATERIELS_NON_COUVERTS]);
  });

  it("le défibrillateur n'y est pas : une autre session l'encode", () => {
    const texte = JSON.stringify(MATERIELS_NON_COUVERTS).toLowerCase();
    expect(texte).not.toMatch(/défibrillateur|defibrillateur|\bdae\b/);
  });

  it("chaque phrase dit ce que Rojer ne suit pas, sans qualifier la situation", () => {
    for (const m of MATERIELS_NON_COUVERTS) {
      expect(m.phrase, m.cle).toMatch(/^Rojer ne suit pas /);
      expect(m.phrase.toLowerCase(), m.cle).not.toMatch(/conforme|en infraction|vous devez/);
      // ~~La piscine est hors du périmètre par décision (CLAUDE.md), sans texte
      // lu : elle n'a aucune référence~~ [2026-10-17, sous-lot B : elle cite
      // désormais D. 1332-1 et D. 1332-2, lus]. Une entrée sans texte lu n'a
      // aucune référence, rien ne s'imprime sous « Textes » (revue du
      // 2026-10-15), et sa phrase le dit ; toute autre entrée cite au moins un
      // texte.
      if (SANS_TEXTE_LU.has(m.cle)) {
        expect(m.references, m.cle).toEqual([]);
        expect(sansReserve([m]), m.cle).toEqual([]);
      } else expect(m.references.length, m.cle).toBeGreaterThan(0);
    }
  });

  it("une entrée sans texte lu porte la réserve entière (revue de B, 2026-10-17)", () => {
    expect(sansReserve(MATERIELS_NON_COUVERTS)).toEqual([]);
    expect(AUCUN_TEXTE_LU).toContain(RESERVE);
  });

  it("cassure : la réserve retirée d'une phrase sans texte est vue", () => {
    const casse = MATERIELS_NON_COUVERTS.map((m) =>
      m.cle === "fontaine_glacons" ? { ...m, phrase: m.phrase.replace(`, ${RESERVE}`, "") } : m,
    );
    expect(sansReserve(casse)).toEqual(["fontaine_glacons"]);
  });

  it("cuve de fioul : la phrase de l'ERP 1 à 4 dit au dirigeant ce qui fait apparaître CH 58 § 2 (contrôle visuel du 2026-10-17)", () => {
    expect(materielNonCouvert("cuve_fioul")?.phrase).toContain(
      "(art. CH 58 § 2) n'apparaît dans Rojer que si vous déclarez aussi une ventilation mécanique (VMC) ou une centrale de traitement d'air.",
    );
  });

  it("une orientation mène à une catégorie suivie, jamais à « Autre »", () => {
    for (const m of MATERIELS_NON_COUVERTS) {
      if (!m.orienteVers) continue;
      expect(CATEGORIES_EQUIPEMENT, m.cle).toContain(m.orienteVers.categorie);
      expect(m.orienteVers.categorie, m.cle).not.toBe("AUTRE");
    }
    // La chaudière gaz oriente vers l'installation de gaz (décision du 2026-10-14).
    expect(materielNonCouvert("chaudiere")?.orienteVers?.categorie).toBe("INSTALLATION_GAZ");
    // 2026-10-17, sous-lot F : l'art. 2 de l'arrêté du 1er février 2010 nomme
    // les bains à remous parmi les points d'usage à risque.
    expect(materielNonCouvert("bain_a_remous")?.orienteVers?.categorie).toBe(
      "EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC",
    );
    // Contrôle visuel du 2026-10-17 : l'encart se lit d'une traite — il ne
    // dit plus « hors de son périmètre » avant de renvoyer vers une catégorie
    // suivie.
    const bain = materielNonCouvert("bain_a_remous")!;
    expect(bain.phrase).not.toContain("hors de son périmètre");
    expect(bain.phrase).toContain("le bain à remous lui-même");
    expect(bain.orienteVers!.phrase).toMatch(/^Si son eau chaude est produite en commun/);
  });

  it("une clé inconnue ne rend rien", () => {
    expect(materielNonCouvert("defibrillateur")).toBeNull();
    expect(materielNonCouvert(null)).toBeNull();
  });
});

describe("la clé s'enregistre en « Autre équipement », validée contre la liste", () => {
  const base = { libelle: "Escabeau de la réserve" };

  it("acceptée en catégorie AUTRE", () => {
    const r = equipementSchema.safeParse({ ...base, categorie: "AUTRE", materielNonCouvert: "echelle" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.materielNonCouvert).toBe("echelle");
  });

  it("refusée sur une catégorie suivie", () => {
    const r = equipementSchema.safeParse({ ...base, categorie: "EXTINCTEUR", materielNonCouvert: "echelle" });
    expect(r.success).toBe(false);
  });

  it("refusée hors de la liste", () => {
    const r = equipementSchema.safeParse({ ...base, categorie: "AUTRE", materielNonCouvert: "defibrillateur" });
    expect(r.success).toBe(false);
  });

  it("vide : aucun matériel", () => {
    const r = equipementSchema.safeParse({ ...base, categorie: "AUTRE", materielNonCouvert: "" });
    expect(r.success && r.data.materielNonCouvert).toBeUndefined();
  });
});
