// La nomenclature des classes d'IGH, tenue à sa source.
//
// ─────────────────────────────────────────────────────────────────────────────
// CE QUE CE FICHIER EMPÊCHE
// ─────────────────────────────────────────────────────────────────────────────
//
// `enum ClasseIgh` a vécu avec HUIT classes là où l'article R. 146-4 du code de
// la construction et de l'habitation en écrit DIX. L'écart allait dans les deux
// sens, et les deux sens comptent :
//
//   MANQUAIENT   GHTC (tour de contrôle), GHW1 et GHW2 (bureaux).
//   EN TROP      GHW — le code ne l'écrit nulle part.
//
// LA CAUSE EST UNE SOURCE MAL DÉSIGNÉE, PAS UNE COQUILLE. La liste était
// attribuée à l'arrêté du 30 décembre 2011, le règlement de sécurité des IGH.
// Ce règlement n'énumère pas les classes : son `GH 1` renvoie explicitement au
// code « pour les prescriptions générales communes aux diverses classes », et
// son titre III se contente d'ORGANISER des chapitres par classe — dont un
// chapitre unique « GH W » qui couvre GH W 1 et GH W 2. Un chapitre de
// règlement n'est pas une classe. Le code, lui, écrit `GHW 1` et `GHW 2`, et
// les sépare par la seule chose qui les distingue : la hauteur du plancher bas
// du dernier niveau, plus de 28 mètres et au plus 50 pour l'une, plus de 50
// pour l'autre.
//
// LE MEMBRE EN TROP FAISAIT AUTANT DE MAL QUE LES MANQUANTS. Un exploitant de
// tour de bureaux cochait « GHW · Bureaux », enregistrait une valeur qui n'est
// pas une classe, et n'était jamais interrogé sur la hauteur. Le manquant
// `GHTC`, lui, faisait l'inverse : une tour de contrôle n'avait pas de ligne.
//
// ─────────────────────────────────────────────────────────────────────────────
// CE QUI EST CORRIGÉ AUJOURD'HUI, ET CE QUI ATTEND — LIRE AVANT DE TOUCHER AU
// TEST
// ─────────────────────────────────────────────────────────────────────────────
//
// Les trois MANQUANTS sont entrés : migration additive, aucune ligne réécrite.
//
// Le membre EN TROP, lui, sort en deux temps, et ce fichier porte la trace du
// premier. `GHW` a disparu de tous les CHOIX — `CLASSES_IGH` de
// `src/lib/etablissements/schema.ts` (qui valide les formulaires et remplit les
// menus), `CHOIX_CLASSES_IGH`, `LABEL_CLASSE_IGH` : **plus personne ne peut en
// créer.** Il reste dans le TYPE — l'énumération PostgreSQL et son reflet
// `CLASSES_IGH` de `types-communs.ts` — parce que des dossiers peuvent en
// porter et qu'on ne le sait pas encore.
//
// **CE N'EST PAS UN SEUIL DESSERRÉ POUR ÉVITER UNE CORRECTION.** Retirer une
// valeur d'un type énuméré PostgreSQL réécrit la colonne, et les lignes qui la
// portent doivent recevoir un sort : `GHW` n'a pas d'équivalent, il ne dit pas
// si le plancher bas est à 40 mètres (GHW 1) ou à 60 (GHW 2). La seule valeur
// honnête est NULL, et c'est une perte. Or `package.json` porte
// « build: prisma generate && prisma migrate deploy && next build » : pousser
// le retrait sur `main` l'exécute en production au prochain déploiement, sur
// des lignes dont on ignore l'existence — la lecture de la base de production
// n'a pas pu être faite.
//
// Un comptage préalable n'y suffirait pas : tant que `GHW` est offert au
// formulaire, un déclarant peut en écrire un entre la lecture et le
// déploiement. C'est ce que ce palier corrige, et c'est ce qui rend le comptage
// concluant — après lui, le compte ne peut plus remonter.
//
// **La condition de levée est écrite**, et c'est ce qui distingue un palier
// d'une rustine : `docs/chantiers-ouverts.md` § 9 bis. Elle dit à quel moment
// compter, quelle migration écrire, et ce qu'il faut prévoir si le compte n'est
// pas nul.
//
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI CE N'EST PAS UNE LISTE EXHAUSTIVE RECOPIÉE
// ─────────────────────────────────────────────────────────────────────────────
//
// Ce dépôt a une règle contre les listes exhaustives en test : une liste qu'on
// répare en la recopiant cesse de vérifier. Écrire ici
// `expect(CLASSES_IGH).toEqual(["GHA", …])` serait une SIXIÈME copie, réparable
// au copier-coller depuis la cinquième.
//
// La référence est donc DÉRIVÉE du verbatim de R. 146-4 dépouillé au corpus
// (`corpus/cch-classement-erp-igh.ts`), en lisant les sigles que le texte écrit
// en tête de chacune de ses lignes. Un test qui rougit ici ne se répare que de
// deux façons — corriger la déclaration qui s'écarte, ou rouvrir Légifrance et
// corriger le relevé.
//
// ─────────────────────────────────────────────────────────────────────────────
// LA SEULE TRANSFORMATION ENTRE LE TEXTE ET LA LISTE ATTENDUE, ET ELLE EST DITE
// ─────────────────────────────────────────────────────────────────────────────
//
// Le code écrit « GHW 1 » avec une espace. Aucune valeur d'énumération
// PostgreSQL ou TypeScript ne peut en porter une. Le parseur retire donc les
// espaces INTERNES au sigle, et rien d'autre — pas de mise en majuscules, pas
// de retrait de points, pas de table de correspondance. Une table de
// correspondance serait une copie déguisée ; une normalisation d'une ligne ne
// l'est pas, et elle est ici sous les yeux du lecteur.
//
// ─────────────────────────────────────────────────────────────────────────────
// CE QUE LA GARDE NE VÉRIFIE PAS, ET IL FAUT LE DIRE
// ─────────────────────────────────────────────────────────────────────────────
//
// **Que le verbatim soit fidèle.** Il est le point d'appui : s'il est faux, la
// garde valide un faux avec application. C'est ce qui le rend différent d'un
// commentaire — il porte `versionEnVigueur`, `luLe`, `lecture` et `modifiePar`,
// et `corpus.test.ts` exige ces champs.
//
// **L'ordre.** Les listes du produit ne sont pas toutes dans l'ordre du texte :
// la grille d'onboarding met les bureaux devant parce que c'est le cas le plus
// probable. Un ordre est un choix d'affichage ; le déguiser en lecture serait
// pire que de ne rien vérifier. La comparaison porte donc sur des ENSEMBLES.
//
// **Ce que `GHW` empêcherait de voir.** La dérogation ci-dessous est NOMMÉE et
// ne couvre qu'elle-même : tout autre membre en trop, dans n'importe laquelle
// des cinq déclarations, fait tomber le test. Éprouvé en injectant un second
// membre.
//
// **Les mots des libellés.** Ce qui est vérifié est la FORME — le sigle, un
// séparateur, une désignation non vide — et les HAUTEURS, jamais la
// formulation. Voir le test des libellés pour la raison : une longueur minimale
// aurait forcé à rallonger « GHA · Habitation », qui est le mot du texte.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORPUS, type ArticleDepouille } from "./corpus";
import { CLASSES_IGH } from "./types-communs";
import { etablissementCreationSchema } from "@/lib/etablissements/schema";
import { onboardingSchema } from "@/lib/onboarding/schema";

