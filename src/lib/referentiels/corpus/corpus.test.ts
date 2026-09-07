import { describe, expect, it } from "vitest";
import { obligationsConformite } from "../conformite";
import {
  CORPUS,
  couverture,
  EXCLUSIONS,
  liensRetenusRompus,
  articlesNonCouverts,
  obligationsManquantes,
  obligationsSurTextesNonDepouilles,
  referencesSansCle,
  type ArticleDepouille,
  type Corpus,
} from "./index";

describe("corpus — forme des dépouillements", () => {
  it("aucun article n'est déclaré deux fois dans un même corpus", () => {
    for (const c of CORPUS) {
      const refs = c.articles.map((a) => a.ref);
      expect(new Set(refs).size, c.id).toBe(refs.length);
    }
  });

  it("un même article ne reçoit pas deux statuts opposés selon le corpus", () => {
    // LE TEST CI-DESSUS NE REGARDE QU'À L'INTÉRIEUR D'UN CORPUS, et c'est par
    // ce trou que `L. 4622-1` a vécu trois jours en deux exemplaires :
    // `obligation_manquante` dans `code-travail-sante-travail`, `retenu` dans
    // `code-travail-service-prevention-sante`, même url, même version, même
    // verbatim, même `luLe`. Le registre qui dit ce qui MANQUE au référentiel
    // déclarait donc manquante une obligation livrée la veille.
    //
    // L'invariant est celui du test précédent, à la bonne échelle : un corpus
    // ne peut pas dire deux choses d'un article, et le registre non plus. Le
    // `statut` décrit ce que l'article FAIT — il fonde, il est sans objet, il
    // impose ce qu'on ne porte pas —, ce qui est une propriété de l'article et
    // non du corpus qui le lit. Deux lecteurs peuvent donc le lire deux fois,
    // jamais en désaccord.
    //
    // POURQUOI LE STATUT SEUL, ET RIEN D'AUTRE. La duplication inter-corpus est
    // légitime et il y en a deux — `R. 4226-19` et `L. 4711-5`, lus par
    // `code-travail-incendie` et `code-travail-electricite`. Ce sont elles qui
    // calibrent la garde, et elles interdisent d'aller plus loin que le statut :
    // les deux entrées de `L. 4711-5` diffèrent par leur `luLe` (2026-08-26 et
    // 2026-08-31), par leurs `obligations`, et l'une porte `intitule`,
    // `prescrit`, `citationCle` et `reserve` quand l'autre n'en a aucun ; les
    // deux entrées de `R. 4226-19` diffèrent par leurs `obligations`, la version
    // électricité y ajoutant `elec-travail-consignation-registre`. Comparer les
    // obligations nommées, les dates ou la prose ferait donc crier la garde sur
    // les DEUX duplications saines. Mesuré sur 33 corpus et 237 articles :
    // 3 refs dupliquées, 1 divergence, 0 faux positif.
    //
    // CE QU'ON A ÉCARTÉ, ET POURQUOI. L'autre remède mesuré était « un article
    // `obligation_manquante` qu'une obligation encodée cite » : recompté ici, il
    // lève le même unique drapeau sur 12 obligations manquantes, et attrape en
    // plus la classe entière — y compris une entrée périmée SANS jumelle. Il
    // n'est pas retenu parce que ce n'est pas un invariant mais une inférence :
    // `ReferenceLegale` n'a aucun champ séparant une citation FONDATRICE d'une
    // citation de CONTEXTE, et le dépôt en contient déjà — les notes de
    // `sante-travail-etablissement-adhesion-spst` disent de `D. 4622-1` et
    // `D. 4622-2` qu'ils sont « en contexte, pas en fondateur ». Le jour où un
    // article sera cité pour le contexte tout en imposant encore quelque chose
    // qu'on ne porte pas, cette garde criera faux — et le moyen le moins cher de
    // la faire taire sera de dégrader l'entrée du corpus en `sans_objet`,
    // c'est-à-dire de mentir pour réparer un test. C'est le motif de la liste
    // exhaustive dans un habit neuf, en pire : elle ne se répare plus en
    // recopiant mais en effaçant une lecture juste.
    //
    // CE QUE CETTE GARDE NE VOIT PAS, puisqu'il faut le dire : une entrée
    // `obligation_manquante` restée seule, périmée par un encodage fait sans
    // toucher au corpus. Aucun invariant ne l'attrape sans le champ qui manque
    // ci-dessus. Consigné plutôt que couvert par une inférence.
    const parRef = new Map<string, { corpus: string; statut: string }[]>();
    for (const c of CORPUS) {
      for (const a of c.articles) {
        parRef.set(a.ref, [
          ...(parRef.get(a.ref) ?? []),
          { corpus: c.id, statut: a.statut },
        ]);
      }
    }
    for (const [ref, entrees] of parRef) {
      const statuts = [...new Set(entrees.map((e) => e.statut))];
      expect(
        statuts,
        `${ref} : ${entrees
          .map((e) => `${e.corpus} le dit « ${e.statut} »`)
          .join(", ")}`,
      ).toHaveLength(1);
    }
  });

  it("un article retenu désigne des obligations qui existent", () => {
    const connues = new Set(obligationsConformite.map((o) => o.id));
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.statut !== "retenu") continue;
        for (const id of a.obligations) {
          // Un lien vers une obligation disparue est pire qu'aucun lien : il
          // fait croire que l'article est couvert alors qu'il ne l'est plus.
          expect(connues.has(id), `${c.id} / ${a.ref} → ${id}`).toBe(true);
        }
      }
    }
  });

  it("un article écarté cite une exclusion déclarée du périmètre", () => {
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.statut !== "hors_perimetre") continue;
        expect(Object.keys(EXCLUSIONS), `${c.id} / ${a.ref}`).toContain(
          a.exclusion,
        );
      }
    }
  });

  it("un article sans objet dit pourquoi", () => {
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.statut !== "sans_objet") continue;
        // « Sans objet » sans motif est une case cochée, pas une lecture.
        expect(a.motif.length, `${c.id} / ${a.ref}`).toBeGreaterThan(20);
      }
    }
  });

  it("un article dépouillé porte la date ET la provenance de sa lecture", () => {
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.statut === "non_depouille") continue;
        expect(a.luLe, `${c.id} / ${a.ref}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // Sans provenance, une lecture indirecte et une lecture à la source se
        // ressemblent une fois écrites — et seule la seconde peut fonder une
        // entrée du référentiel.
        expect(
          a.lecture,
          `${c.id} / ${a.ref} : provenance de lecture absente`,
        ).toBeDefined();
      }
    }
  });

  it("aucune entrée ne se fonde sur une lecture indirecte", () => {
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.statut !== "retenu") continue;
        // Deux reproductions consolidées concordantes peuvent dériver du même
        // relevé, et aucune ne porte la date de version faisant foi.
        expect(
          a.lecture,
          `${c.id} / ${a.ref} : un article « retenu » ne peut pas reposer sur une lecture indirecte`,
        ).not.toBe("indirect");
      }
    }
  });

  it("un corpus partiel ne se déclare jamais complet", () => {
    for (const c of CORPUS) {
      const cv = couverture(c);
      if (c.etendue === "articles_cites") {
        expect(cv.complet, `${c.id} : partiel mais annoncé complet`).toBe(
          false,
        );
      }
    }
  });

  it("le lien obligation ↔ article tient dans les deux sens", () => {
    // Sans ce contrôle, un corpus pourrait s'attribuer une couverture qu'aucune
    // obligation ne confirme, et la dette descendrait sans que rien
    // ne s'améliore.
    //
    // « LES DEUX SENS » N'EN COUVRE QU'UN, mesuré le 2026-09-01 par le lot A en
    // réinjectant les défauts qu'il venait de corriger. `liensRetenusRompus()`
    // part du CORPUS : un article « retenu » qui nomme une obligation qui ne le
    // cite pas est une rupture. L'autre sens ne l'est pas — une obligation peut
    // citer un article dont l'entrée de corpus ne la nomme plus, et rien ne
    // rougit ; c'est seulement l'alerte `CORPUS_NE_RENVOIE_PAS` de
    // `pnpm relecture`, qui n'échoue pas. Vérifié en remettant `GC 22` en
    // fondement de `cuisson-erp-extinction-automatique-annuelle` après l'avoir
    // ôté de la liste de GC 22 : 1907 tests au vert.
    //
    // Ce qui EST gardé, en revanche : changer la clé `article` d'un fondement
    // pour un article que le corpus rattache encore à l'obligation d'origine
    // rompt le lien dans le sens couvert. Quatre des cinq recalages de clé du
    // lot A rougissent à la réinjection par ce chemin.
    //
    // Fermer l'autre sens ferait échouer les onze `CORPUS_NE_RENVOIE_PAS`
    // existants d'un coup — ils sont la matière du lot D. À reprendre APRÈS
    // lui, pas ici : un test qui naît rouge se désarme.
    expect(liensRetenusRompus()).toEqual([]);
  });

  it("la couverture ne se déclare complète que si tout est lu", () => {
    for (const c of CORPUS) {
      const cv = couverture(c);
      // « Complet » exige les deux : tout lu ET liste exhaustive du texte.
      expect(cv.complet, c.id).toBe(
        c.etendue === "integral" && cv.nonDepouilles === 0,
      );
      // Somme exhaustive : tout article a exactement un statut. Un statut
      // ajouté au type et oublié ici ferait diverger la somme du total — ce
      // qui est arrivé lors de l'ajout d'`obligation_manquante`.
      expect(
        cv.retenus +
          cv.sansObjet +
          cv.horsPerimetre +
          cv.nonCouverts +
          cv.obligationsManquantes +
          cv.nonDepouilles,
        `${c.id} : la somme des statuts ne fait pas le total — un statut manque au compte`,
      ).toBe(cv.total);
    }
  });
});

describe("corpus — la dette de lecture, mesurée et décroissante", () => {
  // Le nombre d'obligations qui s'appuient sur au moins un texte qu'aucun
  // corpus ne déclare avoir lu. Ce chiffre ne doit JAMAIS augmenter : ajouter
  // une obligation fondée sur un texte non dépouillé, c'est creuser l'angle
  // mort qu'on est en train de combler.
  //
  // Il descend à mesure que les corpus sont dépouillés. Quand il atteint 0,
  // le référentiel peut dire — et prouver — qu'il ne repose que sur des textes
  // lus de bout en bout.
  // 1 : `aeration-habitation-vmc-gaz-annuelle`, dont l'unique référence est
  // l'arrêté du 23 février 2018, délibérément laissé non dépouillé — sa
  // lecture s'interrompt avant le titre qui traite du contrôle, et
  // l'obligation est de criticité 5. Le déclarer lu serait le pire service à
  // lui rendre.
  // Abaissé de 1 à 0 le 2026-08-27 : R. 4412-17 et GC 8, derniers articles
  // cités sans être dépouillés, sont entrés au corpus avec leur verbatim. Le
  // cliquet ne remonte pas — toute obligation nouvelle devra désormais
  // s'appuyer sur un texte lu.
  const PLAFOND = 0;

  // Le nombre de références qui ne portent même pas de clé d'article, donc
  // rattachables à aucun corpus. Complément indispensable du plafond : sans
  // lui, « 0 article cité non dépouillé » se lirait comme « tout est lu ».
  // Zéro, et le cliquet le verrouille : toute nouvelle référence devra porter
  // sa clé d'article dès son écriture. C'est ce qui garantit qu'un texte cité
  // pourra toujours être rattaché à un corpus — donc vérifié.
  const PLAFOND_SANS_CLE = 0;

  it("ne dépasse pas le plafond, et le plafond ne remonte pas", () => {
    const restantes = obligationsSurTextesNonDepouilles();
    expect(
      restantes.length,
      `${restantes.length} obligation(s) s'appuient sur un texte non dépouillé ` +
        `(plafond ${PLAFOND}). Si ce nombre a BAISSÉ, abaisser PLAFOND d'autant : ` +
        `c'est un cliquet, il ne remonte pas. S'il a AUGMENTÉ, une obligation a ` +
        `été ajoutée sur un texte que personne n'a lu — dépouiller le corpus ` +
        `avant de l'encoder.`,
    ).toBeLessThanOrEqual(PLAFOND);
  });

  it("le nombre de références sans clé ne remonte pas non plus", () => {
    const sans = referencesSansCle();
    expect(
      sans.length,
      `${sans.length} référence(s) sans clé d'article (plafond ${PLAFOND_SANS_CLE}). ` +
        `Une référence sans clé n'est rattachable à aucun corpus. Renseigner ` +
        `\`article\` puis abaisser PLAFOND_SANS_CLE.`,
    ).toBeLessThanOrEqual(PLAFOND_SANS_CLE);
  });

  it("le plafond colle à la réalité : il ne reste pas gonflé", () => {
    const restantes = obligationsSurTextesNonDepouilles();
    // Un plafond très au-dessus du réel ne protège plus de rien. On le garde
    // serré : au plus deux obligations de marge.
    expect(
      PLAFOND - restantes.length,
      `PLAFOND (${PLAFOND}) est trop haut : il n'en reste que ${restantes.length}. ` +
        `Abaisser PLAFOND à ${restantes.length}.`,
    ).toBeLessThanOrEqual(2);
  });
});

