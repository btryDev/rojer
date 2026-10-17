// Le document de couverture cite-t-il encore les bons articles ?
//
// `docs/couverture-declaree-du-produit.md` a remplacé une surface **vivante**
// — une carte du tableau de bord, recalculée à chaque rendu — par une surface
// **figée**. Il porte donc une liste vraie aujourd'hui et fausse le jour où le
// corpus bouge, sans que rien ne le signale. Un document de référence qui se
// périme en silence est pire qu'un document absent : on s'y fie.
//
// Ce test est du même genre que `frontiere-medicale.test.ts` et
// `portee.test.ts`, qui lisent déjà le texte source de `src/` et échouent sur
// des motifs interdits. Ici la cible est de la prose, mais la garantie porte
// sur des **références**, pas sur des phrases : une reformulation ne doit pas
// le casser, l'ajout ou le retrait d'un article, si.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORPUS, articlesNonCouverts } from "./index";
import { ADRESSE_MANQUES_ANNONCES, ADRESSE_MATERIELS_NON_COUVERTS } from "./adresses";

const CHEMIN = "docs/couverture-declaree-du-produit.md";

/** Les deux adresses où une annonce a pu être déplacée le 2026-10-14. */
function estAdresseDeplacee(declareA: string): boolean {
  return declareA.includes("DESCRIPTION_CATEGORIE.") || declareA === ADRESSE_MATERIELS_NON_COUVERTS;
}

function documentCouverture(): string {
  return readFileSync(path.join(process.cwd(), CHEMIN), "utf8");
}

/**
 * Le titre de la section HORS CADRE (C45, 2026-09-27). Elle liste des
 * `obligation_manquante`, pas des `non_couvert` : ses références ne sont pas
 * des surnuméraires du § 3, elles ont leur propre égalité, tenue plus bas.
 */
const HORS_CADRE = "## 7. Hors cadre — couvert par la clause générale des mentions légales (à rédiger)";

/**
 * La section des manques entrés dans la cible le 2026-10-12, quand elle a cessé
 * d'être `CATEGORIES_COUVERTES` pour devenir ce que l'onboarding ne refuse pas.
 * ~~Ouverts, non classés : ni hors cadre, ni annoncés.~~ Classés le
 * 2026-10-13 par la propriétaire : encodés, annoncés ou hors cadre.
 */
const A_EVALUER = "## 8. Classés le 2026-10-13 — entrés dans la cible le 2026-10-12";

/**
 * 2026-10-16 — les manques nés de la lecture des chapitres de types d'ERP,
 * OUVERTS : ni encodés, ni annoncés, ni hors cadre, en attente de la décision
 * de la propriétaire. Même mécanisme que le § 8 du 2026-10-12 : le § 7 et
 * cette section, disjoints, font ensemble les `obligation_manquante` de la
 * cible. Quand la propriétaire aura tranché, chaque ligne sort d'ici.
 */
const OUVERTS_1016 = "## 9. À évaluer — lecture des chapitres de types d'ERP du 2026-10-16";

/** Le document sans ses sections hors cadre et à évaluer, et chacune seule. */
function decoupe(doc: string): {
  avant: string;
  horsCadre: string;
  aEvaluer: string;
  ouverts: string;
} {
  const i = doc.indexOf(HORS_CADRE);
  const j = doc.indexOf(A_EVALUER);
  const k = doc.indexOf(OUVERTS_1016);
  const finHorsCadre = j >= 0 ? j : k >= 0 ? k : doc.length;
  const finAEvaluer = k < 0 ? doc.length : k;
  return {
    avant: i < 0 ? doc : doc.slice(0, i),
    horsCadre: i < 0 ? "" : doc.slice(i, finHorsCadre),
    aEvaluer: j < 0 ? "" : doc.slice(j, finAEvaluer),
    ouverts: k < 0 ? "" : doc.slice(k),
  };
}

/**
 * Les références telles que le document doit les citer : entre accents graves,
 * la forme qu'il emploie pour toutes.
 *
 * On cherche la référence **exacte** entre délimiteurs, et non le texte nu :
 * « PE 3 » est un préfixe de « PE 30 », et une recherche par sous-chaîne
 * tiendrait le second pour une citation du premier.
 */
