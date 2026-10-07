// Ce qui empêche une ligne invérifiable d'entrer dans la liste des documents.
//
// La liste est destinée à un dirigeant qui n'a pas d'autre source. Une entrée
// fausse ou sans fondement y coûte plus cher qu'ailleurs : elle lui fait
// chercher un document qu'il ne doit pas, ou — pire — lui fait croire qu'un
// document qu'il doit n'existe pas.
//
// Trois familles de garanties, et elles ne se recouvrent pas :
//   1. la forme du fondement — il faut avoir ouvert la page pour la remplir ;
//   2. la source — Légifrance ou INRS, et rien d'autre ; pas de norme privée ;
//   3. la cohérence avec le dépouillement du corpus, là où il connaît déjà
//      l'article.
//
// Ce que ces tests NE prouvent PAS : qu'un identifiant Légifrance donné serve
// bien l'article annoncé. Aucun test ne le peut — l'URL répond 200 quel que
// soit l'article servi. Ce qui s'en approche est `urls-legifrance.test.ts`, qui
// balaye tout `src/` et fait échouer deux identifiants différents pour un même
// article : ce fichier-ci y est soumis comme les autres, et c'est là que la
// contradiction se verrait. La vérification à la source, elle, se fait à la
// main, et `luLe` en porte la date.

import { describe, expect, it } from "vitest";
import {
  DOCUMENTS_OBLIGATOIRES,
  documentsNonProduits,
  documentsProduits,
  type FondementDocument,
} from "./documents-obligatoires";
import { CORPUS } from "./corpus";

const JOUR_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

const tousLesFondements = (): { doc: string; f: FondementDocument }[] =>
  DOCUMENTS_OBLIGATOIRES.flatMap((d) =>
    d.fondements.map((f) => ({ doc: d.id, f })),
  );

describe("aucun document n'entre sans fondement vérifiable", () => {
  it("donne à chacun au moins un fondement", () => {
    for (const d of DOCUMENTS_OBLIGATOIRES) {
      expect(d.fondements.length, d.id).toBeGreaterThan(0);
    }
  });

  it("exige de chaque fondement ce qu'on ne peut remplir qu'en ouvrant la page", () => {
    // `versionConstatee` et `luLe` sont le cœur de la garantie : ils ne
    // s'écrivent pas de mémoire. Le format est vérifié, sans quoi « 2026 » ou
    // « avril 2026 » passeraient et ne se compareraient à rien.
    for (const { doc, f } of tousLesFondements()) {
      const ou = `${doc} → ${f.article}`;
      expect(f.reference.trim().length, ou).toBeGreaterThan(0);
      expect(f.article.trim().length, ou).toBeGreaterThan(0);
      expect(f.versionConstatee, ou).toMatch(JOUR_CIVIL);
      expect(f.luLe, ou).toMatch(JOUR_CIVIL);
    }
  });

  it("ne prétend pas avoir lu un texte avant qu'il existe", () => {
    // Une lecture antérieure à la version lue est une date recopiée d'ailleurs,
    // pas un relevé. C'est le défaut le plus discret des trois.
    for (const { doc, f } of tousLesFondements()) {
      expect(f.luLe >= f.versionConstatee, `${doc} → ${f.article}`).toBe(true);
    }
  });

  it("n'accepte que Légifrance et l'INRS, et exige un identifiant stable", () => {
    // Liste fermée d'hôtes. Une source consolidée, un blog spécialisé ou un
    // éditeur juridique ne portent pas la date de version faisant foi : deux
    // reproductions concordantes peuvent dériver du même relevé.
    for (const { doc, f } of tousLesFondements()) {
      const ou = `${doc} → ${f.article} : ${f.url}`;
      const hote = new URL(f.url).hostname;
      // Une norme (ADR-039) se consulte chez l'AFNOR, et seulement là ; une
      // référence de droit n'y pointe jamais.
      const admis =
        f.source === "NORME"
          ? ["www.afnor.org", "norminfo.afnor.org", "www.boutique.afnor.org"]
          : ["www.legifrance.gouv.fr", "www.inrs.fr"];
      expect(admis.includes(hote), ou).toBe(true);
      if (hote === "www.legifrance.gouv.fr") {
        // LEGIARTI pour un article de code, JORFTEXT pour un texte publié au
        // Journal officiel. Une URL de recherche ou de sommaire ne désigne rien
        // de stable et se périmerait sans bruit.
        expect(/(LEGIARTI\d+|JORFTEXT\d+)/.test(f.url), ou).toBe(true);
      }
    }
  });

  it("ne cite une norme que COMME norme, et jamais un référentiel privé", () => {
    // APSAD, CACES, recommandations de la CNAM : elles circulent comme du
    // droit dans les documents commerciaux du secteur, et un dirigeant ne les
    // distingue pas d'un article. Les citer ici reviendrait à lui imposer ce
    // que personne ne peut lui imposer.
    //
    // AMENDÉ PAR L'ADR-039 (2026-10-07) : une norme homologuée (NF, EN) peut
    // fonder une obligation, à condition d'être citée comme norme — source
    // `NORME`. Le motif « NF » reste interdit partout AILLEURS : une norme
    // glissée dans la citation d'un article de droit est exactement la
    // confusion que la source sert à empêcher.
    for (const { doc, f } of tousLesFondements()) {
      if (f.source !== "NORME") continue;
      expect(f.article, `${doc} → ${f.article}`).toMatch(/^(NF|EN|ISO)\s/);
    }
    const interdits = [
      /\bNF\s/i,
      /\bAPSAD\b/i,
      /\bCACES\b/i,
      /\bUTE\s?C/i,
      /recommandation\s+R\.?\s?\d/i,
    ];
    for (const { doc, f } of tousLesFondements()) {
      const texte = `${f.reference} ${f.article} ${f.citationCle ?? ""}`;
      for (const motif of f.source === "NORME" ? interdits.slice(1) : interdits) {
        expect(motif.test(texte), `${doc} → ${f.article} · ${motif}`).toBe(
          false,
        );
      }
    }
  });

  it("ne contredit pas le dépouillement là où le corpus connaît l'article", () => {
    // Deux lectures du même article dans le même dépôt doivent donner la même
    // version. Sans ce test, la liste et le corpus vieilliraient chacun de leur
    // côté, et le jour où un décret réécrirait l'article, l'un des deux
    // continuerait d'afficher l'ancienne version sans que rien le signale.
    const duCorpus = new Map<string, string>();
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.versionEnVigueur) duCorpus.set(a.ref, a.versionEnVigueur);
      }
    }

    const divergences = tousLesFondements()
      .filter(({ f }) => duCorpus.has(f.article))
      .filter(({ f }) => duCorpus.get(f.article) !== f.versionConstatee)
      .map(
        ({ doc, f }) =>
          `${doc} → ${f.article} : liste ${f.versionConstatee}, corpus ${duCorpus.get(f.article)}`,
      );

    expect(divergences).toEqual([]);
  });

  it("rattache au moins un fondement au corpus — sinon la garde ci-dessus ne garde rien", () => {
    // Le test précédent est vide de sens si aucune clé ne se rejoint. Le
    // rapprochement se fait sur `article`, et une graphie divergente
    // (« R.4121-1 » contre « R. 4121-1 ») le viderait sans rien casser.
    const refs = new Set(CORPUS.flatMap((c) => c.articles.map((a) => a.ref)));
    const rattaches = tousLesFondements().filter(({ f }) => refs.has(f.article));
    expect(rattaches.length).toBeGreaterThan(0);
  });
});