/**
 * Le jour où la règle de lecture entre en vigueur.
 *
 * Elle ne mord PAS sur ce qui précède, et c'est la seule façon de la rendre
 * tenable : reprendre les 276 articles déjà dépouillés supposerait de rouvrir
 * Légifrance article par article, et une valeur devinée y serait pire que le
 * vide. Un index partiel attrape quand même le prochain décret.
 */
const REGLE_MODIFICATEUR_DEPUIS = "2026-09-01";

/**
 * Les lectures de première main postérieures à la règle qui ne disent pas par
 * quel texte leur version en vigueur l'est devenue.
 *
 * Extraite pour que la garantie et sa contre-épreuve emploient **le même**
 * prédicat, comme `renvoisMorts` dans `transmission.test.ts` : une
 * contre-épreuve qui recopie la logique reste verte quand on neutralise la
 * garantie, puisqu'elles ne partagent plus rien.
 *
 * `undefined` seul est un manquement. `null` est une réponse — « regardé, pas
 * de texte modificateur à signaler » — et c'est ce qui évite le piège de la
 * liste : il n'y a **aucune liste d'articles dispensés** à tenir ici, donc
 * aucun moyen de réparer le test en y ajoutant une ligne. La seule réparation
 * est d'écrire la réponse sur l'article.
 */
function lecturesSansTexteModificateur(
  corpus: readonly Corpus[],
): string[] {
  const muettes: string[] = [];
  for (const c of corpus) {
    for (const a of c.articles) {
      if (a.statut === "non_depouille") continue;
      if (a.lecture !== "premiere_main") continue;
      if ((a.luLe ?? "") < REGLE_MODIFICATEUR_DEPUIS) continue;
      if (a.modifiePar === undefined) muettes.push(`${c.id} / ${a.ref}`);
    }
  }
  return muettes;
}

describe("corpus — une URL d'article mène à l'article, pas à sa section", () => {
  /**
   * Le nombre d'articles dont l'`url` pointe une SECTION de Légifrance
   * (`section_lc`, qui porte un identifiant `LEGISCTA`) au lieu de l'article
   * lui-même (`article_lc`, `LEGIARTI`).
   *
   * **Ce n'est pas une coquette de présentation, c'est une cause d'erreur de
   * lecture mesurée.** Une URL de section rend la section ENTIÈRE : celui qui
   * l'ouvre pour vérifier « GE 4 » lit une page où figurent GE 1 à GE 8, et
   * rien ne lui dit lequel est le bon. L'incident a coûté trois lectures
   * successives du même article le 2026-09-02, chacune sur un texte voisin.
   * Et le dossier de relecture remis à un préventeur porte ces liens : il
   * l'envoie sur un chapitre là où l'entrée annonce un article.
   *
   * La correction ne se dérive pas : l'identifiant `LEGIARTI` de l'article ne
   * se déduit pas du `LEGISCTA` de sa section. Chacune de ces cinquante
   * entrées demande d'ouvrir Légifrance et de relever l'URL de l'article —
   * c'est un travail de dépouillement, pas un remplacement automatique, et
   * fabriquer une URL plausible serait exactement la faute que ce corpus
   * existe pour empêcher.
   *
   * D'où le cliquet plutôt qu'une correction en bloc : le nombre est établi,
   * il ne remonte pas, et il descend à mesure que les articles sont rouverts.
   * Une entrée neuve qui porterait une URL de section ferait échouer ce test
   * le jour même.
   *
   * TRENTE, ET LE CHIFFRE A ÉTÉ MESURÉ EN APPELANT. Un `grep` sur
   * `section_lc` en compte cinquante : il attrape aussi les URL de corpus —
   * légitimes, un corpus désigne un texte ou une section — et des fichiers que
   * `CORPUS` n'exporte pas. Trente est ce que le prédicat trouve sur les
   * articles réellement exportés. C'est le même écart que celui qui a fait
   * circuler trois comptes faux cette semaine, et il s'évite de la même
   * façon : on appelle, on ne cherche pas une chaîne.
   */
  const PLAFOND_URLS_DE_SECTION = 30;

  /** Les articles dont l'URL désigne une section plutôt qu'eux-mêmes. */
  function urlsDeSection(): string[] {
    const trouves: string[] = [];
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.url?.includes("section_lc")) trouves.push(`${c.id} / ${a.ref}`);
      }
    }
    return trouves;
  }

  it("le nombre d'URL de section ne remonte pas", () => {
    const trouvees = urlsDeSection();
    expect(
      trouvees.length,
      `${trouvees.length} article(s) portent une URL de SECTION là où l'entrée ` +
        `désigne un article (plafond ${PLAFOND_URLS_DE_SECTION}). Une URL de ` +
        `section rend la section entière : celui qui l'ouvre pour vérifier un ` +
        `article en lit huit, et le dossier remis à un préventeur l'envoie sur ` +
        `un chapitre. Relevez l'URL d'article sur Légifrance — elle ne se ` +
        `déduit pas de celle de la section, et une URL fabriquée serait pire ` +
        `que celle-ci.\n` +
        trouvees.join("\n"),
    ).toBeLessThanOrEqual(PLAFOND_URLS_DE_SECTION);
  });

  it("le cliquet voit bien l'URL de section qu'il compte", () => {
    // Contre-épreuve : sans elle, un prédicat qui ne trouverait jamais rien
    // resterait vert et passerait pour une garantie. On ajoute un corpus
    // témoin plutôt que d'énumérer l'état réel — celui-ci descendra, et une
    // liste recopiée cesserait de vérifier au premier article corrigé.
    const avant = urlsDeSection().length;
    const temoin: Corpus = {
      id: "corpus-temoin",
      intitule: "Corpus témoin",
      url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000000000000/",
      etendue: "articles_cites",
      portee: "Corpus de test, jamais exporté.",
      articles: [
        {
          ref: "T 1",
          url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000000000/LEGISCTA000000000000/",
          statut: "non_depouille",
        },
      ],
    };
    const avecTemoin = [...CORPUS, temoin].flatMap((c) =>
      c.articles
        .filter((a) => a.url?.includes("section_lc"))
        .map((a) => `${c.id} / ${a.ref}`),
    );
    expect(avecTemoin.length).toBe(avant + 1);
    expect(avecTemoin).toContain("corpus-temoin / T 1");
  });
});