/** L'entrée de corpus qui porte la nomenclature. */
function articleR146_4(): ArticleDepouille {
  const trouves = CORPUS.flatMap((c) =>
    c.articles.filter((a) => a.ref === "CCH R. 146-4"),
  );
  // Zéro entrée et la garde ne garderait plus rien ; deux, et on ne saurait pas
  // laquelle fait foi. Les deux cas doivent crier, pas se rattraper.
  expect(
    trouves.length,
    "`CCH R. 146-4` doit être dépouillé une fois et une seule dans `CORPUS` : " +
      "c'est l'article qui porte la nomenclature des classes d'IGH, et toute " +
      "cette garde en dépend.",
  ).toBe(1);
  return trouves[0];
}

/**
 * Les classes que le TEXTE écrit, extraites de son verbatim.
 *
 * Le I de R. 146-4 pose une ligne par classe, ouverte par le sigle :
 * « GHA : immeubles à usage d'habitation ; », « GHW 1 : immeubles à usage de
 * bureaux … ». La phrase d'introduction (« I.-Les immeubles de grande hauteur
 * sont répartis… ») ne commence pas par un sigle et ne matche pas.
 *
 * La lecture s'arrête au II — qui traite de l'immeuble à usages multiples et
 * ne définit aucune classe — pour qu'aucune énumération voisine ne puisse
 * entrer par accident.
 */
