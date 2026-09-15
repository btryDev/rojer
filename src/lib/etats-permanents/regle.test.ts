import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { MOTIF_DEPOT, SURFACES_DE_DEPOT } from "@/lib/rgpd/surfaces-depot";
import {
  obligationsConformite,
  porteurDe,
  type Obligation,
} from "@/lib/referentiels/conformite";
import {
  determineObligationsApplicables,
  projeterEtablissement,
  type EtablissementMatching,
} from "@/lib/matching";
import {
  estDeclencheeParUnFait,
  estEtatADeclarer,
  estFaitADater,
  estSansRendezVous,
  modeDeclaration,
} from "./regle";

/**
 * Le point de ce lot n'est pas qu'un test passe : c'est qu'une obligation sans
 * date **devienne visible**. Un test vert ne le montre pas tout seul, donc
 * chacun de ceux-ci est écrit pour tomber si la surface disparaît, et chacun a
 * été éprouvé en réinjectant le défaut qu'il prétend interdire.
 */

const bureau = (effectif: number): EtablissementMatching => ({
  id: "etab-test",
  effectifSurSite: effectif,
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
});

describe("le critère de l'écran", () => {
  it("n'est pas « pas de périodicité » — les deux ensembles diffèrent", () => {
    // C'est l'erreur que la première rédaction du brief avait faite, et elle
    // dimensionnait l'écran à quarante-trois lignes. `periodicite: "autre"`
    // rassemble quatre natures ; une case « déclaré en place » ment aux trois
    // qui ne sont pas des états.
    const sansPeriodicite = obligationsConformite.filter(
      (o) => o.periodicite === "autre",
    );
    const etatsPermanents = obligationsConformite.filter(
      (o) => o.nature === "etat_permanent",
    );

    expect(
      sansPeriodicite.length,
      "si ce compte change, le critère n'a pas bougé pour autant",
    ).toBeGreaterThan(etatsPermanents.length);

    const naturesSansPeriodicite = new Set(sansPeriodicite.map((o) => o.nature));
    expect(
      [...naturesSansPeriodicite].sort(),
      "`periodicite: autre` mélange plusieurs natures : c'est pourquoi il ne peut pas servir de critère",
    ).not.toEqual(["etat_permanent"]);
  });

  it("écarte l'état permanent qui produit quand même une ligne de calendrier", () => {
    // `porte-auto-portail-piete-coulissant` est un état permanent porté par un
    // équipement, en `mise_en_service_uniquement` — que le générateur DATE au
    // lieu de la sauter. Le retenir lui donnerait deux surfaces : une ligne au
    // calendrier et une case ici. C'est le défaut que la journée du 2026-08-31
    // a passé à retirer sur deux widgets jumeaux.
    const piegees = obligationsConformite.filter(
      (o) => o.nature === "etat_permanent" && !estSansRendezVous(o.periodicite),
    );
    expect(
      piegees.length,
      "au moins un état permanent produit une ligne de calendrier — le test perd son objet s'il n'y en a plus",
    ).toBeGreaterThan(0);

    for (const o of piegees) {
      expect(estEtatADeclarer(o), o.id).toBe(false);
      expect(modeDeclaration(o), o.id).toBeNull();
    }
  });

  it("suit la périodicité EFFECTIVE, pas celle du référentiel", () => {
    // Une prescription particulière (ADR-035) peut donner un rythme à une
    // obligation qui n'en avait pas : ce jour-là elle quitte l'écran pour le
    // calendrier. Prendre `o.periodicite` au lieu de l'effective l'afficherait
    // aux deux endroits.
    const etat = obligationsConformite.find(
      (o) => o.nature === "etat_permanent" && o.periodicite === "autre",
    );
    expect(etat).toBeDefined();
    if (!etat) return;

    expect(estEtatADeclarer(etat, "autre")).toBe(true);
    expect(estEtatADeclarer(etat, "annuelle")).toBe(false);
  });
});

