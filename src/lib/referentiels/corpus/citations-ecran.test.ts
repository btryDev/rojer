import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  arretesDuCorpus,
  arretesSansCorpus,
  articlesDuCorpus,
  citationsSansCorpus,
  dateArrete,
  SURFACES_AFFICHEES,
} from "./citations-ecran";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

describe("ce que les écrans citent sans que personne l'ait ouvert", () => {
  // CE N'EST PLUS UN CLIQUET, C'EST UNE GARANTIE. Posé à 23 le 2026-09-02 au
  // matin — 23 articles cités sur une surface qui s'affiche sans qu'aucun
  // corpus les ait ouverts —, il est descendu à 0 le soir même. Quatre lots :
  // le socle DUERP, le plan de prévention, la vigilance prestataires, et les
  // sept épars (éclairage, bruit, vibrations, chimique, matières inflammables,
  // eau potable).
  //
  // À ZÉRO, L'ÉNONCÉ CHANGE DE NATURE. Tant qu'il restait des exceptions, le
  // test disait « pas plus qu'hier ». Il dit maintenant : aucune surface qui
  // s'affiche ne cite au dirigeant un article qu'aucun corpus n'a ouvert. Un
  // ajout le fait échouer en nommant le fichier et la ligne.
  //
  // NE LE REMONTE PAS pour faire passer un écran. Deux remèdes, tous deux
  // employés ce jour-là : dépouiller le texte, ou retirer la citation.
  // `R. 1321-23` sur l'écran carnet sanitaire est le cas type du second — il
  // s'adresse à l'exploitant du réseau d'eau PUBLIC, et son badge peut partir
  // sans que le dirigeant y perde quoi que ce soit.
  const PLAFOND = 0;

  it("ne dépasse pas le plafond, et le plafond ne remonte pas", () => {
    const orphelines = citationsSansCorpus(RACINE);
    expect(
      orphelines.length,
      `${orphelines.length} article(s) cité(s) à l'écran sans entrée de corpus ` +
        `(plafond ${PLAFOND}). Une surface qui s'affiche cite au dirigeant un ` +
        `article qu'aucun corpus n'a ouvert. Deux remèdes, jamais un troisième : ` +
        `dépouiller le texte, ou retirer la citation. Remonter le plafond n'en ` +
        `est pas un — il est à zéro, et c'est ce qui fait de ce test une ` +
        `garantie plutôt qu'un compteur.\n\n` +
        orphelines
          .map((o) => `  ${o.ref}  —  ${o.emplacements[0]}`)
          .join("\n"),
    ).toBeLessThanOrEqual(PLAFOND);
  });

  it("le plafond colle à la réalité : il ne reste pas gonflé", () => {
    // Un plafond très au-dessus du réel ne protège plus de rien : il laisserait
    // rentrer de nouvelles citations orphelines sans que rien ne bouge. On
    // tolère un écart de 2, pas davantage.
    const orphelines = citationsSansCorpus(RACINE);
    expect(
      PLAFOND - orphelines.length,
      `Le plafond est à ${PLAFOND} pour ${orphelines.length} citation(s) ` +
        `réelle(s). Un plafond gonflé cesse de tenir : l'abaisser à ` +
        `${orphelines.length}.`,
    ).toBeLessThanOrEqual(2);
  });

  it("le balayage voit vraiment une citation orpheline qu'on lui injecte", () => {
    // RÉINJECTION DE DÉFAUT. Sans ceci, un motif d'expression régulière mort
    // rendrait zéro et le cliquet passerait au vert en ne mesurant plus rien —
    // c'est arrivé dans ce dépôt, deux fois le même jour.
    const bac = mkdtempSync(join(tmpdir(), "citations-"));
    try {
      for (const surface of SURFACES_AFFICHEES) {
        mkdirSync(join(bac, surface), { recursive: true });
      }
      // Un article qu'aucun corpus ne connaît, écrit en clair dans du JSX.
      writeFileSync(
        join(bac, "src/app", "faux-ecran.tsx"),
        `export const E = () => <p>art. R. 9999-1 du code du travail</p>;\n`,
      );
      const vues = citationsSansCorpus(bac);
      expect(vues.map((v) => v.ref)).toContain("R. 9999-1");
      expect(vues[0]?.emplacements[0]).toContain("faux-ecran.tsx");
    } finally {
      rmSync(bac, { recursive: true, force: true });
    }
  });

  it("un article que le corpus porte n'est pas compté comme orphelin", () => {
    // La borne haute du même balayage : si tout était rendu orphelin, le test
    // précédent passerait aussi et ne prouverait rien.
    const bac = mkdtempSync(join(tmpdir(), "citations-"));
    try {
      for (const surface of SURFACES_AFFICHEES) {
        mkdirSync(join(bac, surface), { recursive: true });
      }
      const connu = [...articlesDuCorpus()][0];
      expect(connu, "le corpus est vide, le balayage ne prouverait rien").toBeTruthy();
      writeFileSync(
        join(bac, "src/app", "ecran.tsx"),
        `export const E = () => <p>art. ${connu} du code du travail</p>;\n`,
      );
      expect(citationsSansCorpus(bac)).toEqual([]);
    } finally {
      rmSync(bac, { recursive: true, force: true });
    }
  });

  it("une citation dans un bloc de commentaire sur plusieurs lignes non plus", () => {
    // LE DÉFAUT QUE CE TEST FIXE. La première version du balayage n'écartait
    // que les lignes COMMENÇANT par un marqueur. `permis-feu/page.tsx` porte un
    // `{/* … */}` de quatre lignes dont la deuxième cite `R. 4434-9` : elle a
    // été comptée comme une citation faite au dirigeant. Le module se
    // contredisait — il annonçait exclure les commentaires et n'excluait que
    // leur première ligne. Relevé par un lot de dépouillement le jour même.
    const bac = mkdtempSync(join(tmpdir(), "citations-"));
    try {
      for (const surface of SURFACES_AFFICHEES) {
        mkdirSync(join(bac, surface), { recursive: true });
      }
      writeFileSync(
        join(bac, "src/app", "ecran.tsx"),
        `export const E = () => (\n` +
          `  <p>\n` +
          `    {/* L'URL pointait ailleurs : ce n'est pas R. 9999-4\n` +
          `        mais R. 9999-5. Relu le 2026-09-02. */}\n` +
          `    Texte affiche\n` +
          `  </p>\n` +
          `);\n`,
      );
      expect(citationsSansCorpus(bac)).toEqual([]);
    } finally {
      rmSync(bac, { recursive: true, force: true });
    }
  });

  it("une citation en commentaire n'est pas comptée", () => {
    // Un commentaire qui cite un article raconte une décision, souvent une
    // correction. Le dirigeant ne le lit pas.
    const bac = mkdtempSync(join(tmpdir(), "citations-"));
    try {
      for (const surface of SURFACES_AFFICHEES) {
        mkdirSync(join(bac, surface), { recursive: true });
      }
      writeFileSync(
        join(bac, "src/app", "ecran.tsx"),
        `// corrigé le 2026-01-01 : ce n'est pas R. 9999-2 mais R. 9999-3\nexport const E = 1;\n`,
      );
      expect(citationsSansCorpus(bac)).toEqual([]);
    } finally {
      rmSync(bac, { recursive: true, force: true });
    }
  });
});