function classesEcritesParR146_4(
  verbatim = articleR146_4().citationCle ?? "",
): { sigle: string; designation: string }[] {
  const bornes = verbatim.split("II.-");
  expect(
    bornes.length,
    "Le verbatim de R. 146-4 doit porter son II : c'est lui qui borne la " +
      "lecture du I. Sans borne, le parseur lirait des phrases qui ne sont pas " +
      "des classes.",
  ).toBeGreaterThan(1);

  return bornes[0]
    .split("\n")
    .map((l) => l.trim())
    .flatMap((ligne) => {
      const m = /^((?:GH[A-Z]{1,2}(?: \d)?)|ITGH)\s*:\s*(\S.*?)\s*[;.]?$/.exec(
        ligne,
      );
      // LA SEULE NORMALISATION : l'espace interne de « GHW 1 » tombe, parce
      // qu'aucune énumération ne peut la porter. Rien d'autre n'est touché.
      return m ? [{ sigle: m[1].replace(/\s+/g, ""), designation: m[2] }] : [];
    });
}

/** Les valeurs de l'énumération Prisma, lues dans le fichier de schéma. */
function enumPrismaClasseIgh(): string[] {
  const schema = readFileSync(
    path.join(process.cwd(), "prisma", "schema.prisma"),
    "utf8",
  );
  const bloc = /enum ClasseIgh \{([^}]*)\}/.exec(schema);
  expect(
    bloc,
    "`enum ClasseIgh` introuvable dans prisma/schema.prisma",
  ).not.toBeNull();
  return bloc![1]
    .split("\n")
    // Les commentaires de l'énumération citent des sigles en prose (« un GHW
    // que le code n'écrit pas ») : les garder ferait entrer du texte dans la
    // liste. On coupe au `//` avant de lire la valeur.
    .map((l) => l.split("//")[0].trim())
    .filter((l) => l.length > 0);
}

/**
 * L'écart entre deux listes, dans les deux sens, rendu lisible.
 *
 * Une classe de TROP est un défaut au même titre qu'une manquante : elle ouvre
 * au dirigeant une case que le code ne connaît pas, et la donnée saisie n'a
 * alors aucun sens réglementaire. C'est exactement ce qui s'est passé avec
 * `GHW`. Les deux sens sont donc rendus ensemble.
 */
function ecart(
  attendus: readonly string[],
  declares: readonly string[],
): { manquants: string[]; enTrop: string[] } {
  return {
    manquants: attendus.filter((t) => !declares.includes(t)),
    enTrop: declares.filter((t) => !attendus.includes(t)),
  };
}