describe("la frontière avec le calendrier", () => {
  /**
   * **La garantie centrale de ce lot.** Une obligation applicable est soit au
   * calendrier, soit sur cet écran, jamais aux deux — et le partage se lit sur
   * la même fonction des deux côtés (`estSansRendezVous`, appelée par
   * `generateur.ts`).
   *
   * Éprouvée en réinjectant le défaut : en remplaçant `modeDeclaration` par un
   * prédicat qui ne lit que `nature`, ce test tombe sur
   * `porte-auto-portail-piete-coulissant`.
   */
  it("aucune obligation ne peut être à la fois au calendrier et sur l'écran", () => {
    const doubles: string[] = [];
    for (const o of obligationsConformite) {
      const surEcran = modeDeclaration(o) !== null;
      const auCalendrier = !estSansRendezVous(o.periodicite);
      if (surEcran && auCalendrier) doubles.push(o.id);
    }
    expect(
      doubles,
      "ces obligations auraient deux surfaces, et deux états qui divergeraient",
    ).toEqual([]);
  });

  it("tout ce que le calendrier ne prend pas est nommé quelque part", () => {
    // Le complémentaire du test précédent : ce que le générateur saute doit
    // avoir une raison écrite d'être ou ne pas être sur l'écran. Une obligation
    // sans rendez-vous et sans mode serait exactement l'angle mort que ce lot
    // existe pour fermer — sauf pour les deux natures dont le brief établit
    // qu'une déclaration leur mentirait.
    const orphelines: string[] = [];
    for (const o of obligationsConformite) {
      if (!estSansRendezVous(o.periodicite)) continue;
      if (modeDeclaration(o) !== null) continue;
      if (porteurDe(o) === "salarie") continue; // surface propre : écran Équipe
      if (o.nature === "evenementielle" || o.nature === "ponctuelle") continue;
      orphelines.push(`${o.id} (${o.nature})`);
    }

    // La liste est VIDE, et elle ne l'a pas toujours été. Elle portait
    // `incendie-erp-5-visite-commission` — invisible sur cet écran à dessein,
    // l'administration la déclenchant. La relecture de PE 37 du 2026-08-31 au
    // soir lui a donné sa quinquennale : elle a un rendez-vous, elle passe au
    // calendrier, et elle sort de ce complémentaire par la porte d'à côté.
    //
    // L'exception reste déclarée dans `EXCLUES_DU_FAIT_DATE` et n'est plus
    // atteinte par le référentiel livré — c'est un garde-fou dormant, gardé
    // exprès : une périodicité peut se retirer comme elle s'est posée, et le
    // jour où elle le serait, l'obligation retomberait ici sans que personne
    // ait à s'en souvenir. Le test du second verbe l'éprouve sur un cas
    // fabriqué, pour ne pas passer au vert pour la mauvaise raison.
    expect(
      orphelines,
      "sans rendez-vous, sans mode de déclaration, sans autre surface : invisible",
    ).toEqual([]);
  });
});