describe("les arrêtés cités par leur date, que le motif d'article ne voyait pas", () => {
  /**
   * POURQUOI CE BALAYAGE EXISTE. `MOTIF_ARTICLE` exige `L.`/`R.`/`D.` ; un
   * arrêté cité par sa date n'en a pas. Le compteur d'orphelines affichait
   * donc zéro EN REGARDANT AILLEURS — et c'est par cet angle mort qu'est passé
   * le seul module du produit bâti sur un texte qu'aucun corpus n'a ouvert :
   * le carnet sanitaire affiche l'arrêté du 1er février 2010 en badge,
   * l'imprime dans le ZIP remis au contrôleur, et en dérive une échéance
   * annuelle.
   */
  it("ramène les deux vocabulaires à une même date civile", () => {
    // Le corpus écrit `Arrêté 2017-04-19` ici et `Arrêté 23-02-2018` là ;
    // l'écran écrit « arrêté du 1er février 2010 » ou « arrêté 01-02-2010 ».
    // Sans normalisation, aucun de ces quatre ne rencontrerait son jumeau.
    const dateDe = (t: string) => {
      const m = /arrêtés?\s+(?:du\s+)?(?:(\d{1,2})(?:er)?\s+([a-zéèûô]+)\s+(\d{4})|(\d{2,4})-(\d{2})-(\d{2,4}))/i.exec(t);
      return m ? dateArrete(m) : null;
    };
    expect(dateDe("Arrêté du 1er février 2010, art. 3")).toBe("2010-02-01");
    expect(dateDe("arrêté 01-02-2010")).toBe("2010-02-01");
    expect(dateDe("Arrêté 2017-04-19 art. 1er")).toBe("2017-04-19");
    expect(dateDe("Arrêté 19-04-2017")).toBe("2017-04-19");
    expect(dateDe("arrêté du 23 février 2018, art. 26")).toBe("2018-02-23");
  });

  it("ne rend jamais une date inventée sur une forme qu'il ne sait pas lire", () => {
    // Un mois mal orthographié doit rendre `null`, pas une date fausse : une
    // date inventée se rapprocherait d'un corpus au hasard et ferait passer
    // un orphelin pour un texte dépouillé.
    const m = /arrêtés?\s+(?:du\s+)?(?:(\d{1,2})(?:er)?\s+([a-zéèûô]+)\s+(\d{4})|(\d{2,4})-(\d{2})-(\d{2,4}))/i.exec(
      "arrêté du 1er févier 2010",
    );
    expect(m && dateArrete(m)).toBeNull();
  });

  it("voit les arrêtés que le corpus a ouverts — sinon il ne prouve rien", () => {
    // Borne basse : un balayage qui ne reconnaît rien dénoncerait tout, et un
    // qui reconnaît tout ne dénoncerait rien. Les deux pannes sont muettes.
    const connus = arretesDuCorpus();
    expect(connus.size).toBeGreaterThanOrEqual(15);
    expect(connus.has("1980-06-25")).toBe(true); // règlement de sécurité ERP
    expect(connus.has("2018-02-23")).toBe(true); // gaz des bâtiments d'habitation
  });

  /**
   * UN SEUL ARRÊTÉ ORPHELIN, ET IL EST CONNU — celui du 1er février 2010.
   *
   * Le plafond n'est pas à zéro parce que combler ce trou est un
   * dépouillement, pas une correction de citation : il faut ouvrir l'arrêté,
   * ses annexes 1 et 2, et confronter au texte les trois valeurs que le module
   * affirme (50 °C, 1 000 UFC/L, le rythme annuel). C'est un lot à part, écrit
   * au § 14 de `docs/chantiers-ouverts.md`.
   *
   * Ce plafond est un CLIQUET : il ne remonte pas. Le jour où l'arrêté entre
   * au corpus, il descend à zéro et n'en bouge plus.
   */
  const PLAFOND_ARRETES = 1;

  it("ne dépasse pas le plafond, et le plafond ne remonte pas", () => {
    const orphelins = arretesSansCorpus(RACINE);
    expect(
      orphelins.length,
      `${orphelins.length} arrêté(s) cité(s) sans corpus (plafond ` +
        `${PLAFOND_ARRETES}) :\n` +
        orphelins
          .map((o) => `  ${o.ref} — ${o.emplacements.join(", ")}`)
          .join("\n") +
        `\nUn arrêté affiché au dirigeant ou imprimé dans le dossier remis à ` +
        `un tiers doit avoir été ouvert à la source. Si ce nombre a BAISSÉ, ` +
        `abaisser PLAFOND_ARRETES d'autant.`,
    ).toBeLessThanOrEqual(PLAFOND_ARRETES);
  });

  it("le plafond n'est pas trop haut : il colle à ce qui reste", () => {
    // Un plafond qui dépasse la réalité laisserait entrer un orphelin de plus
    // sans rien dire — c'est ce qui rend un cliquet inoffensif.
    expect(arretesSansCorpus(RACINE).length).toBe(PLAFOND_ARRETES);
  });

  it("l'orphelin restant est bien celui qu'on croit", () => {
    // Nommé, pour qu'un AUTRE trou ne se glisse pas à sa place sous le même
    // plafond. C'est la faute classique d'un cliquet numérique.
    expect(arretesSansCorpus(RACINE).map((o) => o.ref)).toEqual([
      "2010-02-01",
    ]);
  });
});