/**
 * LA DÉROGATION, ET ELLE NE PEUT QUE RÉTRÉCIR.
 *
 * Les valeurs que l'énumération de la base porte encore alors que R. 146-4 ne
 * les écrit pas. Elle vaut pour les deux déclarations qui décrivent ce que la
 * base peut CONTENIR — l'énumération Prisma et son reflet `CLASSES_IGH` de
 * `types-communs.ts` —, **et pour elles seules** : les trois déclarations qui
 * décrivent ce qu'on peut DÉCLARER restent strictes, et un test dédié vérifie
 * qu'aucune valeur en sursis n'y est offerte.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * `GHW` — inscrite le 2026-09-03, à retirer au temps 2.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * CE QU'ELLE N'EST PAS. Ce n'est pas un plafond qu'on relève pour faire taire
 * un test, ni un « à corriger plus tard ». `GHW` est une valeur fausse, elle
 * est reconnue comme telle, et elle n'est plus atteignable : aucun formulaire,
 * aucun menu, aucun schéma de validation ne l'accepte depuis ce jour.
 *
 * CE QU'ELLE EST. Le retrait d'une valeur d'un type énuméré PostgreSQL réécrit
 * la colonne et impose de donner un sort aux lignes qui la portent. `GHW` n'a
 * pas d'équivalent — il ne dit pas si le plancher bas du dernier niveau est à
 * 40 mètres (GHW 1) ou à 60 (GHW 2) —, et NULL est la seule valeur honnête :
 * c'est une perte. On ignore s'il existe de telles lignes, et `pnpm build` joue
 * `prisma migrate deploy` : le retrait s'exécuterait en production au prochain
 * déploiement, sur des données que personne n'a vues.
 *
 * CONDITION DE LEVÉE, et elle est la raison d'être de cette constante : une
 * fois ce palier déployé, compter les lignes `Etablissement` dont `classeIgh`
 * vaut `'GHW'` en production. Le compte est alors DÉFINITIF — plus rien ne peut
 * en créer. Marche à suivre selon le résultat, migration à écrire, et ce qu'il
 * faut prévoir si le compte n'est pas nul : `docs/chantiers-ouverts.md` § 9 bis.
 *
 * ELLE NE PEUT QUE RÉTRÉCIR, ET LE TEST LE TIENT. Une entrée n'y survit que
 * tant qu'elle est VRAIE des deux côtés : absente du texte, ET encore présente
 * dans les déclarations qu'elle couvre. Le jour où `GHW` sortira de
 * l'énumération, l'entrée deviendra périmée et le test tombera en demandant sa
 * suppression. Une dérogation qui reste après sa cause est un mensonge, et
 * c'est ainsi qu'un palier devient une rustine.
 */
const EN_SURSIS_JUSQU_AU_TEMPS_2: readonly string[] = ["GHW"];

/**
 * L'écart, la dérogation déduite du seul sens où elle s'applique.
 *
 * On ne retire JAMAIS rien des manquants : une classe que le texte écrit et que
 * le modèle n'a pas n'a aucune excuse. La dérogation ne joue que sur les
 * membres en trop, et seulement sur ceux qu'elle nomme.
 */
function ecartHorsSursis(
  attendus: readonly string[],
  declares: readonly string[],
): { manquants: string[]; enTrop: string[] } {
  const brut = ecart(attendus, declares);
  return {
    manquants: brut.manquants,
    enTrop: brut.enTrop.filter((c) => !EN_SURSIS_JUSQU_AU_TEMPS_2.includes(c)),
  };
}

function messageEcart(quoi: string, e: ReturnType<typeof ecart>): string {
  return (
    `${quoi} ne dit pas la même chose que l'article R. 146-4 du CCH.\n` +
    (e.manquants.length
      ? `MANQUE(NT) : ${e.manquants.join(", ")} — le code les écrit, la ` +
        `déclaration non. Un exploitant de cette classe ne peut pas se ` +
        `déclarer pour ce qu'il est.\n`
      : "") +
    (e.enTrop.length
      ? `EN TROP : ${e.enTrop.join(", ")} — la déclaration les écrit, le code ` +
        `non. Une valeur que le code ne connaît pas est cochable et ne veut ` +
        `rien dire ; c'est ce qu'était « GHW », qui a masqué la coupure ` +
        `GHW 1 / GHW 2 pendant deux ans.\n`
      : "") +
    `La liste attendue est DÉRIVÉE du verbatim de R. 146-4 dépouillé au corpus ` +
    `(\`corpus/cch-classement-erp-igh.ts\`). Elle ne se répare pas en recopiant ` +
    `une autre déclaration : soit celle-ci s'écarte du texte et se corrige, ` +
    `soit le relevé est faux et il faut rouvrir Légifrance. Et si vous cherchez ` +
    `la nomenclature dans l'arrêté du 30 décembre 2011, elle n'y est pas : ` +
    `\`GH 1\` renvoie au code.`
  );
}