describe("corpus — d'un article modifié au texte qui l'a modifié", () => {
  it("toute lecture de première main dit par quel texte, ou dit qu'il n'y en a pas", () => {
    expect(
      lecturesSansTexteModificateur(CORPUS),
      "Un article dépouillé en première main depuis le " +
        `${REGLE_MODIFICATEUR_DEPUIS} ne porte pas \`modifiePar\`. Écrivez le ` +
        "texte qui a produit la version lue — et ouvrez-le EN ENTIER avant, " +
        "c'est la règle en tête de `corpus/types.ts` qui compte, pas le " +
        "champ. Si l'article n'a pas de texte modificateur à signaler, " +
        "écrivez `modifiePar: null` : c'est une réponse, l'absence n'en est " +
        "pas une.",
    ).toEqual([]);
  });

  it("la règle mord sur ce qu'elle vise, et sur rien d'autre", () => {
    // Contre-épreuve. La garantie ci-dessus traverse désormais quarante-neuf
    // articles — les lectures de première main du 2026-09-01, dont chacune
    // porte sa réponse depuis que la dette a été soldée. Elle est donc verte
    // parce que le corpus est en règle, ce qui est indistinguable, sur le
    // seul corpus, d'une garde qui ne mordrait sur rien : c'est le mode de
    // panne exact de ce genre de garde, et c'était déjà vrai quand elle ne
    // traversait aucun article. Les cas fabriqués la font mordre ici, et
    // exercent les trois frontières qui la définissent : la borne de date,
    // la provenance, et le statut.
    const article = (a: Partial<ArticleDepouille>): ArticleDepouille =>
      ({
        ref: "R. 0000-0",
        luLe: "2026-09-02",
        lecture: "premiere_main",
        statut: "sans_objet",
        motif: "Motif de test, assez long pour tenir les autres contrôles.",
        ...a,
      }) as ArticleDepouille;

    const corpusTemoin = (...articles: ArticleDepouille[]): Corpus[] => [
      {
        id: "temoin",
        intitule: "Corpus témoin",
        url: "https://example.invalid/",
        portee: "Cas fabriqués pour éprouver la garde.",
        etendue: "articles_cites",
        articles,
      },
    ];

    // Le cas visé : lu de première main après la règle, muet. Attrapé, nommé.
    expect(
      lecturesSansTexteModificateur(corpusTemoin(article({ ref: "MUET" }))),
    ).toEqual(["temoin / MUET"]);

    // BORNE BASSE, inclusive. Le jour même de la règle est dedans ; la veille
    // ne l'est pas. Sans ces deux cas, écrire `>` au lieu de `>=` — ou dater
    // la règle d'un jour trop tard — passerait sans bruit.
    expect(
      lecturesSansTexteModificateur(
        corpusTemoin(article({ ref: "JOUR-J", luLe: REGLE_MODIFICATEUR_DEPUIS })),
      ),
    ).toEqual(["temoin / JOUR-J"]);
    expect(
      lecturesSansTexteModificateur(
        corpusTemoin(article({ ref: "VEILLE", luLe: "2026-08-31" })),
      ),
    ).toEqual([]);

    // LES DEUX RÉPONSES ACCEPTÉES, et le fait qu'elles le soient toutes deux
    // est la moitié de la règle : un article sans texte modificateur doit
    // pouvoir le DIRE, sinon la seule sortie serait d'en inventer un.
    expect(
      lecturesSansTexteModificateur(
        corpusTemoin(article({ ref: "NÉANT", modifiePar: null })),
      ),
    ).toEqual([]);
    expect(
      lecturesSansTexteModificateur(
        corpusTemoin(
          article({ ref: "NOMMÉ", modifiePar: { texte: "Décret n° 0000-0" } }),
        ),
      ),
    ).toEqual([]);

    // COUCHE VOISINE, ET C'EST UNE LIMITE ASSUMÉE, PAS UN OUBLI. La règle ne
    // vise que `premiere_main`. Les lectures d'agent — 238 des 276 articles —
    // n'y sont pas soumises, parce qu'on ne peut pas exiger d'un dépouillement
    // déjà fait ce qu'il n'a pas relevé, et que quarante entrées du 2026-09-01
    // en `agent_verbatim` seraient rouges le jour de l'ajout sans que personne
    // puisse les remplir sans rouvrir les textes. La garde couvre donc ce qui
    // PEUT s'y conformer. Ce cas fige la frontière : l'élargir est une
    // décision, pas un effet de bord.
    expect(
      lecturesSansTexteModificateur(
        corpusTemoin(article({ ref: "AGENT", lecture: "agent_verbatim" })),
      ),
    ).toEqual([]);
    expect(
      lecturesSansTexteModificateur(
        corpusTemoin(article({ ref: "PAS-LU", statut: "non_depouille" })),
      ),
    ).toEqual([]);
  });

  it("la valeur écrite au champ n'est pas une coquille vide", () => {
    // Le champ pourrait se remplir de `{ texte: "" }` et satisfaire la garde
    // ci-dessus : elle ne regarde que la présence. Un texte modificateur se
    // cite comme il s'ouvre — « Décret n° 2025-482 du 27 mai 2025 » —, sans
    // quoi le prochain lecteur ne saura pas quoi ouvrir.
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (!a.modifiePar) continue;
        expect(a.modifiePar.texte.trim().length, `${c.id} / ${a.ref}`,).toBeGreaterThan(10);
      }
    }
  });
});