describe("le second verbe", () => {
  it("ne prend que les échéances récurrentes sans rythme écrit", () => {
    for (const o of obligationsConformite) {
      if (!estFaitADater(o)) continue;
      expect(o.nature, o.id).toBe("echeance_recurrente");
      expect(o.periodicite, o.id).toBe("autre");
    }
  });

  it("écarte la visite que l'administration déclenche", () => {
    // « En place » lui ment — elle reviendra ; « fait le » aussi — ce n'est pas
    // l'employeur qui la fait. Le registre de sécurité trace déjà la visite
    // quand elle a eu lieu.
    //
    // ⚠ CE TEST A FAILLI PASSER AU VERT POUR LA MAUVAISE RAISON. Depuis que
    // PE 37 a donné sa quinquennale à cette obligation (2026-08-31, soir), elle
    // n'est plus « sans rendez-vous » : `estFaitADater` la rejette sur la
    // périodicité, avant même de consulter `EXCLUES_DU_FAIT_DATE`. Écrit sur
    // l'obligation livrée, il n'éprouverait donc plus l'exclusion — il
    // constaterait une périodicité.
    //
    // On l'éprouve sur un cas FABRIQUÉ : la même obligation ramenée à
    // `periodicite: "autre"`, c'est-à-dire l'état d'avant. Retirer l'entrée de
    // `EXCLUES_DU_FAIT_DATE` fait échouer ce test ; la retirer ne faisait rien
    // à la version précédente.
    const visite = obligationsConformite.find(
      (o) => o.id === "incendie-erp-5-visite-commission",
    );
    expect(visite, "l'exception a disparu du référentiel : retirer la garde").toBeDefined();
    if (!visite) return;

    // L'état livré : elle a un rendez-vous, donc elle n'est ni sur l'écran ni
    // dans le second verbe.
    expect(visite.periodicite).toBe("quinquennale");
    expect(estFaitADater(visite)).toBe(false);
    expect(modeDeclaration(visite)).toBeNull();

    // Le garde-fou lui-même, sur le cas qu'il existe pour couvrir.
    const sansRythme = { ...visite, periodicite: "autre" } as Obligation;
    expect(
      estFaitADater(sansRythme),
      "l'exclusion ne joue plus : la visite reviendrait sur l'écran sous « fait le »",
    ).toBe(false);
    expect(modeDeclaration(sansRythme)).toBeNull();
  });

  it("n'entre jamais dans le compteur d'en-tête", () => {
    // Le compteur porte une affirmation — « 6 sur 12 en place » — et non un
    // décompte. Une obligation qui revient ne peut pas y figurer.
    for (const o of obligationsConformite) {
      const mode = modeDeclaration(o);
      if (!mode) continue;
      if (mode.mode === "fait") expect(mode.compteDansLEnTete, o.id).toBe(false);
      else expect(mode.compteDansLEnTete, o.id).toBe(true);
    }
  });
});

describe("le dossier neuf — ce que le lot rend visible", () => {
  /**
   * Le chiffre est **mesuré par le moteur**, jamais écrit : c'est la consigne du
   * brief, et ce dépôt s'est fait prendre plusieurs fois par des comptes
   * recopiés à la main — jusque dans les briefs eux-mêmes.
   */
  it("un bureau de six personnes sans équipement reçoit des états à déclarer", () => {
    const applicables = determineObligationsApplicables(
      projeterEtablissement(bureau(6)),
      [],
    );
    const surEcran = applicables.filter(
      (a) => modeDeclaration(a.obligation) !== null,
    );

    expect(
      applicables.length,
      "le dossier neuf ne déclenche plus rien : le référentiel a changé de façon inattendue",
    ).toBeGreaterThan(0);

    // Le point du lot : la MAJORITÉ de ce qu'un dossier neuf déclenche n'avait
    // aucune surface. Si cette proportion s'effondre, c'est que les obligations
    // ont gagné des échéances — ou que l'écran a perdu son critère.
    expect(
      surEcran.length,
      "l'écran ne montre plus la majorité de ce que le dossier déclenche",
    ).toBeGreaterThan(applicables.length / 2);
  });

  it("chaque ligne de l'écran a un domaine libellé et un verbe", () => {
    const applicables = determineObligationsApplicables(
      projeterEtablissement(bureau(6)),
      [],
    );
    for (const a of applicables) {
      const mode = modeDeclaration(a.obligation);
      if (!mode) continue;
      expect(a.obligation.domaine, a.obligation.id).toBeTruthy();
      expect(["etat", "fait"]).toContain(mode.mode);
      // Rien de ce que l'écran affiche n'est un titre de salarié : le moteur ne
      // les rend pas (ADR-023) et l'écran Équipe leur donne déjà une surface.
      expect(porteurDe(a.obligation), a.obligation.id).not.toBe("salarie");
    }
  });

  it("le seuil d'effectif se voit sur l'écran comme ailleurs", () => {
    // Contre-épreuve du compteur : il est calculé sur CE dossier, pas sur le
    // référentiel. Douze salariés déclenchent le CSE, six non — l'écran doit
    // donc porter une ligne de plus.
    const compter = (n: number) =>
      determineObligationsApplicables(projeterEtablissement(bureau(n)), []).filter(
        (a) => modeDeclaration(a.obligation) !== null,
      ).length;

    expect(compter(12)).toBeGreaterThan(compter(6));
  });
});