/* `hauteursDuTexte()` et `nombresDuLibelle()` vivaient ici. Ils extrayaient les
   hauteurs que R. 146-4 écrit sur une classe et celles qu'un libellé du produit
   donne à lire, pour vérifier que le second ne tait pas les premières — la seule
   information qui SÉPARE deux classes de la nomenclature, et dont l'absence a
   fait vivre le modèle avec un « GHW » unique. Ils partent avec les deux tests
   de libellés qu'ils servaient, la question de la classe ayant été retirée du
   produit le 2026-09-03 : plus aucun libellé de classe ne s'affiche nulle part.
   À reprendre dans l'historique de ce fichier si la question revient. */

describe("classes d'IGH — la liste du modèle est celle de l'article R. 146-4", () => {
  it("le verbatim de R. 146-4 porte bien une nomenclature, et le parseur la voit", () => {
    // CONTRE-ÉPREUVE DU PRÉDICAT, avant toute comparaison. Un parseur qui ne
    // trouverait jamais rien laisserait les tests suivants comparer deux
    // listes vides et passer pour une garantie.
    const lues = classesEcritesParR146_4();
    expect(lues.length).toBeGreaterThan(7);
    // Chaque entrée porte une désignation, pas un sigle nu : c'est ce qui
    // distingue une ligne de nomenclature d'un fragment de phrase.
    for (const c of lues) expect(c.designation.length, c.sigle).toBeGreaterThan(3);

    // Le parseur suit le TEXTE, et on le prouve en le lui changeant. Une ligne
    // retirée du verbatim doit disparaître de la liste dérivée ; une ligne
    // ajoutée doit y entrer. Sans cette épreuve, un `citationCle` que personne
    // ne lit pourrait devenir de l'ornement sans que rien ne bouge.
    const ampute = (articleR146_4().citationCle ?? "").replace(
      /^GHTC : .*\n/m,
      "",
    );
    expect(classesEcritesParR146_4(ampute).map((c) => c.sigle)).not.toContain(
      "GHTC",
    );
    const gonfle = (articleR146_4().citationCle ?? "").replace(
      "GHZ : ",
      "GHQ : immeubles à usage inventé de toutes pièces ;\nGHZ : ",
    );
    expect(classesEcritesParR146_4(gonfle).map((c) => c.sigle)).toContain("GHQ");

    // L'espace interne de « GHW 1 » est bien tombée, et elle seule : le sigle
    // dérivé se compare à des valeurs d'énumération, qui n'en portent pas.
    expect(lues.map((c) => c.sigle)).toContain("GHW1");
  });

  it("l'énumération Prisma `ClasseIgh` porte les classes du texte, plus les seules valeurs en sursis", () => {
    // CE QUE LA BASE PEUT CONTENIR — la dérogation s'y applique. Une valeur
    // absente de l'énumération PostgreSQL rend la donnée insaisissable quoi
    // qu'en dise le TypeScript ; une valeur en trop, elle, ne peut plus être
    // écrite depuis que les choix ne l'offrent plus, mais elle doit rester
    // lisible tant qu'on ignore si des lignes la portent.
    //
    // Les MANQUANTS restent stricts : la dérogation ne les couvre jamais.
    const e = ecartHorsSursis(
      classesEcritesParR146_4().map((c) => c.sigle),
      enumPrismaClasseIgh(),
    );
    expect(e, messageEcart("`enum ClasseIgh` (prisma/schema.prisma)", e)).toEqual(
      { manquants: [], enTrop: [] },
    );
  });

  it("`CLASSES_IGH` (référentiel) reflète l'énumération de la base, sursis compris", () => {
    // Le reflet TypeScript de l'énumération Prisma : même rôle, même
    // dérogation. C'est le type que portent les valeurs LUES en base, d'où la
    // nécessité qu'il couvre encore `GHW` — sans quoi une ligne existante
    // deviendrait intypable et le produit planterait à la lecture.
    const e = ecartHorsSursis(
      classesEcritesParR146_4().map((c) => c.sigle),
      CLASSES_IGH,
    );
    expect(
      e,
      messageEcart("`CLASSES_IGH` (src/lib/referentiels/types-communs.ts)", e),
    ).toEqual({ manquants: [], enTrop: [] });
  });

  it("la dérogation ne couvre que du vrai, et se périme d'elle-même", () => {
    // SANS CE TEST, LA DÉROGATION SERAIT UNE RUSTINE. Une liste d'exceptions
    // qu'on peut allonger et qui survit à sa cause finit par décrire l'état du
    // code au lieu de le contraindre. Deux conditions la tiennent, et une
    // entrée doit satisfaire les DEUX pour y rester.
    const duTexte = classesEcritesParR146_4().map((c) => c.sigle);
    const dansLaBase = new Set([...enumPrismaClasseIgh(), ...CLASSES_IGH]);

    // (1) Une valeur EN SURSIS doit être absente du texte. Le jour où R. 146-4
    // écrirait « GHW », la dérogation n'aurait plus d'objet : ce ne serait plus
    // un membre en trop, mais une classe à honorer.
    const pourtantAuTexte = EN_SURSIS_JUSQU_AU_TEMPS_2.filter((c) =>
      duTexte.includes(c),
    );
    expect(
      pourtantAuTexte,
      `${pourtantAuTexte.join(", ")} figure(nt) à l'article R. 146-4 : ce ne ` +
        `sont pas des membres en trop, et rien ne justifie de les tolérer. ` +
        `Retirez-les de \`EN_SURSIS_JUSQU_AU_TEMPS_2\` et traitez-les comme ` +
        `les autres classes du texte.`,
    ).toEqual([]);

    // (2) Une valeur EN SURSIS doit être encore présente dans les déclarations
    // qu'elle couvre. C'EST LE CLIQUET : au temps 2, quand `GHW` sortira de
    // l'énumération, cette entrée deviendra périmée et ce test tombera en
    // demandant qu'on l'efface. Une dérogation ne peut donc que rétrécir —
    // elle ne peut pas survivre à ce qu'elle excusait.
    const perimees = EN_SURSIS_JUSQU_AU_TEMPS_2.filter(
      (c) => !dansLaBase.has(c),
    );
    expect(
      perimees,
      `${perimees.join(", ")} ne figure(nt) plus dans l'énumération de la base : ` +
        `le temps 2 est fait, la dérogation n'a plus d'objet. Retirez ` +
        `l'entrée de \`EN_SURSIS_JUSQU_AU_TEMPS_2\` — et si la liste devient ` +
        `vide, retirez la constante et \`ecartHorsSursis\` avec elle, puis ` +
        `soldez le § 9 bis de docs/chantiers-ouverts.md. Une dérogation qui ` +
        `survit à sa cause est un mensonge.`,
    ).toEqual([]);
  });

  it("aucune classe ne peut plus être écrite — pas même une classe valide", () => {
    // CE TEST A CHANGÉ D'OBJET LE 2026-09-03, ET IL EST DEVENU PLUS FORT.
    //
    // Il vérifiait que la valeur EN SURSIS n'était offerte par aucune des trois
    // surfaces de déclaration — schéma Zod, grille d'onboarding, menu du
    // formulaire —, ce qui rendait concluant le comptage du temps 2 : tant
    // qu'un menu offre `GHW`, un déclarant peut en fabriquer un entre la
    // lecture de la base et le déploiement du retrait.
    //
    // Les trois surfaces n'existent plus. La question de la classe d'IGH a été
    // retirée du produit : la lecture de l'arrêté du 30 décembre 2011 a établi
    // que ses vérifications périodiques s'adressent aux « propriétaires » sans
    // varier par classe (GH 5), que la seule périodicité indexée sur la classe
    // est celle de la visite de la commission de sécurité (GH 4 § 3), et que
    // le classement retient l'usage PRINCIPAL de l'immeuble, les dispositions
    // de chaque classe s'appliquant « dans chacune des parties concernées »
    // (GH 66) — la classe déclarée d'une tour ne décrit donc pas le plateau
    // qu'on y occupe.
    //
    // LA GARANTIE NE DISPARAÎT PAS AVEC LES SURFACES, ELLE SE RESSERRE : ce
    // n'est plus « aucune valeur en sursis ne peut être écrite », c'est
    // « AUCUNE classe ne peut être écrite ». On le vérifie par le
    // comportement des deux schémas qui écrivent un établissement, et non par
    // une lecture de texte : un champ que Zod ne déclare pas est retiré de
    // l'objet validé, et n'atteint donc jamais Prisma.
    const regime = {
      effectifSurSite: 12,
      effectifEntreprise: 12,
      estEtablissementTravail: true,
      estERP: false,
      estIGH: true,
      estHabitation: false,
    };
    // Les deux schémas n'attendent pas les mêmes champs d'identité : la fiche
    // porte `raisonDisplay`, le parcours d'entrée `raisonSociale` et le code
    // NAF. On donne à chacun le sien plutôt qu'un dénominateur commun qui ne
    // validerait ni l'un ni l'autre.
    for (const [ou, schema, identite] of [
      [
        "`etablissementCreationSchema`",
        etablissementCreationSchema,
        {
          raisonDisplay: "Tour Témoin",
          adresse: "1 place de la Défense, 92400 Courbevoie",
        },
      ],
      [
        "`onboardingSchema`",
        onboardingSchema,
        {
          raisonSociale: "Tour Témoin",
          adresse: "1 place de la Défense, 92400 Courbevoie",
          codeNaf: "70.22Z",
        },
      ],
    ] as const) {
      const creation = { ...identite, ...regime };
      // Une classe PARFAITEMENT VALIDE au regard de R. 146-4, et elle ne passe
      // pas davantage que `GHW` : c'est le sens du resserrement.
      const res = schema.safeParse({ ...creation, classeIgh: "GHW1" });
      expect(res.success, `${ou} refuse le dossier témoin`).toBe(true);
      if (!res.success) continue;
      expect(
        Object.prototype.hasOwnProperty.call(res.data, "classeIgh"),
        `${ou} laisse passer une \`classeIgh\`. La question a été retirée du ` +
          `produit le 2026-09-03 ; si une surface la repose, elle doit revenir ` +
          `avec l'obligation qui la justifie, et ce test doit être réécrit — ` +
          `pas contourné. Voir corpus/arrete-2011-12-30-igh.ts.`,
      ).toBe(false);
    }

    // ET LA CONSÉQUENCE POUR LE PALIER, qui est la raison d'être de cette
    // garantie : le comptage des lignes `GHW` en production est désormais
    // concluant a fortiori. Plus rien ne peut créer une classe, donc plus rien
    // ne peut créer un `GHW`. Voir docs/chantiers-ouverts.md § 9 bis.
    expect(EN_SURSIS_JUSQU_AU_TEMPS_2).toContain("GHW");
  });

  /* DEUX TESTS DE LIBELLÉS ONT ÉTÉ RETIRÉS LE 2026-09-03, avec les surfaces
     qu'ils gardaient — la grille d'onboarding et le menu du formulaire.

     Ils vérifiaient une chose que ce dépôt tient pour acquise et qui ne l'est
     pas ailleurs : qu'un libellé porte les CHIFFRES du texte, la hauteur du
     plancher bas notamment, seul fait qui sépare GHW 1 de GHW 2. Ils avaient
     leur raison d'être — c'est faute de poser cette question que le modèle a
     vécu avec un « GHW » unique que le code n'écrit pas.

     Ils ne sont pas remplacés, parce qu'il n'y a plus rien à garder : aucun
     écran ne propose ni n'affiche de classe. Le jour où la question
     reviendrait, ces deux tests sont à reprendre dans l'historique de ce
     fichier avant d'écrire les libellés — pas à réinventer. Ce qui reste
     gardé ici est ce qui existe encore : l'énumération PostgreSQL et son
     reflet `CLASSES_IGH` de `types-communs.ts`, tous deux confrontés au
     verbatim de R. 146-4, plus la dérogation `GHW` et son inécrivabilité. */
});