describe("corpus — Livre III du règlement de sécurité ERP", () => {
  const pe = CORPUS.find((c) => c.id === "arrete-1980-livre-3");

  it("est déclaré et dépouillé de bout en bout", () => {
    expect(pe, "le corpus PE a disparu de CORPUS").toBeDefined();
    const cv = couverture(pe!);
    // 59 depuis le 2026-08-26 : PO 1 § 3 est dépouillé à part de PO 1, son
    // volet biennal ne se traitant pas comme son volet annuel.
    expect(cv.total).toBe(59);
    expect(cv.complet, `${cv.nonDepouilles} article(s) non dépouillé(s)`).toBe(
      true,
    );
  });

  it("ne retient qu'un seul article créant une obligation périodique pour les secteurs couverts", () => {
    // Le résultat du dépouillement du 2026-08-26, verrouillé : sur 58 articles,
    // PE 4 est le seul à imposer une échéance à un exploitant de restaurant, de
    // commerce ou de bureau. PE 27 impose une instruction du personnel sans
    // périodicité écrite. Si ce test casse, c'est qu'un article a changé de
    // statut — donc que quelqu'un a relu, ou que quelqu'un s'est trompé.
    const refs = obligationsManquantes().map((o) => o.ref);
    // PE 4 et R. 4222-20 ont quitté la liste le 2026-08-27 : le porteur
    // « établissement » de l'ADR-022 les rend encodables, et ils le sont —
    // `incendie-erp-pe4-entretien-installations-techniques` et
    // `aeration-controle-installations-r4222-20`. Ce sont les deux premières
    // sorties de cette liste par livraison plutôt que par requalification.
    // Aucun des deux n'est retenu en entier : leurs `reserve` disent ce qui
    // reste (PE 4 § 1 attend `locauxSommeil`, la pollution spécifique attend
    // un secteur qui la concerne), et `reservesDeLecture()` les compte.
    // PE 27 reste manquant.
    // PE 27 : instruction du personnel côté ERP, sans périodicité écrite.
    // R. 4544-11-1 : attestation médicale quinquennale, en vigueur depuis
    // octobre 2025, nominative donc bloquée par le porteur d'échéance.
    // R. 4222-20 : entretien de « l'ensemble des installations » d'aération,
    // quatrième cas du motif PE 4 — un article qui prescrit plus large que ce
    // que le référentiel sait porter.
    // Arrêté 23-02-2018 art. 26 § 3 : entretien décennal des installations
    // collectives de gaz entre l'organe de coupure générale et les compteurs.
    // Ajouté le 2026-08-26 à la lecture en première main du texte, qui a
    // simultanément confirmé le § 5° (VMC-gaz) et révélé ce § 3°. Bloqué par
    // l'absence d'une catégorie d'équipement « installation collective de gaz ».
    // PO 1 § 3 : le contrôle biennal porte sur « l'ensemble des installations
    // techniques ». Cinquième occurrence du motif PE 4 — énumérer les
    // catégories reviendrait à décider à la place du texte, et deux d'entre
    // elles portent déjà une obligation biennale valant pour tous les ERP.
    // PO 7 : deux séances d'instruction du personnel par an. Périodicité
    // chiffrée, donc encodable — mais aucune catégorie d'équipement à quoi
    // l'accrocher, comme PE 27 § 5 et R. 4544-11-1.
    // Les deux passent de `non_couvert` à `obligation_manquante` le
    // 2026-08-26 : la lecture en première main a montré qu'il ne s'agissait
    // pas d'articles sans objet, mais d'obligations réelles que le modèle ne
    // sait pas porter. La liste s'allonge parce qu'on voit mieux.
    // L'ordre suit la déclaration des corpus, pas l'alphabet.
    expect(refs).toEqual([
      "PE 27",
      // PE 37 a quitté cette liste le 2026-08-31 au soir : sa quinquennale est
      // désormais portée par `incendie-erp-5-visite-commission`, et l'article
      // passe à `retenu` avec une `reserve`. Cette réserve disait alors deux
      // choses — l'ancrage sur une alarme déclarée, et le « pour le public »
      // qu'une caractéristique d'équipement ne distinguait pas ; les deux sont
      // CLOSES depuis le 2026-09-01 et l'attribut d'établissement. Elle en dit
      // une autre depuis, trouvée en relisant l'article : son renvoi exprès à
      // GE 2, GE 3 et GE 5, trois articles du Livre II que personne n'a
      // ouverts. QUATRIÈME sortie par
      // livraison plutôt que par requalification, après PE 4, R. 4222-20 et
      // R. 4544-11-1. Il y était entré le 2026-08-26, en rectification d'une
      // affirmation contraire portée le matin même ; il en sort parce que le
      // motif qui l'y retenait — « aucun attribut pour le déclencher sans
      // sur-appliquer » — décrivait une sur-application MUETTE, que la
      // périodicité rend visible et corrigeable par une réponse « non ».
      "PO 1 § 3 — contrôle biennal des installations techniques",
      "PO 7",
      // PO 12 réimporte PO 7 dans le régime des établissements EXISTANTS
      // (« Les dispositions des articles PE 27 (§ 5) et PO 7 sont
      // applicables »). Ajouté le 2026-08-26 : la relecture a montré que le
      // champ « à construire ou à modifier » de la section 1 ne cantonne pas
      // ces périodicités — PO 8 § 1 fait de même pour PO 1 § 3. Même blocage
      // que PO 7 : aucun équipement porteur.
      "PO 12",
      // ── Lot D (traçabilité), 2026-09-01 : GZ 13 et GZ 14, entrés au corpus
      // parce que GZ 15 s'ouvre sur « Elles » et qu'on est allé chercher
      // l'antécédent. Il n'était pas là — voir la réserve de GZ 15 —, mais les
      // deux articles qu'on a ouverts pour le trouver portent chacun une
      // obligation d'exploitant que le référentiel ne porte pas. Ce ne sont
      // donc pas deux défauts d'encodage : ce sont deux textes lus de plus,
      // même motif que les entrées du lot 7 et du lot D1.
      //
      // GZ 13 § 4 : « L'utilisation du gaz ne peut intervenir qu'après
      // vérification de l'installation, par une personne ou un organisme
      // agréé », avec rapport conforme à GE 9 et visa au registre de sécurité.
      // Préalable à la mise en service, pas une périodicité.
      "GZ 13",
      // GZ 14 § 1 : l'entretien et le maintien en l'état des installations de
      // gaz « incombent à l'exploitant ». État permanent, du même genre que le
      // « maintenus en bon état » de R. 4227-29 — que le référentiel porte
      // pour les extincteurs et pas ici.
      //
      // Les deux sont bloquées par la même chose : aucune catégorie
      // d'équipement « installation de gaz ». Les accrocher à
      // `APPAREIL_CUISSON_ERP` sous-appliquerait, une installation de gaz
      // alimentant aussi un chauffage ou une production d'eau chaude. C'est le
      // blocage déjà nommé pour l'arrêté du 23 février 2018, art. 26 § 3.
      "GZ 14",
      // GH 61 A QUITTÉ CETTE LISTE LE 2026-09-04, ET C'EST LE POINT DU LOT.
      // Il y était entré la veille en `obligation_manquante` avec cette
      // observation : « c'est la première entrée de cette liste que rien ne
      // bloque au modèle ». Elle était juste. Le § 5 a été rouvert, lu en
      // entier — sept paragraphes, quatre appels sur trois URL, plus le
      // recoupement indépendant de GH 5 § 3.1.4 — et l'obligation est encodée :
      // `incendie-igh-charge-calorifique-quinquennale`, porteur établissement,
      // quinquennale, `organisme_agree`, `typologies: { igh: true }` sans
      // restriction de classe. L'article est passé en `retenu`, avec une
      // réserve pour la moitié qui reste dehors : le premier cycle « dans
      // l'année qui suit l'installation dans les lieux », qui est un
      // déclencheur d'événement que le modèle ne porte pas.
      //
      // Ce qu'il faut retenir pour les entrées suivantes : une entrée de cette
      // liste que rien ne bloque au modèle n'attend pas un ADR, elle attend une
      // heure de travail. Celle-ci en a demandé une.
      // ── Lot « les sept articles du Livre II », 2026-09-04. Quatre entrées
      // pour sept articles lus, et c'est le résultat qu'il faut lire dans les
      // deux sens : trois des sept étaient encodables et le sont
      // (`CH 39` → `aeration-erp-filtres-visite-periodique`, `MS 69` →
      // `incendie-erp-alarme-verification-hebdomadaire`, `AS 9` → l'obligation
      // CCH qui portait déjà le même contrôle quinquennal), quatre ne le sont
      // pas et disent chacune ce qui la bloque.
      //
      // Elles partagent une cause à trois nuances près : il n'y a rien À QUOI
      // les accrocher. CO 61 et AS 10 attendent une catégorie d'équipement que
      // `CATEGORIES_EQUIPEMENT` ne porte pas ; GC 18 attend en plus un attribut
      // disant qu'une cuisine est temporaire ; MS 71 attend deux attributs
      // d'établissement — le nombre de niveaux de sous-sol et leur surface.
      //
      // CO 61 § 6 : inspection quinquennale de l'état de conservation d'une
      // tribune TÉLESCOPIQUE de plus d'un mètre, par un organisme accrédité.
      // Types X et L, hors des trois secteurs cibles.
      "CO 61",
      // AS 10 : l'annuelle des escaliers mécaniques et trottoirs roulants, par
      // personne ou organisme agréé, PLUS un examen des chaînes et crémaillères
      // à mi-période par l'entreprise d'entretien. Deux rythmes, deux
      // réalisateurs. C'est le manque le plus proche de la cible — un escalier
      // mécanique se rencontre en centre commercial, type M. Ne surtout pas
      // l'accrocher à `ASCENSEUR` : AS 9 et AS 10 ne coïncident sur rien.
      "AS 10",
      // GC 18 h) : nettoyage du conduit d'extraction d'un module ou conteneur
      // spécialisé de cuisson, avant chaque mise en place et au moins tous les
      // six mois. L'accrocher à `HOTTE_PRO` doublerait la fréquence du ramonage
      // annuel de GC 21 pour toutes les cuisines professionnelles, sur la foi
      // d'un article qui ne vise que la cuisine TEMPORAIRE.
      "GC 18",
      // MS 71 § 3 : vérification de la continuité des communications
      // radioélectriques, une fois avant ouverture puis tous les trois ans, par
      // un organisme agréé par le ministère chargé de la sécurité civile. Le
      // § 1 la réserve aux ERP du 1er groupe disposant de PLUS D'UN niveau de
      // sous-sol, et l'écarte sous 100 m² de sous-sol total. C'est la seule
      // entrée de ce lot où la sur-application a été explicitement REFUSÉE :
      // le champ exclut plus qu'il n'inclut, et le rendez-vous appelle un
      // organisme agréé.
      "MS 71",
      // R. 4323-24 A QUITTÉ CETTE LISTE LE 2026-09-04, et par la porte qu'il
      // annonçait lui-même. Il y était entré le 2026-09-02 avec un `bloquePar`
      // qui disait : « Rien de technique : la pièce est un document permanent
      // d'établissement, forme que le modèle sait déjà porter. Ce qui manque
      // est l'encodage lui-même. » C'est la seconde entrée de cette liste, après
      // GH 61, à sortir parce que quelqu'un a fait le travail qu'elle décrivait
      // plutôt que d'attendre un ADR. La liste des personnes qualifiées est
      // portée par `prevention-etablissement-liste-personnes-qualifiees`, dans
      // le domaine `organisation_prevention` et non `levage` : elle est UNE
      // pour tout l'établissement et couvre toutes les vérifications générales
      // périodiques du parc. La qualification du vérificateur, elle, était déjà
      // couverte par `personne_qualifiee`.
      // `R. 4544-11-1` a quitté cette liste le 2026-08-27 : le porteur salarié
      // de l'ADR-023 la rend encodable, et elle l'est —
      // `elec-salarie-attestation-medicale-voisinage`. Troisième sortie par
      // livraison plutôt que par requalification, après PE 4 et R. 4222-20.
      // R. 4544-11 : l'habilitation SPÉCIFIQUE aux travaux sous tension, et le
      // II — une vérification préalable à la charge de l'employeur que personne
      // n'avait relevée. Distinctes toutes deux de l'habilitation ordinaire de
      // R. 4544-10, que le référentiel porte.
      //
      // Inscrite au second essai : la première lecture n'avait rendu qu'une
      // restitution partiellement traduite, et un article dont on n'a pas le
      // texte ne s'inscrit pas ici. Le verbatim du I a été obtenu en redemandant
      // le français sans traduction.
      //
      // Bloquée par le renvoi du I aux normes de R. 4544-3 pour la délivrance et
      // le renouvellement : c'est le renvoi qui avait produit le « triennal »
      // NF C 18-510 déjà retiré de ce dépôt. Encoder supposerait de trancher ce
      // qu'il vaut, et ce n'est pas un choix technique.
      "R. 4544-11",
      // R. 4222-21 entre le 2026-09-01 avec le recalage des fondements (lot A),
      // et il y entre par le chemin inverse de tous les autres : non parce
      // qu'on a lu un texte de plus, mais parce qu'on a RETIRÉ la seule
      // obligation qui s'y adossait. `aeration-travail-mise-en-service` le
      // citait pour fonder un contrôle à la mise en service ; l'article
      // n'impose qu'une consigne d'utilisation écrite — dispositions prises
      // pour la ventilation, mesures en cas de panne, avis du médecin du
      // travail et du CSE —, et cette consigne n'est portée par aucune
      // obligation. Elle est nommée par trois textes (celui-ci, l'article 2 b)
      // de l'arrêté du 8 octobre 1987, R. 4224-17) et demandée par aucun. Le
      // lot A ne crée pas d'obligation : le manque est nommé, pas comblé.
      "R. 4222-21",
      "Arrêté 23-02-2018 art. 26 § 3",
      // Les trois suivantes entrent avec le lot 7, et la liste s'allonge pour
      // la raison qu'elle s'allonge toujours ici : on a lu quatre textes de
      // plus. Aucune n'est un défaut d'encodage, chacune dit ce qui la bloque.
      //
      // L. 4141-5 : le passeport de prévention, en vigueur depuis le
      // 2026-06-27 (loi n° 2026-534 du 25 juin 2026, art. 70). L'employeur
      // doit le renseigner pour les formations qu'il dispense — mais le
      // passeport est intégré au système d'information du compte personnel de
      // formation et géré par la Caisse des dépôts. Rien de ce que l'outil
      // détiendrait ne pourrait solder une obligation qui se remplit chez un
      // tiers, et le V de l'article renvoie encore ses modalités au comité
      // national de prévention et de santé au travail.
      "L. 4141-5",
      // R. 4141-8 et R. 4141-12 : formation à la sécurité après un accident
      // grave (ou des accidents répétés au même poste), et après modification
      // des conditions de circulation ou d'exploitation. Toutes deux réelles,
      // toutes deux ÉVÉNEMENTIELLES — et il n'y a pas de déclencheur
      // « événement » dans le modèle : l'ADR-022 nomme l'axe et s'arrête là.
      // S'y ajoute, pour R. 4141-8, que le registre des accidents du travail
      // et la déclaration d'AT sont déclarés hors périmètre produit : l'outil
      // ne connaîtrait pas l'accident qui déclenche l'obligation.
      "R. 4141-8",
      "R. 4141-12",
      // L. 4622-1 a quitté cette liste le 2026-09-01, et CE TEST EST LA RAISON
      // POUR LAQUELLE IL Y ÉTAIT RESTÉ. L'article était encodé depuis le
      // 2026-08-31 — `sante-travail-etablissement-adhesion-spst` — sans que
      // l'entrée `obligation_manquante` d'origine soit retirée du corpus
      // `code-travail-sante-travail`. Retirer cette entrée périmée fait
      // `1 failed | 1835 passed`, et le SEUL test à protester est celui-ci :
      // il exigeait `L. 4622-1` parmi les manquantes, donc il était VERT SUR
      // L'ÉTAT FAUX ET ROUGE SUR L'ÉTAT JUSTE, réparable en supprimant une
      // ligne. Une liste écrite à la main ne détecte pas qu'une affirmation a
      // cessé d'être vraie : elle la certifie, et se répare en recopiant.
      // Sixième sortie de cette liste, et la première qui ne doive rien à une
      // livraison ni à une requalification — seulement au fait que personne
      // n'avait fait pour cet article ce que la sortie de PE 37 avait fait la
      // veille au soir pour le sien.
      //
      // Ce que le défaut a coûté à voir : rien ne le signalait. La garde de
      // cohérence inter-corpus en tête de ce fichier est écrite pour ça, et
      // c'est un invariant — pas un décompte de plus.
      // R. 4624-28-2 : l'employeur informe son service de santé au travail de
      // la cessation d'exposition, du départ ou de la mise à la retraite d'un
      // salarié en suivi individuel renforcé, et en avise l'intéressé sans
      // délai. Obligation d'employeur pleine, non portée — événementielle, et
      // le produit ne détient aucune date de sortie.
      //
      // Trouvée par un balayage des renvois d'intervalle : le corpus écrivait
      // « R. 4624-22 à R. 4624-28 » en n'ayant ouvert que 22, 23, 24 et 28,
      // alors que la sous-section court jusqu'à R. 4624-28-3. Un intervalle
      // cité n'est pas un intervalle lu — c'est le même défaut que la phrase
      // sur l'amiante et le plomb, corrigée le même jour.
      "R. 4624-28-2",
      // R. 4225-3 entre avec le lot 8, et pour la même raison que les
      // précédentes : un texte lu de plus, pas un défaut d'encodage. La
      // boisson non alcoolisée gratuite est due « lorsque des conditions
      // particulières de travail conduisent les travailleurs à se désaltérer
      // fréquemment » — une qualification que ni le parc d'équipements ni le
      // code NAF ne donnent, et que le déduire ferait relever du cinquième
      // déclencheur, non implémenté. La liste des postes concernés, que
      // l'employeur tient après avis du médecin du travail et du CSE, est
      // bloquée par le même manque.
      "R. 4225-3",
      // ── Lot D1, 2026-09-01 : le travail en hauteur. Bloc contigu, ajouté en
      // fin de liste À DESSEIN — le lot B est en train de supprimer cette
      // liste exhaustive, et un bloc d'un seul tenant se retire d'un coup
      // sans démêler les entrées des autres lots. C'est le seul endroit de
      // `corpus.test.ts` que le lot D1 modifie, avec `MUETS` ci-dessous.
      //
      // Ces huit entrées ne sont pas huit défauts d'encodage : ce sont huit
      // obligations réelles trouvées dans deux textes que le référentiel
      // n'avait jamais ouverts — zéro entrée de corpus, zéro citation avant ce
      // jour. Elles se répartissent en deux blocages, et deux seulement :
      // aucune catégorie d'équipement « échafaudage », et aucun attribut
      // d'établissement pour le cinquième déclencheur de l'ADR-022
      // (« activité réellement exercée »). Chaque entrée dit lequel des deux
      // la retient.
      //
      // R. 4323-61 : la notice des points d'ancrage, que l'employeur rédige et
      // détient. Seul élément documentaire de la sous-section 1.
      "R. 4323-61",
      // R. 4323-69 : formation au montage, démontage et modification des
      // échafaudages, nominative, porteur salarié. Périodicité `autre`, et
      // c'est une conclusion : R. 4323-3 dit « aussi souvent que nécessaire ».
      // Les « cinq ans » que l'on rencontre partout viennent de la
      // recommandation R 408 de la CNAM, qui n'est pas une source opposable.
      "R. 4323-69",
      // R. 4323-70 : notice, note de calcul et plan de montage « conservés sur
      // le lieu de travail ». Obligation documentaire opposable, porteur
      // équipement.
      "R. 4323-70",
      // R. 4323-72 : vérification du bon état de conservation des éléments
      // avant toute opération de montage. Seule vérification de la section 8 —
      // toutes les autres du domaine viennent de l'arrêté de 2004.
      "R. 4323-72",
      // R. 4323-89 : deux obligations dans un article — la formation aux
      // techniques sur cordes ET aux procédures de sauvetage (porteur
      // salarié), et la note de calcul des points d'ancrage (document).
      "R. 4323-89",
      // Les trois vérifications d'échafaudage de l'arrêté du 21 décembre 2004,
      // pris sur le fondement des articles alors numérotés R. 233-11 et
      // suivants, devenus R. 4323-22 à R. 4323-24. AUCUNE des trois n'est dans
      // le Code, et la section 8 n'en porte aucune : un dépouillement arrêté à
      // « R. 4323-58 et suivants » aurait conclu que le domaine ne porte pas
      // de périodicité, et se serait trompé de trois.
      //
      // Art. 4 : avant mise ou remise en service, cinq circonstances.
      // Événementielle ; le « d'au moins un mois » du cinquième cas est une
      // durée d'interruption qui déclenche, pas un intervalle qui revient.
      "Arrêté 21-12-2004 art. 4",
      // Art. 5 : examen quotidien de l'état de conservation. LE SEUL CAS DU
      // RÉFÉRENTIEL où le texte chiffre un rythme que `Periodicite` ne peut
      // pas écrire — l'énumération n'a pas de valeur journalière, et
      // `hebdomadaire` diviserait la charge réelle par sept.
      "Arrêté 21-12-2004 art. 5",
      // Art. 6 : examen approfondi, « depuis moins de trois mois ». La seule
      // périodicité chiffrée ET encodable de tout le domaine, et celle qui est
      // le plus près d'être livrable : `trimestrielle` existe, la nature
      // existe, le porteur équipement est le mieux servi des trois. Il ne
      // manque que la catégorie d'équipement.
      "Arrêté 21-12-2004 art. 6",
      // Arrêté du 31 janvier 1986 art. 102, entré le 2026-09-01 avec le
      // dépouillement du texte qui définit les familles d'habitation. Deux
      // obligations permanentes du propriétaire dans un seul article, bloquées
      // pour deux raisons distinctes. (1) S'assurer que les transformations
      // apportées à l'immeuble ne dégradent pas la réaction et la résistance
      // au feu : c'est une vigilance que des TRAVAUX déclenchent, et il n'y a
      // pas de déclencheur « événement » au modèle — l'encoder en état
      // permanent la ferait apparaître au calendrier d'un propriétaire qui n'a
      // rien transformé. (2) Identifier les places de stationnement occupées
      // moins de 30 jours par des non-résidents, qui décide si le parc reste
      // sous cet arrêté : il n'existe aucun attribut de parc de stationnement
      // annexe côté établissement.
      // Arrêté du 31 janvier 1986, art. 78-1 — entré le 2026-09-03, et c'est
      // la première entrée de cette liste qui vienne d'un article QUI N'EXISTAIT
      // PAS lors du dépouillement précédent. Créé par l'arrêté du 27 juillet
      // 2026, en vigueur depuis le 3 août : le dépouillement du 2026-09-01
      // n'avait aucune chance de le voir, et il concluait que l'article 101
      // était « la SEULE obligation périodique du texte ». Contrôle visuel des
      // boxes de stockage d'un parc annexe, au moins annuel, consigné au
      // registre de l'article 101. Bloqué par deux choses : aucun attribut ne
      // dit qu'un parc de stationnement annexe existe (même manque que l'art.
      // 102 juste en dessous), et le débiteur est un troisième porteur — « le
      // gestionnaire », propriétaire unique du parc ou son délégué — que le
      // modèle ne connaît pas.
      // Arrêté du 31 janvier 1986, art. 60, 1 — entré le 2026-09-04, et il ne
      // vient d'aucun texte nouveau : il est en vigueur depuis 1986. Il a
      // échappé à deux dépouillements successifs parce qu'il est rangé sous un
      // titre intitulé « Conduits et gaines », que le lot du 2026-09-03 a
      // écarté sur cet intitulé sans l'ouvrir. « Le fonctionnement du groupe
      // électrogène et du dispositif de mise en marche automatique doit être
      // vérifié AU MOINS UNE FOIS PAR MOIS » — la périodicité la plus courte du
      // texte. Bloqué par trois choses, et la deuxième est la plus instructive :
      // le déclencheur réel (un groupe électrogène de secours asservi,
      // alimentant le ventilateur de VMC) n'existe ni comme catégorie
      // d'équipement ni comme propriété ; l'accrocher à `VMC` ferait tomber une
      // ligne MENSUELLE sur la quasi-totalité des VMC déclarées, ce qui n'est
      // plus une sur-application visible mais du bruit ; et l'article ne nomme
      // aucun débiteur, étant écrit à la voix passive.
      "Arrêté 1986-01-31 art. 60",
      "Arrêté 1986-01-31 art. 78-1",
      "Arrêté 1986-01-31 art. 102",
      // ── Lot machines, 2026-09-02 : la branche HORS LEVAGE de R. 4323-23.
      // Bloc contigu ajouté en fin de liste, comme le lot D1 et pour la même
      // raison — le lot B supprime cette liste exhaustive, un bloc d'un seul
      // tenant se retire d'un coup.
      //
      // Deux entrées, et elles ne sont pas deux défauts d'encodage : ce sont
      // les deux articles d'assujettissement d'un arrêté que ce dépôt n'avait
      // jamais ouvert, alors que son article habilitant était dépouillé,
      // daté et cité depuis le 2026-09-01. Le levage en avait épuisé la
      // lecture.
      //
      // L'ART. 1er A QUITTÉ CETTE LISTE LE 2026-09-02, le jour même où il y
      // était entré. Il y figurait bloqué par « l'absence de toute catégorie
      // d'équipement « machine » dans `CATEGORIES_EQUIPEMENT` » ; la catégorie
      // `COMPACTEUR_PRESSE_DECHETS_MOTORISE` existe depuis, et
      // `compactage-dechets-vgp-trimestrielle` porte ses deux entrées qui
      // touchent les secteurs cibles. Sortie par LIVRAISON, comme PE 4,
      // R. 4222-20, R. 4544-11-1 et PE 37 avant lui — et non par
      // requalification. L'article passe à `retenu` avec une `reserve` : neuf
      // des onze catégories du I restent dehors, et `reservesDeLecture()` les
      // compte.
      // Art. 2 : VGP tous les douze mois. Les engins mobiles de terrassement
      // et de forage ne touchent pas la cible ; les « centrifugeuses » ne se
      // tranchent PAS à la source — l'arrêté n'en donne aucune définition et
      // ne les borne à aucune branche, là où il borne expressément les
      // machines à cylindres à l'industrie du caoutchouc. Déclaré manquant
      // plutôt que fermé dans un sens ou dans l'autre.
      "Arrêté 1993-03-05 art. 2",
      // ── Lot « signalisation », 2026-09-02 ────────────────────────────────
      // L'arrêté du 4 novembre 1993 est entré au corpus `integral` le
      // 2026-09-02, et onze de ses articles décrivaient une obligation que le
      // référentiel ne portait pas : AUCUNE de ses obligations livrées ne
      // visait la signalisation de sécurité, sous aucun porteur. Ce n'était
      // donc pas un manque de modèle comme PO 7 ou PE 27 — le déclencheur
      // « statut d'employeur » et l'état permanent de l'ADR-026 existaient
      // tous deux. C'était un domaine entier qu'on n'avait pas ouvert.
      //
      // Une seule des onze portait une périodicité, et c'est l'art. 15 : « au
      // moins chaque semestre » pour les signaux LUMINEUX et ACOUSTIQUES,
      // « au moins une fois par an » pour les alimentations de secours de
      // l'art. 7. Sur le reste de la signalisation — panneaux, couleurs,
      // bandes — l'article n'impose qu'un entretien « régulier », sans rythme.
      // Le guide professionnel qui a déclenché ce lot annonçait le semestre
      // pour « les moyens et dispositifs de signalisation » : bon chiffre,
      // mauvaise assiette, et l'encoder de bonne foi aurait fabriqué un
      // rendez-vous sur un parc que le texte ne vise pas. Les trois
      // obligations de l'art. 15 respectent ce partage.
      //
      // SEPT DES ONZE SONT SORTIES LE 2026-09-02, encodées par le domaine
      // `signalisation` : les articles 2, 7, 9, 10, 11, 12 et 15, qui donnent
      // neuf obligations — l'article 15 en porte trois, une par rythme. Ce
      // qu'elles ont demandé n'était pas un attribut nouveau : c'était de
      // choisir le porteur établissement là où aucune catégorie d'équipement
      // ne désigne un panneau ni un signal, et de trancher le recouvrement de
      // la semestrielle avec l'autonomie de l'éclairage de sécurité — deux
      // objets différents sur un même BAES, à la même cadence.
      //
      // LES QUATRE QUI RESTENT NE RESTENT PAS POUR LA MÊME RAISON, et c'est
      // pourquoi elles sont commentées une par une plutôt qu'en bloc.
      //
      // Art. 4 : la consultation préalable à la détermination de la
      // signalisation. Le texte, jamais modifié depuis 1993, désigne le CHSCT
      // et, à défaut, les délégués du personnel — deux instances fondues dans
      // le CSE au plus tard le 1er janvier 2020 par l'ordonnance n° 2017-1386.
      // Le renvoi est mort ; substituer le CSE serait écrire ce qu'aucun texte
      // de ce dépôt ne dit.
      "Arrêté 1993-11-04 art. 4",
      // Art. 8 : les mesures dues aux travailleurs dont les capacités
      // auditives ou visuelles sont limitées. Deux branches, deux blocages
      // distincts : la première suppose une donnée de santé que `docs/rgpd.md`
      // interdit de détenir, la seconde suppose de savoir quels postes portent
      // des EPI — cinquième déclencheur de l'ADR-022, non implémenté.
      "Arrêté 1993-11-04 art. 8",
      // Art. 13 : le marquage des voies de circulation. LE SEUL DES QUATRE QUE
      // LEVERAIT UNE LECTURE, et non un modèle qui manque : l'obligation ne
      // naît que « lorsqu'en application des articles R. 4214-11 ou R. 4224-3
      // les voies de circulation doivent être clairement identifiées », et
      // aucun de ces deux articles n'est dépouillé. Sa condition d'entrée
      // serait devinée.
      "Arrêté 1993-11-04 art. 13",
      // Annexe III : le dispositif lumineux utilisable en cas de danger grave,
      // « spécialement surveillé ou muni d'une ampoule auxiliaire ». Le
      // déclenchement suppose de qualifier un « danger grave », qualification
      // qu'aucun attribut ne donne, et l'alternative laissée à l'exploitant se
      // solderait de deux façons dont l'une n'est pas une preuve datable.
      "Arrêté 1993-11-04 annexe III",
      // ── Lot « disconnecteurs », 2026-09-02 : la protection du réseau d'eau
      // potable contre les retours d'eau. Bloc contigu et en fin de liste,
      // pour la raison écrite par le lot D1 — il se retirera d'un coup le jour
      // où cette énumération disparaîtra.
      //
      // Quatre entrées, et AUCUNE ne vient de l'article que le brief
      // désignait. `R. 1321-57` CSP, sur lequel un guide professionnel fonde
      // un « contrôle annuel des disconnecteurs », ne porte pas de périodicité
      // et s'adresse aux propriétaires des installations : il est consigné
      // `sans_objet`, ce qui est le vrai produit de ce dépouillement.
      //
      // R. 1321-60 : entretien des réservoirs et bâches de stockage du réseau
      // intérieur, « au moins une fois par an ». La seule périodicité annuelle
      // du Code qui porte sur le réseau intérieur, en vigueur depuis 2007 et
      // sans clause de date — donc opposable aux bâtiments existants, à la
      // différence des trois suivantes. Bloquée par l'absence de catégorie
      // d'équipement.
      "R. 1321-60",
      // Les trois entrées de l'arrêté du 10 septembre 2021, pris pour
      // l'application de R. 1321-61. Elles partagent DEUX blocages, et le
      // second est le plus inhabituel du référentiel : l'article 2 de l'arrêté
      // réserve tout le texte aux réseaux « mis en place ou rénovés totalement
      // à compter du 1er janvier 2023 », une date que le produit ne connaît
      // pas. Le premier est le destinataire — l'article 1er III ne fait de
      // l'exploitant un « propriétaire des réseaux intérieurs » que s'il est
      // responsable d'établissement ou si la responsabilité lui a été
      // contractuellement déléguée.
      //
      // Art. 9 : vérification, « a minima à fréquence annuelle ».
      "Arrêté 10-09-2021 art. 9",
      // Art. 10 : entretien, « a minima à une fréquence annuelle », et le seul
      // texte du dossier qui écrive le mot « disconnecteur ». Deux articles et
      // non un, parce que l'entretien exige un opérateur qualifié au sens de
      // la loi du 5 juillet 1996 quand la vérification n'exige rien de tel :
      // les fondre ferait disparaître la seule exigence opposable à un
      // prestataire.
      "Arrêté 10-09-2021 art. 10",
      // Art. 12 : fichier sanitaire des réseaux intérieurs — état permanent au
      // sens de l'ADR-026. À ne pas confondre avec le carnet sanitaire du
      // produit, qui suit des températures d'ECS et des analyses de
      // légionelles ; celui-ci est un plan des réseaux et un journal
      // d'interventions sur les dispositifs anti-retour.
      "Arrêté 10-09-2021 art. 12",
      // ── Lot « socle DUERP », 2026-09-02 : le texte fondateur du produit.
      // Bloc contigu en fin de liste, pour la raison écrite par le lot D1 — le
      // lot B supprime cette énumération, un bloc d'un seul tenant se retire
      // d'un coup.
      //
      // Quatre entrées pour onze articles lus, en deux corpus INTÉGRAUX (six
      // articles du chapitre législatif, cinq de la section réglementaire).
      // Aucune n'est un défaut d'encodage : ce sont quatre obligations réelles
      // trouvées dans le texte que le produit cite le plus et que le corpus
      // n'avait jamais ouvert — un seul de ses articles y figurait, entré par
      // la porte de l'affichage obligatoire.
      //
      // L. 4121-3 : « Cette évaluation des risques tient compte de l'impact
      // différencié de l'exposition au risque en fonction du sexe », phrase
      // insérée par la loi n° 2021-1018 et en vigueur depuis le 2022-03-31.
      // ZÉRO occurrence dans le dépôt, balayage de `src/` et `docs/` le
      // 2026-09-02. Le blocage n'est pas le modèle d'obligations — un état
      // permanent d'établissement conviendrait — mais le fait que le texte
      // exige que l'ÉVALUATION en tienne compte : une case à cocher y
      // répondrait en apparence et pas en fait.
      "L. 4121-3",
      // L. 4121-3-1 : deux manques, et le premier vaut pour toute la cible. Le
      // VI fait transmettre le document unique au service de prévention et de
      // santé au travail À CHAQUE MISE À JOUR, sans seuil d'effectif — porté
      // par rien. Événementiel, donc même blocage que R. 4141-8 et R. 4141-12,
      // à ceci près que l'événement déclencheur est ici un acte de l'outil
      // lui-même (la validation d'une version). Le III 1° ajoute, à cinquante
      // salariés pile — DANS la cible de l'ADR-031 —, un programme annuel de
      // prévention avec coût, indicateurs de résultat, ressources et
      // calendrier, que le modèle `Action` ne sait pas porter.
      "L. 4121-3-1",
      // R. 4121-1-1 : l'annexe du document unique — données collectives
      // d'exposition et PROPORTION de salariés exposés aux facteurs de
      // L. 4161-1 au-delà des seuils. Le PDF imprime déjà une page à ce numéro
      // qui rend autre chose : un effectif brut par risque du référentiel
      // sectoriel, pas une proportion par facteur légal. Deux blocages : le
      // modèle `Risque` ne rattache aucun risque à un facteur de L. 4161-1, et
      // le renvoi « aux seuils prévus au même article » pointe un article qui
      // n'en fixe plus depuis 2017 — où ils vivent aujourd'hui n'a pas été
      // établi, et encoder sans le savoir fabriquerait une exigence chiffrée
      // sur un renvoi en l'air.
      "R. 4121-1-1",
      // R. 4121-2 : l'article le plus exposé du lot, et celui dont la lecture
      // était la plus attendue — il s'affiche sur l'écran de synthèse AVEC un
      // seuil d'effectif. Le seuil est JUSTE (« Au moins chaque année dans les
      // entreprises d'au moins onze salariés »), et il est attribué au bon
      // article. Ce qui manque est le reste : les 2° et 3° — décision
      // d'aménagement important, information supplémentaire — s'appliquent
      // SANS condition d'effectif, et sont donc les seules règles de mise à
      // jour pour la part de la cible en dessous de onze salariés, à qui le
      // dossier ne dit rien. Événementiels tous les deux.
      "R. 4121-2",
      // ── Lot « plan de prévention », 2026-09-02 : le chapitre II du titre Ier
      // du livre V, seize articles sur seize. Bloc contigu en fin de liste,
      // pour la raison écrite par le lot D1 — il se retirera d'un coup le jour
      // où cette énumération disparaîtra.
      //
      // CES QUATRE ENTRÉES NE SONT PAS QUATRE OBLIGATIONS ABSENTES DU
      // RÉFÉRENTIEL AU SENS ORDINAIRE, et c'est la particularité du lot. Le
      // plan de prévention n'est pas dans le référentiel d'obligations : il est
      // porté par le module `PlanPrevention`, décision inscrite au domaine
      // `co_activite` de `conformite/types.ts`. Douze des seize articles sont
      // donc `sans_objet` — le module les sert, ou ils s'adressent au chef de
      // l'entreprise extérieure. Les quatre qui suivent sont ceux que NI le
      // module NI le référentiel ne portent, et les compter tous les seize
      // aurait fait passer une décision de produit prise une fois pour seize
      // manques.
      //
      // ELLES ÉTAIENT CINQ JUSQU'AU 2026-09-07. `R. 4512-8` — le contenu
      // minimal du plan — en est sorti le jour où le module a ouvert ses cinq
      // rubriques : phases d'activité dangereuses appariées à leurs moyens,
      // adaptation des matériels, instructions aux travailleurs, organisation
      // des premiers secours, participation croisée et commandement. C'était le
      // manque le plus opposable du lot, parce que Rojer ÉMET le document.
      //
      // R. 4512-1 : le recours à de nouveaux sous-traitants après le début de
      // l'intervention rend toute la procédure applicable à nouveau. Le modèle
      // ne connaît qu'UNE entreprise extérieure par plan, et rien à l'écran ne
      // laisse deviner qu'une question se pose. Événementiel ET structurel.
      "R. 4512-1",
      // R. 4512-9 : la liste des postes relevant du suivi individuel renforcé,
      // que le texte fait FIGURER dans le plan. Aucun champ, et le blocage est
      // celui qu'a déjà rencontré R. 4624-28-2 — le produit ne rattache aucun
      // poste à un suivi renforcé.
      "R. 4512-9",
      // R. 4512-11 : les dossiers techniques amiante joints au plan. Une pièce
      // que l'entreprise utilisatrice DÉTIENT, et dont le produit n'a aucune
      // notion. Touche la cible : un local d'avant le 1er juillet 1997 a un
      // DTA, et le plombier dans les faux plafonds est le cas visé.
      "R. 4512-11",
      // R. 4512-12 : la seule DÉMARCHE du chapitre qui sorte de l'entreprise —
      // informer par écrit l'inspection du travail de l'ouverture des travaux.
      // Deux surfaces affichent la pastille « R. 4512-6 à R. 4512-12 » sans en
      // dire un mot ; un dirigeant qui les lit conclut qu'il a fini quand il a
      // signé.
      "R. 4512-12",
      // ── Lot « vigilance prestataires », 2026-09-02 : le chapitre II du
      // titre II de la HUITIÈME partie, aux deux étages du Code — sept
      // articles législatifs sur sept, huit réglementaires sur huit, plus les
      // deux définitions du travail dissimulé auxquelles L. 8222-1 renvoie.
      // Bloc contigu en fin de liste, pour la raison écrite par le lot D1 —
      // il se retirera d'un coup le jour où cette énumération disparaîtra.
      //
      // QUATRE ENTRÉES POUR DIX-NEUF ARTICLES LUS, et aucune n'est un défaut
      // d'encodage. La vigilance est SERVIE par le produit — module
      // Prestataires, annuaire, alertes d'expiration — mais hors du
      // référentiel d'obligations : aucune `ReferenceLegale` ne cite
      // L. 8222-1. C'est la même configuration que le plan de prévention
      // ci-dessus, à une différence près qui n'est pas tranchée : là, la
      // décision est inscrite au domaine `co_activite` ; ici, le périmètre
      // même est en question — ce chapitre est du droit du travail NON
      // santé-sécurité, et CLAUDE.md écarte le RH non-SST.
      //
      // L. 8222-1 : l'obligation de vérifier son cocontractant à la conclusion
      // et périodiquement. Trois blocages cumulés — pas de porteur pour une
      // RELATION contractuelle (l'ADR-022 en connaît trois : établissement,
      // salarié, équipement), pas de contrat dans le modèle (ni montant ni
      // date de conclusion, les deux données dont R. 8222-1 et D. 8222-5 font
      // dépendre l'assujettissement et son point de départ), et le périmètre.
      "L. 8222-1",
      // L. 8222-5 : l'injonction due AUSSITÔT après signalement écrit d'un
      // agent de contrôle, d'un syndicat ou d'une IRP, par lettre recommandée
      // avec avis de réception (R. 8222-2). Distincte de la vérification
      // périodique : elle vaut même quand toutes les vérifications ont été
      // faites, et s'étend au sous-traitant et au subdélégataire, que
      // l'annuaire ne connaît pas. Aucune surface ne la mentionne. Bloquée par
      // le déclencheur événementiel, absent du modèle — même blocage que
      // R. 4141-8, R. 4141-12 et L. 4121-3-1 VI.
      "L. 8222-5",
      // D. 8222-5 : l'article central du module, et celui dont la lecture était
      // la plus attendue. LE RYTHME EST JUSTE — « tous les six mois », et
      // MOIS_RENOUVELLEMENT_URSSAF vaut 6 —, L'ANCRAGE NE L'EST PAS : le
      // module compte le semestre depuis `prestataire.updatedAt`, le texte
      // depuis la conclusion puis chaque remise. La déduction ne vaut que dans
      // le sens qui alerte TARD, et toute retouche de la fiche repousse la
      // limite de six mois. S'y ajoutent trois exigences que rien ne sert :
      // l'attestation « datant de moins de six mois » (le produit ne stocke
      // aucune date d'émission), la vérification d'authenticité auprès de
      // l'URSSAF, et le fait que le 2° offre QUATRE pièces au choix là où le
      // produit n'a qu'un champ Kbis.
      "D. 8222-5",
      // D. 8222-7 : le même rythme et le même point de départ pour un
      // cocontractant établi à l'étranger, mais une liste de pièces
      // entièrement différente — identification TVA au sens de l'article
      // 286 ter du CGI, attestation de régularité sociale au regard du
      // règlement (CE) n° 883/2004, inscription au registre professionnel du
      // pays. `prestataireSchema` est fermé sur trois documents nommés et
      // exige un SIRET à quatorze chiffres. Le manque n'est pas seulement une
      // absence : l'écran affiche à la place la liste française.
      "D. 8222-7",
      // ── Lot « les sept épars », 2026-09-02 : les citations d'écran qu'aucun
      // regroupement ne rassemblait. Bloc contigu et en fin de liste, pour la
      // raison écrite par le lot D1 — il se retirera d'un coup le jour où
      // cette énumération disparaîtra.
      //
      // Neuf entrées pour vingt-trois articles lus, en trois corpus dont deux
      // INTÉGRAUX. Aucune n'est un défaut d'encodage : ce sont trois sections
      // du Code que le référentiel n'avait jamais ouvertes, et sur lesquelles
      // il affichait pourtant des numéros au dirigeant.
      //
      // R. 4223-4 : le tableau des niveaux d'éclairement en lux, imprimé dans
      // le PDF du DUERP comme « texte de référence » alors que c'est une
      // obligation de résultat due par tout employeur. Il n'a ni périodicité,
      // ni pièce, ni acte — aucun texte n'impose de mesurer l'éclairement à
      // intervalle, à la différence du bruit. La voie qui l'ouvrirait est le
      // DUERP, pas le calendrier de conformité.
      "R. 4223-4",
      // R. 4223-11 A QUITTÉ CETTE LISTE LE 2026-09-04, et il n'y aura été que
      // deux jours. Il y était entré le 2026-09-02 avec cette phrase : « c'est
      // la seule entrée de ce lot que rien ne bloque techniquement ». Elle
      // était juste, comme celle de GH 61 avant elle et celle de R. 4323-24 le
      // même jour. Le document consignant les règles d'entretien du matériel
      // d'éclairage est porté par `eclairage-etablissement-regles-entretien`,
      // qui a demandé un domaine neuf — `eclairage` — parce que le référentiel
      // n'en avait aucun pour l'éclairage ORDINAIRE, celui de l'éclairage de
      // SÉCURITÉ vivant sous `incendie`. La réserve du CSE est tranchée dans le
      // sens littéral : l'article fait deux phrases, seule la seconde suppose
      // l'instance, et aucun `effectifMin` n'est posé.
      //
      // Son jumeau `R. 4222-21` reste, lui, plus bas dans cette liste : des deux
      // documents que R. 4224-17 agrège nommément, le référentiel en porte
      // désormais un. La réserve de R. 4224-17 est corrigée du même mouvement —
      // elle recopiait le renvoi entier et n'en tirait qu'un seul document.
      // R. 4433-2 : « En cas de mesurage, celui-ci est renouvelé au moins tous
      // les cinq ans » — la seule périodicité chiffrée des deux titres bruit
      // et vibrations, et le produit détient DÉJÀ la date qui la calculerait
      // (`Risque.dateMesuresPhysiques`, saisie à la cotation et réimprimée au
      // PDF), rattachée à aucune exigence. Bloquée par sa condition d'entrée :
      // l'obligation ne naît qu'« en cas de mesurage », lequel dépend des
      // seuils de R. 4431-2 que le produit ne détient pas. La faire naître de
      // la seule saisie d'une date ne l'exigerait que de celui qui a déjà
      // mesuré — le faux négatif d'ancrage corrigé sur R. 4227-34 le
      // 2026-08-31, refait en connaissance de cause.
      "R. 4433-2",
      // R. 4434-9 : « L'employeur vérifie l'efficacité des mesures prises en
      // application du présent chapitre. » Classée ici et NON `non_couvert`,
      // bien que le domaine du bruit ne soit pas servi : `non_couvert` dit
      // « on a choisi de ne pas le porter, et on le dit à l'utilisateur », et
      // aucune des deux moitiés n'est vraie — l'inventaire de la partie IV
      // range le titre III comme « jamais ouvert », et aucune surface ne
      // l'annonce. Les manques `non_couvert` du référentiel visent des
      // établissements que le produit NE SERT PAS ; celui-ci vise un
      // restaurant avec musique et lave-vaisselle.
      "R. 4434-9",
      // Les cinq de la section 4 « Emploi et stockage de matières explosives
      // et inflammables », corpus INTÉGRAL. Elles partagent une cause et une
      // seule : la section n'avait jamais été ouverte, alors qu'un attribut du
      // modèle porte le numéro de son premier article dans son nom.
      //
      // R. 4227-22 : aucune source d'ignition, et une ventilation permanente
      // appropriée. Le voisin qui semble la couvrir ne la couvre pas —
      // `stockage-dangereux-ventilation-locaux` se fonde sur R. 4222-20 et se
      // déclenche sur la catégorie STOCKAGE_MATIERE_DANGEREUSE, quand
      // R. 4227-22 oblige sans condition d'équipement.
      "R. 4227-22",
      // R. 4227-23 : la signalisation de l'interdiction de fumer aux
      // emplacements À L'AIR LIBRE. Le domaine `signalisation`, encodé le même
      // jour, ne la porte pas : son champ est l'arrêté du 4 novembre 1993.
      // Bloquée par un attribut — rien ne dit qu'un établissement manipule ces
      // matières DEHORS. Son renvoi à « L. 3511-7 du code de la santé
      // publique » est mort depuis le 19 mai 2016 (recodifié L. 3512-8).
      "R. 4227-23",
      // R. 4227-24 : dix mètres d'une issue, portes vers l'extérieur, grilles
      // ouvrables de l'intérieur. L'article le plus LARGE de la section — il
      // ajoute au champ de R. 4227-22 les substances « facilement
      // inflammables », un cran en dessous —, donc le seul que l'attribut du
      // modèle ne peut pas déclencher sans sous-appliquer.
      "R. 4227-24",
      // R. 4227-25 : ne pas déposer ni laisser séjourner ces matières dans les
      // escaliers, passages et couloirs. Obligation de NE PAS FAIRE : une case
      // à cocher à vie y répondrait en apparence, le manquement naissant d'un
      // carton posé un mardi et retiré le jeudi.
      "R. 4227-25",
      // R. 4227-26 : les chiffons et papiers imprégnés de liquides
      // inflammables OU DE MATIÈRES GRASSES, enfermés après usage dans des
      // récipients métalliques clos et étanches. L'article de la section qui
      // touche le plus directement la cible, et il n'a aucun rapport avec les
      // matières explosives : un torchon huileux de cuisine en relève. Son
      // champ est autonome — il ne dépend pas de R. 4227-22 —, donc son
      // déclenchement suppose le cinquième déclencheur de l'ADR-022,
      // « activité réellement exercée », non implémenté.
      "R. 4227-26",
      // R. 4323-105 A QUITTÉ CETTE LISTE LE 2026-09-04, l'après-midi du jour
      // où elle l'avait rejointe. Le matin, son `bloquePar` disait « rien de
      // technique » — et c'était vrai : la consigne d'utilisation se porte par
      // ÉTABLISSEMENT, la scission de la catégorie `EPI` n'était donc pas un
      // préalable. Il ne manquait que l'encodage, fait dans la foulée
      // (`epi-etablissement-consigne-utilisation`). L'article garde une
      // réserve, comptée à part : la « documentation relative à la
      // réglementation applicable » tenue à disposition du CSE est une étagère
      // documentaire, pas un acte daté, et le produit n'a jamais tranché s'il
      // porte ce genre de pièce.
      // R. 4323-106 : formation au port de l'équipement, avec entraînement « en
      // tant que de besoin ». Nominative, donc porteur salarié — qui existe. Ce
      // qui n'existe pas, c'est la périodicité : « renouvelée aussi souvent que
      // nécessaire pour que l'équipement soit utilisé conformément à la consigne
      // d'utilisation » indexe le renouvellement sur un RÉSULTAT, pas sur une
      // durée. Lui donner trois ans par analogie avec une formation voisine
      // fabriquerait une échéance que personne ne peut opposer — c'est le même
      // refus que pour R. 4323-69, où les « cinq ans » venaient d'une
      // recommandation CNAM et non d'un texte.
      "R. 4323-106",
      // Arrêté du 19 mars 1993 (EPI) art. 1er : LA VÉRIFICATION GÉNÉRALE
      // PÉRIODIQUE À DOUZE MOIS, pour cinq familles nommées et pour elles
      // seules. Une seule touche les secteurs cibles — « systèmes de protection
      // individuelle contre les chutes de hauteur », c'est-à-dire le harnais.
      //
      // Bloquée par une décision de MODÈLE, la seule de cette liste à l'être :
      // `CategorieEquipement.EPI` est une famille et non un régime, et son
      // libellé de formulaire le dit — « harnais antichute et sa longe, casque,
      // gants, chaussures de sécurité, protections auditives, masque ». Y
      // attacher cette obligation réclamerait une vérification annuelle par
      // personne qualifiée à qui a déclaré une boîte de gants : le défaut exact
      // que le nom de `COMPACTEUR_PRESSE_DECHETS_MOTORISE` a été écrit pour
      // éviter. La ligne de partage se lit dans l'arrêté, verbatim, et elle
      // passe entre des NOMS D'OBJETS — pas entre des propriétés d'équipement,
      // que le texte ne nomme nulle part.
      // « Arrêté 1993-03-19 (EPI) art. 1er » A QUITTÉ CETTE LISTE LE MÊME
      // JOUR, et c'est le lot entier qui se résume là : lu le matin, il
      // déclarait un manque que la catégorie `EPI` empêchait d'encoder — elle
      // mélangeait le harnais qui se vérifie et les gants qui ne se vérifient
      // pas. Trois catégories ouvertes l'après-midi, et
      // `epi-verification-generale-periodique` porte les douze mois.
    ]);
  });

  it("chaque obligation manquante dit ce qui empêche de l'encoder ou pourquoi elle manque", () => {
    for (const o of obligationsManquantes()) {
      expect(o.motif.length, o.ref).toBeGreaterThan(80);
    }
  });
});