/** Les références de la première colonne d'un tableau du document. */
function refsDuTableau(section: string): string[] {
  return [...section.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
}

function citeLaRef(doc: string, ref: string): boolean {
  return doc.includes(`\`${ref}\``);
}

describe(`${CHEMIN} — la liste ne se périme pas en silence`, () => {
  it("cite chacun des articles que le corpus déclare non couverts", () => {
    const doc = documentCouverture();
    const manquantes = articlesNonCouverts()
      .map((a) => a.ref)
      .filter((ref) => !citeLaRef(doc, ref));

    expect(
      manquantes,
      manquantes.length === 0
        ? ""
        : `Le corpus déclare ${articlesNonCouverts().length} articles ` +
          `\`non_couvert\`, et ${CHEMIN} n'en cite pas ${manquantes.length} : ` +
          `${manquantes.map((r) => `« ${r} »`).join(", ")}. ` +
          `Ajoutez-les au § 3 du document, dans la famille qui convient, avec ` +
          `le motif du corpus cité tel quel — un motif réécrit vieillit à part ` +
          `de sa source.`,
    ).toEqual([]);
  });

  it("ne cite aucun article que le corpus ne déclare plus", () => {
    // L'autre sens, et il compte autant : un article couvert depuis, ou
    // requalifié en `obligation_manquante`, laisserait le document affirmer
    // un manque qui n'existe plus. C'est la moitié qu'on oublie.
    // Hors de la section hors cadre (C45), qui a sa propre garde ci-dessous.
    const doc = decoupe(documentCouverture()).avant;
    const declarees = new Set(articlesNonCouverts().map((a) => a.ref));

    // Les références du document : tout ce qui ressemble à une référence
    // d'article entre accents graves. On ne ratisse pas les identifiants de
    // code (`typeErp`, `familles.ts`…), d'où l'ancrage sur la forme
    // « LETTRES chiffre » ou « Arrêté … ».
    const citees = [...doc.matchAll(/`([A-Z]{2}\s\d+[^`]*|Arrêté[^`]+)`/g)].map(
      (m) => m[1],
    );

    const surnumeraires = [...new Set(citees)].filter(
      (ref) => !declarees.has(ref),
    );

    expect(
      surnumeraires,
      surnumeraires.length === 0
        ? ""
        : `${CHEMIN} cite ${surnumeraires.length} référence(s) que le corpus ` +
          `ne déclare plus \`non_couvert\` : ` +
          `${surnumeraires.map((r) => `« ${r} »`).join(", ")}. ` +
          `Soit l'article a été couvert depuis — retirez-le du § 3 et dites-le ` +
          `au § 3 bis —, soit la référence est mal orthographiée dans le ` +
          `document.`,
    ).toEqual([]);
  });

  it("annonce le bon nombre d'articles", () => {
    // Le document répète « 27 » dans son titre de section et dans sa prose.
    // Un compte faux dans un document de référence est plus trompeur qu'une
    // liste incomplète : on lit le chiffre, pas la liste.
    const n = articlesNonCouverts().length;
    const doc = documentCouverture();
    expect(
      doc.includes(`## 3. Les ${n} articles lus et non portés`),
      `Le corpus déclare ${n} articles \`non_couvert\`, et le titre du § 3 de ` +
        `${CHEMIN} en annonce un autre nombre. Mettez-le à jour, ainsi que les ` +
        `autres occurrences du chiffre dans le document.`,
    ).toBe(true);
  });

  it("C45 — la section hors cadre liste exactement les obligations manquantes qui touchent la cible", () => {
    // ~~La section hors cadre seule~~ jusqu'au 2026-10-12 : la cible redéfinie
    // (ce que l'onboarding ne refuse pas) y avait fait entrer quinze manques
    // non classés, tenus au § 8. ~~Hors cadre et à évaluer, disjoints~~ — le
    // 2026-10-13, la propriétaire les a classés : l'égalité revient au § 7 seul.
    // Décision de la propriétaire du 2026-09-27 : sur les quarante-deux, quinze
    // relèvent de la clause générale des mentions légales, et restent
    // `obligation_manquante`. La liste du document et celle du corpus ne
    // doivent diverger dans aucun sens : un article encodé ou annoncé depuis
    // qui y resterait promettrait une exclusion qui n'est plus ; un manque
    // de la cible entré depuis et absent d'ici ne serait couvert par rien.
    // [2026-10-16 : le § 9 rouvre le mécanisme du 2026-10-12 — dix-huit
    // manques de la lecture des chapitres de types, non classés. Le § 7 et le
    // § 9, DISJOINTS, font ensemble les manques de la cible.]
    const { horsCadre, ouverts } = decoupe(documentCouverture());
    expect(horsCadre, `${CHEMIN} n'a plus de section « ${HORS_CADRE} ».`).not.toBe("");
    const duCorpus = CORPUS.flatMap((c) =>
      c.articles.flatMap((a) =>
        a.statut === "obligation_manquante" && a.toucheLaCible ? [a.ref] : [],
      ),
    ).sort();
    const auSeptieme = refsDuTableau(horsCadre);
    const auNeuvieme = refsDuTableau(ouverts);
    expect(auSeptieme.filter((r) => auNeuvieme.includes(r))).toEqual([]);
    expect([...auSeptieme, ...auNeuvieme].sort()).toEqual(duCorpus);
  });

  it("2026-10-16 — le § 9 ne reçoit que les manques de la lecture des chapitres de types", () => {
    // Revue indépendante du 2026-10-17 : sans borne, le § 9 servait de
    // fourre-tout. Déplacer `R. 4224-3` du § 7 au § 9 (mutation M2), ou y
    // inscrire une manquante d'un autre corpus (M3), laissait tout vert. Une
    // référence n'y entre que si elle vient du titre II, du chapitre V du
    // livre III (PU) ou des huit articles du titre Ier ouverts par les renvois,
    // ET si elle a été lue le 2026-10-16 ou après. Le § 7 et le § 9 restent
    // disjoints (test précédent).
    const { ouverts } = decoupe(documentCouverture());
    expect(ouverts, `${CHEMIN} n'a plus de section « ${OUVERTS_1016} ».`).not.toBe("");
    const DU_TITRE_IER = new Set([
      "MS 41",
      "MS 58 § 3 et § 4 — contrat d'entretien de la détection, annexé au registre",
      "EC 13 — notice annexée au registre et entretiens consignés",
      "MS 70 § 5 — modalités d'appel des sapeurs-pompiers affichées",
      "GE 5",
      "MS 46 § 3 — convention avec un organisateur, annexée au registre",
      "EL 23 § 2 — vérification des installations électriques semi-permanentes",
      "CO 48 § 3 e) — contrat d'entretien des portes automatiques",
    ]);
    // ~~`corpus === "arrete-1980-livre-2-titre-2"`~~ — 2026-10-17, seconde
    // revue (mutation M4) : la borne admettait tout le titre II, M, N, O, W
    // compris, sur une date de LECTURE qu'une relecture légitime déplace —
    // `M 40 § 3 e)` relu le 2026-10-17 passait du § 7 au § 9 sans rien rougir.
    // Le titre II est désormais borné aux NEUF CHAPITRES lus le 2026-10-16,
    // par leur lettre de type.
    // 2026-10-17, sous-lot G : L, lu le 2026-10-16 et entré au corpus avec son
    // encodage, n'y ajoute rien — aucun manque du chapitre L ne reste ouvert
    // (L 32, un temps au § 9, est annoncé par décision de c6).
    const CHAPITRES_LUS_LE_16 = /^[JPRSTUVXY] (?:\d|annexe)/;
    // 2026-10-17, `lot/ref-a-corpus-titre-1` : le titre Ier lu EN ENTIER. Les
    // ~~vingt et un~~ dix-sept actes trouvés [quatre passés `non_couvert` le même jour] passent TRANSITOIREMENT au § 9 (consigne de
    // c6), que le sous-lot C du plan « mise à jour du référentiel » videra. Ils
    // sont nommés, comme les huit du 2026-10-16, et non admis par chapitre :
    // une relecture d'un ancien manquant du titre Ier (`MS 71`, `GC 18`…) ne
    // doit pas pouvoir le faire glisser du § 7 au § 9 (mutation M4).
    const DU_TITRE_IER_LU_EN_ENTIER = new Set([
      // ~~"CO 10", "AM 18", "CH 35", "MS 42"~~ — passés `non_couvert` le même
      // jour (décision de c6).
      // ~~"CH 23", "CH 24", "AS 5", "AS 8"~~ — annonces décidées, `non_couvert`
      // (revue du même jour) ; "GC 15", "MS 66", "EL 17", "CH 17" entrent
      // (présence et registre, ligne de partage 10).
      // Seconde relecture : les affichages (ligne de partage 11).
      "CO 45 § 5 — inscription « sans issue » des portes en cul-de-sac",
      "CO 47 § 2 — avertissement porté par les portes coupe-feu maintenues ouvertes",
      "CO 59 — g) consignes affichées dans l'espace d'attente sécurisé",
      "CH 38 — 6° avertissement affiché aux accès des filtres", "CH 52",
      "GE 3", "GE 10", "DF 9", "CH 17", "EL 17", "GC 15",
      "AS 11", "GC 4", "MS 51", "MS 52", "MS 57", "MS 66",
      "MS 67", "MS 68", "MS 72", "MS 74", "MS 75",
    ]);
    const admise = (corpus: string, ref: string) =>
      (corpus === "arrete-1980-livre-2-titre-2" && CHAPITRES_LUS_LE_16.test(ref)) ||
      (corpus === "arrete-1980-livre-3" && ref.startsWith("PU ")) ||
      (corpus === "arrete-1980-livre-2" && DU_TITRE_IER.has(ref)) ||
      (corpus === "arrete-1980-livre-2" && DU_TITRE_IER_LU_EN_ENTIER.has(ref)) ||
      // 2026-10-17 (revue) : `M 35` passe de `sans_objet` à manque par la ligne
      // de partage 10 ; nommé, le chapitre M restant hors de la borne.
      (corpus === "arrete-1980-livre-2-titre-2" && ref === "M 35") ||
      // Seconde relecture : `PE 18`, relu le 2026-10-17, ligne de partage 10.
      (corpus === "arrete-1980-livre-3" && ref === "PE 18");
    const horsBorne = refsDuTableau(ouverts).filter((ref) => {
      const origines = CORPUS.flatMap((c) =>
        c.articles
          .filter((a) => a.ref === ref && a.statut === "obligation_manquante")
          .map((a) => ({ corpus: c.id, luLe: a.luLe ?? "" })),
      );
      return !origines.some((o) => admise(o.corpus, ref) && o.luLe >= "2026-10-16");
    });
    // Et une référence classée HORS CADRE au § 7 — décisions de la propriétaire
    // des 2026-09-27, 10-13, 10-14 et 10-15, relevées le 2026-10-17 — ne passe
    // jamais au § 9, quelle que soit sa date de relecture. Une borne basse :
    // une décision hors cadre plus récente se protège en s'ajoutant ici.
    const CLASSES_HORS_CADRE = new Set([
      "R. 4323-61",
      "R. 4323-69",
      "R. 4323-70",
      "R. 4323-72",
      "Arrêté 21-12-2004 art. 4",
      "Arrêté 21-12-2004 art. 5",
      "Arrêté 21-12-2004 art. 6",
      "Arrêté 1993-11-04 art. 4",
      "Arrêté 1993-11-04 art. 8",
      "Arrêté 1993-11-04 art. 13",
      "Arrêté 1993-11-04 annexe III",
      "R. 4224-3",
      "R. 4223-4",
      "R. 4434-9",
      "Arrêté 1993-03-05 art. 2",
      "CO 61",
      "GC 18",
      "MS 69 — stock permanent de fournitures de rechange",
      "M 40 § 3 e) — contrat d'entretien des machines de nettoyage à sec",
      "MS 71",
      "Arrêté 1986-01-31 art. 60",
      "R. 4323-89",
      // 2026-10-17, sous-lot B du plan « mise à jour du référentiel » (§ 3),
      // validé par la propriétaire : venus du § 9.
      "X annexe",
      "X 1 § 2 — affichage de l'effectif des piscines transformables et mixtes",
      "J 33",
      "U 62",
      "U 64",
      "PU 5",
    ]);
    expect(
      refsDuTableau(ouverts).filter((r) => CLASSES_HORS_CADRE.has(r)),
      `Une référence classée hors cadre au § 7 ne passe pas au § 9 de ${CHEMIN}.`,
    ).toEqual([]);
    expect(
      horsBorne,
      `Le § 9 de ${CHEMIN} ne reçoit que les manques nés de la lecture des ` +
        `chapitres de types (titre II, PU, huit articles du titre Ier), lus le ` +
        `2026-10-16 ou après. Hors borne : ${horsBorne.join(", ")}.`,
    ).toEqual([]);
  });

  it("2026-10-13 — chaque ligne du § 8 a reçu un sort que le corpus porte", () => {
    // Le § 8 dit, ligne par ligne, ce que la décision du 2026-10-13 a fait de
    // chaque manque. La garde lit le sort dans le CORPUS, pas dans la colonne
    // du document : encodé (`retenu`), annoncé (`non_couvert` à l'adresse de
    // la page) ou hors cadre (au § 7). Une ligne qui n'aurait aucun des trois
    // serait un manque de la cible resté ouvert, ce que la décision a fermé.
    const { horsCadre, aEvaluer } = decoupe(documentCouverture());
    expect(aEvaluer, `${CHEMIN} n'a plus de section « ${A_EVALUER} ».`).not.toBe("");
    const auSeptieme = new Set(refsDuTableau(horsCadre));
    const statut = new Map(
      CORPUS.flatMap((c) => c.articles.map((a) => [a.ref, a] as const)),
    );
    const sansSort = refsDuTableau(aEvaluer).filter((ref) => {
      const a = statut.get(ref);
      if (!a) return true;
      if (a.statut === "retenu") return false;
      if (a.statut === "non_couvert" && a.declareA === ADRESSE_MANQUES_ANNONCES) return false;
      // 2026-10-14 : les annonces du gaz et des escaliers mécaniques ont été
      // DÉPLACÉES vers l'aide de leur catégorie ou la liste des matériels non
      // couverts (décision de la propriétaire). Annoncé reste annoncé, à une
      // autre adresse visible — que `manques-annonces.test.ts` et
      // `materiels-non-couverts.test.ts` vérifient.
      if (a.statut === "non_couvert" && a.declareA && estAdresseDeplacee(a.declareA)) {
        return false;
      }
      return !auSeptieme.has(ref);
    });
    expect(sansSort).toEqual([]);
    expect(refsDuTableau(aEvaluer)).toHaveLength(15);
  });
});