describe("le prédicat partagé avec le générateur", () => {
  it("ne dit « pas de rendez-vous » que pour `autre`", () => {
    // `mise_en_service_uniquement` en produit un, daté de la mise en service.
    // L'inclure ici ferait disparaître du calendrier toutes les vérifications
    // initiales — un faux négatif de masse.
    expect(estSansRendezVous("autre")).toBe(true);
    expect(estSansRendezVous("mise_en_service_uniquement")).toBe(false);
    expect(estSansRendezVous("annuelle")).toBe(false);
  });

  it("le témoin : une obligation fabriquée sans nature d'état n'entre pas", () => {
    // Sans ce cas, une implémentation qui renverrait toujours un mode passerait
    // les tests précédents — ils ne regardent que le référentiel livré.
    const temoin = {
      ...obligationsConformite[0],
      id: "temoin-fabrique",
      nature: "evenementielle",
      periodicite: "autre",
    } as Obligation;
    expect(modeDeclaration(temoin)).toBeNull();
  });
});

describe("aucune surface de dépôt sur cet écran", () => {
  /**
   * **La contrainte ferme de l'ADR-027, tenue par un test et non par une
   * intention.** Cet écran collecte une déclaration, pas une pièce : ouvrir un
   * dépôt ici ferait de la case cochée une preuve apparente, sur un écran dont
   * tout le propos est qu'elle n'en est pas une.
   *
   * La garde est distincte de celle de `frontiere-medicale.test.ts`, qui
   * interdit le dépôt dans le module du salarié pour une raison de RGPD. Les
   * deux partagent la liste de ce qui compte comme un dépôt
   * (`rgpd/surfaces-depot.ts`) et rien d'autre : les raisons diffèrent, donc
   * les messages diffèrent.
   *
   * Éprouvée en réinjectant le défaut : un `<EvidenceDropzone />` ajouté à
   * `LigneEtat.tsx` fait tomber ce test, avec le nom du fichier fautif.
   */
  const CHEMINS_DE_L_ECRAN = [
    /^lib\/etats-permanents\//,
    /^components\/etats-permanents\//,
    /^app\/etablissements\/\[id\]\/etats-permanents\//,
  ];

  function sources(dir: string, acc: string[] = []): string[] {
    for (const nom of readdirSync(dir)) {
      if (nom === "node_modules" || nom === ".next") continue;
      const chemin = join(dir, nom);
      if (statSync(chemin).isDirectory()) sources(chemin, acc);
      else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) acc.push(chemin);
    }
    return acc;
  }

  it("aucun fichier de l'écran ne monte de dépôt de fichier", () => {
    const racine = join(process.cwd(), "src");
    const fautifs = sources(racine)
      .map((f) => ({ rel: relative(racine, f).replace(/\\/g, "/"), f }))
      .filter(({ rel }) => CHEMINS_DE_L_ECRAN.some((r) => r.test(rel)))
      .filter(({ f }) => MOTIF_DEPOT.test(readFileSync(f, "utf8")))
      .map(({ rel }) => rel);

    expect(
      fautifs,
      "Cet écran recueille une DÉCLARATION, jamais une pièce (ADR-027). Une case cochée à côté d'un dépôt se lit comme une preuve, sur l'écran dont tout le propos est qu'elle n'en est pas une. Retirez le dépôt — il n'y a pas de dérogation à demander ici.",
    ).toEqual([]);
  });

  it("le témoin : la liste des surfaces gardées n'est pas vide", () => {
    // Sans lui, vider `SURFACES_DE_DEPOT` rendrait le test précédent vert pour
    // toujours — une garde qui ne garde rien passe inaperçue.
    expect(SURFACES_DE_DEPOT.length).toBeGreaterThan(0);
    expect(MOTIF_DEPOT.test('<EvidenceDropzone name="x" />')).toBe(true);
    expect(MOTIF_DEPOT.test('<input type="file" />')).toBe(true);
    expect(MOTIF_DEPOT.test("<button>Déclarer en place</button>")).toBe(false);
  });
});