describe("corpus — ce qu'on ne couvre pas, et où on le dit", () => {
  // Le principe : couvrir le maximum de ce qui est possible, et sinon le dire
  // clairement. Ces tests portent la seconde moitié — celle qu'on oublie.

  it("chaque manque de couverture dit ce qu'il laisse de côté", () => {
    for (const a of articlesNonCouverts()) {
      // Un motif court est une case cochée. Le lecteur doit pouvoir juger de
      // ce qu'il perd sans rouvrir le texte.
      expect(a.motif.length, `${a.corpus} / ${a.ref}`).toBeGreaterThan(120);
    }
  });

  it("un manque de couverture n'est jamais rangé parmi les exclusions", () => {
    // Une exclusion dit « aucune obligation n'en découle ». Y ranger un choix
    // de couverture fait disparaître une dette du décompte : elle cesse d'être
    // un manque pour devenir une non-question. C'est la faute que ce statut
    // sépare.
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.statut !== "hors_perimetre") continue;
        expect(
          [
            "construction",
            "sans_destinataire_exploitant",
            "categorie_erp",
            "risque_specialise",
          ],
          `${c.id} / ${a.ref}`,
        ).toContain(a.exclusion);
      }
    }
  });

  it("le nombre de manques non déclarés à l'utilisateur ne remonte pas", () => {
    // 27 au 2026-08-28, et le chiffre REMONTE de 0 à 27 ce jour-là. La cause
    // doit se lire ici, sinon le prochain lecteur conclura à une régression du
    // référentiel : il n'y en a pas eu. Ces vingt-cinq articles ont été
    // annoncés à l'écran, sur le tableau de bord de chaque établissement,
    // pendant une journée ; **une décision produit a retiré cette surface** —
    // déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce
    // qu'il couvre, et cette question ne l'est pas. Ils sont donc de nouveau
    // annoncés à personne.
    //
    // Le laisser à 0 aurait fait affirmer à ce test que vingt-sept manques
    // sont déclarés à quelqu'un. C'est faux, et un cliquet qui ment est pire
    // que pas de cliquet. Le maintenir à 0 « parce qu'un cliquet ne remonte
    // pas » aurait été la rustine exacte que le dépôt interdit : desserrer un
    // chiffre plutôt que de nommer la cause.
    //
    // Le faire redescendre suppose de **couvrir** ces obligations, ou de leur
    // rendre une adresse **visible par l'exploitant**. Pas de trouver un autre
    // document interne où les ranger : `docs/couverture-declaree-du-produit.md`
    // n'en est pas une, et il le dit lui-même.
    //
    // 27 et non 25, parce que le prédicat compte désormais les notes internes.
    // Les deux `declareA` qui citaient déjà `docs/veille-arbitrage-2026-08-26.md`
    // passaient le cliquet pour la mauvaise raison : un document de travail
    // n'annonce rien à un exploitant, et le chiffre les tenait pourtant pour
    // déclarés. Le compte n'a donc pas augmenté de deux — c'est la mesure qui
    // a cessé de se tromper de deux.
    //
    // ⚠ **Le cliquet est saturé, et c'est nouveau.** 27 muets sur 27 articles
    // `non_couvert` : le plafond touche le total. Vérifié par mutation le
    // 2026-08-28 — retirer le `declareA` d'un article ne le fait plus bouger,
    // puisque cet article était déjà compté. Ce qu'il garde encore, vérifié de
    // la même façon : un 28ᵉ article `non_couvert` ajouté sans adresse le fait
    // passer à 28 et le test tombe.
    //
    // Autrement dit il protège encore contre l'ARRIVÉE d'un manque muet, plus
    // contre la PERTE d'une adresse existante. C'est une conséquence
    // mécanique du retour à 27, pas un affaiblissement délibéré — mais il ne
    // faut pas lui prêter la garantie qu'il n'a plus.
    //
    // ⚠ Deux autres angles morts connus, qui relèvent du lot 3 :
    // il cherche la chaîne littérale « Non déclaré », définie nulle part — et
    // cette branche est aujourd'hui morte, plus aucun article ne la déclenche ;
    // et il vérifie qu'un `declareA` est PRÉSENT, jamais que l'adresse citée
    // existe. Un meilleur invariant serait « tout article `non_couvert` a une
    // adresse, et cette adresse mène quelque part ».
    // ⚠ **28 depuis le 2026-09-01**, et la cause n'est aucune des deux
    // précédentes. Le lot D1 a dépouillé le travail en hauteur — un domaine
    // qui n'avait jusque-là aucune entrée de corpus ni aucune citation — et y
    // a trouvé un 28ᵉ manque réel : `R. 4323-63`, l'interdiction d'utiliser
    // une échelle ou un escabeau comme poste de travail.
    //
    // Le cliquet a fait EXACTEMENT ce que le paragraphe ci-dessus annonçait
    // qu'il ferait, mot pour mot : « un 28ᵉ article `non_couvert` ajouté sans
    // adresse le fait passer à 28 et le test tombe ». Il n'a pas été desserré
    // pour faire passer autre chose — il a été relevé d'un cran parce que la
    // dette a réellement grandi d'un, et le nombre reste vrai.
    //
    // CE QUI SERAIT UNE RUSTINE ET NE L'EST PAS : reclasser `R. 4323-63` en
    // `sans_objet` aurait gardé le plafond à 27 sans rien corriger, en niant
    // une obligation qui existe. Lui donner un `declareA` pointant vers
    // `docs/` ne l'aurait pas fait descendre non plus, le prédicat comptant
    // déjà les notes internes comme muettes — c'est précisément pour empêcher
    // ce geste-là qu'il les compte.
    //
    // ⚠ ET IL N'EST PLUS DE MÊME NATURE QUE LES 27 AUTRES. Ceux-là visent des
    // établissements que le produit ne sert pas ; le rattachement
    // `Etablissement.typeErp` réclamé par `docs/couverture-declaree-du-produit.md`
    // les ferait disparaître de l'écran d'un restaurant. Celui-ci concerne un
    // restaurant sur deux, et aucun rattachement par type d'ERP ne le rendra
    // silencieux : il n'y a pas de type à qui ne pas le montrer. Le faire
    // redescendre à 27 suppose donc de le COUVRIR, par le DUERP et non par le
    // calendrier de conformité.
    // ⚠ **19 DEPUIS LE 2026-09-01, ET LE CLIQUET DESCEND POUR LA PREMIÈRE
    // FOIS.** Neuf articles sortent du décompte — PE 28 à PE 36, le chapitre
    // III du Livre III. Ils y étaient pour UN motif, écrit dans chacun d'eux :
    // « l'attribut « locaux à sommeil » n'existe pas en base ». Il existe
    // (`Etablissement.comporteLocauxSommeilPublic`), et le chapitre a été relu
    // à la source avant d'être reclassé : deux articles sont COUVERTS (PE 33
    // § 2, la consigne affichée dans chaque chambre ; PE 35, les trois plans),
    // quatre passent `hors_perimetre` / `construction` (PE 28 à PE 31), trois
    // `sans_objet` comme PE 24 et PE 26 avant eux (PE 32, PE 34, PE 36).
    //
    // CE QUI SERAIT UNE RUSTINE ET NE L'EST PAS. Le paragraphe ci-dessus dit
    // que le chiffre « redescendra par les deux mêmes voies : couvrir, ou
    // donner une adresse visible ». C'est la PREMIÈRE qui a joué — et elle a
    // joué deux fois, sous deux formes : couvrir ce qui était dû, et établir
    // que le reste n'était pas dû. Reclasser sans relire aurait été la
    // rustine : garder le plafond bas en niant des obligations qui existent.
    // Le motif de chacun des sept est écrit dans le corpus, et ce qui reste
    // non porté y est nommé aussi (l'exception de PE 32, le renvoi à MS 41).
    //
    // Le cliquet reste saturé : 19 muets sur 19 articles `non_couvert`. Il
    // protège donc toujours contre l'ARRIVÉE d'un manque muet — un 20ᵉ le
    // ferait tomber — et toujours pas contre la PERTE d'une adresse existante,
    // pour la raison expliquée plus haut.
    const MUETS = 19;
    // Une note interne n'est pas une annonce à l'exploitant. `declareA`
    // mélange aujourd'hui les deux natures — une adresse produit et un
    // document de travail — et cette distinction reste à trancher (lot 3) ;
    // en attendant, un manque rangé dans `docs/` est compté comme muet, parce
    // que c'est ce qu'il est du point de vue du dirigeant.
    const muets = articlesNonCouverts().filter(
      (a) =>
        !a.declareA ||
        a.declareA.startsWith("Non déclaré") ||
        a.declareA.startsWith("docs/"),
    );
    expect(
      muets.length,
      `${muets.length} manque(s) de couverture qu'aucun écran n'annonce (plafond ${MUETS}). ` +
        `Couvrir, ou déclarer — puis abaisser MUETS.`,
    ).toBeLessThanOrEqual(MUETS);
  });
});