describe("la liste dit ce que Rojer ne fait pas", () => {
  it("porte des documents que Rojer ne produit pas — c'est ce qui la justifie", () => {
    // Une liste qui ne nommerait que les documents produits serait une
    // brochure. L'ADR-025 § 8 demande l'inverse : « y compris ceux que le
    // produit ne produit pas ».
    expect(documentsNonProduits().length).toBeGreaterThan(0);
    expect(documentsProduits().length).toBeGreaterThan(0);
  });

  it("dit toujours où trouver ce qu'il ne produit pas, et où le lire quand il le produit", () => {
    // Nommer un document manquant sans dire où il se tient laisse le dirigeant
    // devant un problème de plus. Le type l'impose déjà ; ce test interdit la
    // phrase creuse qui satisferait le type.
    for (const d of DOCUMENTS_OBLIGATOIRES) {
      const ou = d.produitParRojer ? d.ouDansRojer : d.ouLeTrouver;
      expect(ou.trim().length, d.id).toBeGreaterThan(60);
      expect(d.ceQueLeTexteDemande.trim().length, d.id).toBeGreaterThan(40);
    }
  });

  it("n'a pas deux fois le même identifiant", () => {
    const ids = DOCUMENTS_OBLIGATOIRES.map((d) => d.id);
    expect([...new Set(ids)]).toEqual(ids);
  });

  it("ne qualifie jamais la situation au regard du droit", () => {
    // Charte, interdits 16 et 17 : un fait, jamais un verdict. La liste dit ce
    // qu'un texte demande ; elle ne dit à personne où il en est.
    const dit = DOCUMENTS_OBLIGATOIRES.map((d) =>
      [
        d.nom,
        d.ceQueLeTexteDemande,
        d.quandIlEstDu ?? "",
        d.produitParRojer ? d.ouDansRojer : d.ouLeTrouver,
      ].join(" "),
    )
      .join(" ")
      .toLowerCase();

    for (const interdit of [
      "conforme",
      "non conforme",
      "en infraction",
      "en règle",
      "mise en conformité",
    ]) {
      expect(dit, interdit).not.toContain(interdit);
    }
  });
});