describe("le troisième cas — ce qu'un fait rend dû", () => {
  it("ne prend que les événementielles sans rythme écrit", () => {
    // Borne basse : tout ce que le prédicat retient porte bien les deux
    // caractères. Aucune liste d'identifiants ici — une liste se répare en
    // recopiant, donc elle cesse de vérifier.
    for (const o of obligationsConformite) {
      if (!estDeclencheeParUnFait(o)) continue;
      expect(o.nature, o.id).toBe("evenementielle");
      expect(o.periodicite, o.id).toBe("autre");
    }
  });

  it("laisse dehors ce que les deux autres verbes prennent", () => {
    // Borne haute : les trois prédicats sont disjoints. S'ils se recouvraient,
    // une obligation aurait deux surfaces — le défaut que la journée du
    // 2026-08-31 a passé à retirer.
    for (const o of obligationsConformite) {
      if (!estDeclencheeParUnFait(o)) continue;
      expect(estEtatADeclarer(o), o.id).toBe(false);
      expect(estFaitADater(o), o.id).toBe(false);
      expect(
        modeDeclaration(o),
        `${o.id} apparaîtrait à la fois sur « Ce qui doit être en place » et sur la fiche de son sujet`,
      ).toBeNull();
    }
  });

  it("relâche l'obligation le jour où un texte lui donne un rythme", () => {
    // Le cas FABRIQUÉ, comme pour la visite de commission : on prend une
    // obligation événementielle livrée et on lui donne une périodicité. Elle
    // doit alors quitter cette surface pour le calendrier — sans quoi elle y
    // serait deux fois.
    const evenementielle = obligationsConformite.find((o) =>
      estDeclencheeParUnFait(o),
    );
    expect(
      evenementielle,
      "plus aucune obligation événementielle sans rythme : retirer cette surface",
    ).toBeDefined();
    if (!evenementielle) return;

    const avecRythme = {
      ...evenementielle,
      periodicite: "annuelle",
    } as Obligation;
    expect(estDeclencheeParUnFait(avecRythme)).toBe(false);
    // Et la périodicité EFFECTIVE l'emporte sur celle du référentiel : c'est
    // ce qu'une prescription particulière fait (ADR-035).
    expect(estDeclencheeParUnFait(evenementielle, "annuelle")).toBe(false);
  });

  it("couvre les deux sujets qui ont une fiche", () => {
    // Le point de la décision : « une obligation vit chez son sujet ». Les
    // deux sujets servis sont la personne et l'appareil ; ce test dit que
    // chacun en porte au moins une, pour que le jour où l'un des deux se
    // vide, quelqu'un le voie plutôt que de découvrir une carte morte.
    const parPorteur = new Map<string, string[]>();
    for (const o of obligationsConformite) {
      if (!estDeclencheeParUnFait(o)) continue;
      const p = porteurDe(o);
      parPorteur.set(p, [...(parPorteur.get(p) ?? []), o.id]);
    }
    expect(
      (parPorteur.get("salarie") ?? []).length,
      "la fiche d'un salarié doit en montrer au moins une",
    ).toBeGreaterThan(0);
    expect(
      (parPorteur.get("equipement") ?? []).length,
      "la fiche d'un équipement doit en montrer au moins une",
    ).toBeGreaterThan(0);
  });
});
