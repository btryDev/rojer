import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  AUCUN_TIERS_ATTENDU,
  DOMAINES_PRESTATAIRE_ATTENDUS,
  TIERS_LUI_MEME_OBLIGATOIRE,
  domainesSansPrestataire,
  supposeUnTiers,
  type PrestatairesAttendus,
} from "./domaines";
import { LABEL_DOMAINE as LABEL_PRESTATAIRE } from "./schema";
import { referencesDepouillees } from "@/lib/referentiels/corpus";
import { porteurDe } from "@/lib/referentiels/conformite/types";
import type {
  DomaineObligation,
  Obligation,
} from "@/lib/referentiels/conformite/types";

const obligation = (o: Partial<Obligation> = {}): Obligation =>
  ({
    id: "test",
    domaine: "electricite",
    libelle: "Test",
    referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
    periodicite: "annuelle",
    realisateurs: ["organisme_agree"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    ...o,
  }) as Obligation;

describe("correspondance domaine d'obligation → domaine de prestataire", () => {
  it("chaque domaine de prestataire attendu porte un libellé", () => {
    // Le `Record` exhaustif garantit qu'aucun domaine d'obligation n'est
    // oublié ; celui-ci garantit que la contrepartie citée existe vraiment
    // côté annuaire et sait se nommer à l'écran. `froid` est arrivé au
    // référentiel sans contrepartie et personne ne l'a vu pendant des mois.
    for (const [domaine, attendus] of Object.entries(
      DOMAINES_PRESTATAIRE_ATTENDUS,
    ) as [DomaineObligation, PrestatairesAttendus][]) {
      // Le marqueur est une réponse, pas une absence de réponse : il dit que
      // le texte ne renvoie à aucun tiers. Il n'a donc pas de libellé
      // d'annuaire à vérifier — mais il reste soumis à la même exigence que
      // le reste, ci-dessous : personne ne peut l'employer pour se dispenser
      // de nommer un tiers qui existe.
      if (attendus === AUCUN_TIERS_ATTENDU) continue;
      expect(attendus.length, domaine).toBeGreaterThan(0);
      for (const d of attendus) {
        expect(LABEL_PRESTATAIRE[d], `${domaine} → ${d}`).toBeTruthy();
      }
    }
  });

  it("tout domaine cité par une obligation réelle a une contrepartie", () => {
    // Contre-épreuve sur le référentiel livré, pas sur des cas construits :
    // le `Record` pourrait être exhaustif au sens du type et vide de sens.
    for (const o of obligationsConformite) {
      expect(
        DOMAINES_PRESTATAIRE_ATTENDUS[o.domaine],
        `${o.id} (${o.domaine})`,
      ).toBeDefined();
    }
  });

  it("`aucun_tiers_attendu` ne couvre jamais une obligation qui appelle un tiers", () => {
    // LA garde du marqueur, et sans elle il ne vaudrait rien.
    //
    // `aucun_tiers_attendu` dit « le texte ne renvoie à personne ». Employé sur
    // un domaine dont une obligation exige en réalité un organisme agréé, il
    // rétablirait exactement le silence de `froid: []` — en plus poli, donc en
    // plus difficile à repérer : un tableau vide se remarque, un marqueur
    // explicite a l'air d'une décision.
    //
    // L'invariant se lit sur le référentiel livré, pas sur des cas construits :
    // un domaine marqué ne doit contenir AUCUNE obligation pour laquelle
    // `supposeUnTiers()` est vrai. Le jour où quelqu'un ajoute au lot 8 une
    // obligation à réalisateur tiers dans `information_travailleurs`, ce test
    // tombe et le marqueur doit céder la place à une vraie valeur d'enum — au
    // besoin nouvelle, avec sa migration.
    const abus = obligationsConformite
      .filter((o) => DOMAINES_PRESTATAIRE_ATTENDUS[o.domaine] === AUCUN_TIERS_ATTENDU)
      .filter((o) => supposeUnTiers(o))
      .map((o) => `${o.id} (${o.domaine}) → ${o.realisateurs.join(", ")}`);

    expect(
      abus,
      "Ces obligations vivent dans un domaine déclaré `aucun_tiers_attendu` " +
        "alors que tous leurs réalisateurs sont des tiers. Le marqueur affirme " +
        "que le texte n'attend personne ; ici il attend quelqu'un. Donnez au " +
        "domaine une vraie valeur `DomainePrestataire` — au besoin une nouvelle, " +
        "avec sa migration — au lieu de masquer le manque.",
    ).toEqual([]);
  });

  it("une obligation réalisée par l'exploitant n'appelle aucun prestataire", () => {
    // LE faux positif à ne pas produire. Signaler « aucun prestataire ne
    // couvre ce domaine » sur une obligation que le dirigeant réalise
    // lui-même l'enverrait chercher un tiers dont il n'a pas besoin.
    const o = obligation({ realisateurs: ["exploitant"] });
    expect(supposeUnTiers(o)).toBe(false);
    expect(domainesSansPrestataire([o], [])).toEqual([]);
  });

  it("un domaine sans prestataire déclaré est signalé", () => {
    expect(domainesSansPrestataire([obligation()], [])).toEqual([
      "electricite",
    ]);
  });

  it("un prestataire du bon domaine éteint le signal", () => {
    expect(domainesSansPrestataire([obligation()], ["electricite"])).toEqual([]);
  });

  it("un bureau de contrôle couvre les domaines qu'il contrôle", () => {
    // Sans ça, un dirigeant qui a déclaré son bureau de contrôle — celui qui
    // fait précisément la vérification — s'entendrait dire qu'il n'a personne.
    expect(domainesSansPrestataire([obligation()], ["bureau_controle"])).toEqual(
      [],
    );
  });

  it("un prestataire d'un autre domaine ne l'éteint pas", () => {
    // Contre-épreuve : sans elle, une implémentation qui ne signale jamais
    // rien passerait les trois tests précédents.
    expect(domainesSansPrestataire([obligation()], ["nettoyage"])).toEqual([
      "electricite",
    ]);
  });

  it("le froid a bien une contrepartie, et ce n'est pas l'entretien général", () => {
    // Le cas qui a motivé la valeur d'enum. Le rabattre sur
    // `entretien_general` aurait compilé et menti : le contrôle d'étanchéité
    // exige un opérateur CERTIFIÉ (règlement (UE) 2024/573).
    expect(DOMAINES_PRESTATAIRE_ATTENDUS.froid).toContain("froid");
    expect(DOMAINES_PRESTATAIRE_ATTENDUS.froid).not.toContain(
      "entretien_general",
    );
  });
});

describe("les domaines dont la contrepartie n'est pas encore atteinte", () => {
  it("dit lesquels, plutôt que de laisser croire que le rapprochement les couvre", () => {
    // Ce test est un REGISTRE, pas une garde : il ne défend rien, il empêche
    // une affirmation de vieillir en silence.
    //
    // Le commentaire de `DOMAINES_PRESTATAIRE_ATTENDUS` a affirmé qu'un
    // dirigeant sans service de santé au travail déclaré « s'en verrait
    // averti », et que c'était « justement ce que le rapprochement sert à faire
    // voir ». C'était faux : aucune obligation de ces domaines n'atteint la
    // règle, pour deux raisons cumulées et toutes deux délibérées — le moteur
    // écarte les porteurs salarié (ADR-023), et les obligations
    // d'établissement de ces domaines sont réalisées par l'exploitant.
    //
    // Une entrée inatteignable n'est pas un défaut : elle est prête pour le
    // jour où une obligation appellera vraiment ce tiers. Ce qui était un
    // défaut, c'est de l'écrire comme si elle servait déjà.
    //
    // Quand ce test tombe, c'est qu'un domaine a basculé. Mettez la liste à
    // jour ET le commentaire qui l'explique — c'est leur divergence qui a
    // produit la fausse affirmation.
    //
    // IL EST TOMBÉ UNE FOIS, ET IL A FAIT CE QU'ON ATTENDAIT DE LUI.
    // `sante_travail` a quitté cette liste avec le lot 8 : la fiche d'entreprise
    // de `R. 4624-46` est portée par l'établissement — donc elle franchit le
    // moteur — et réalisée par le médecin du travail ou l'équipe
    // pluridisciplinaire — donc `supposeUnTiers()` est vrai. C'est très
    // exactement le cas que le commentaire de `DOMAINES_PRESTATAIRE_ATTENDUS`
    // annonçait comme futur. Le commentaire a été réécrit en même temps que
    // cette liste, comme la consigne ci-dessus le demande.
    // DEUX conditions, et la seconde est facile à oublier — la première
    // rédaction de ce test l'a oubliée, et il a classé `sante_travail` parmi
    // les domaines atteints alors qu'il ne l'est pas. `supposeUnTiers()` seul
    // se lit sur le référentiel entier ; or une obligation à porteur salarié
    // n'entre JAMAIS dans les applicables (`matching/engine.ts` rend `null`),
    // donc elle ne peut pas déclencher la règle, quels que soient ses
    // réalisateurs. C'est le cas de la VIP et du suivi renforcé, réalisés par
    // un professionnel de santé : des tiers bien réels, que le rapprochement
    // ne verra pourtant jamais.
    const atteignables = new Set(
      obligationsConformite
        .filter((o) => porteurDe(o) !== "salarie")
        .filter(supposeUnTiers)
        .map((o) => o.domaine),
    );
    const inatteignables = (
      Object.keys(DOMAINES_PRESTATAIRE_ATTENDUS) as DomaineObligation[]
    )
      .filter((d) => DOMAINES_PRESTATAIRE_ATTENDUS[d] !== AUCUN_TIERS_ATTENDU)
      .filter((d) => !atteignables.has(d))
      .sort();

    expect(
      inatteignables,
      "La liste des domaines dont la contrepartie de prestataire ne peut être " +
        "atteinte par aucune obligation livrée a changé. Ce n'est pas une " +
        "erreur en soi — mettez la liste à jour, et vérifiez que le commentaire " +
        "de `DOMAINES_PRESTATAIRE_ATTENDUS` dit toujours la vérité sur ce que " +
        "le rapprochement fait et ne fait pas.",
    ).toEqual([
      "formation_securite",
      "secours",
      // 2026-10-07 : le contrôle annuel de la ventilation des locaux de
      // stockage, seule ligne du domaine réalisée par un tiers, est retiré
      // (relecture préventeur du 30/09, décision de la propriétaire du 07/10).
      // Restent les fiches de données de sécurité et la formation, tenues par
      // l'exploitant. Le commentaire de la table le dit.
      "stockage_dangereux",
    ]);
  });
});

describe("les articles que ces phrases citent à l'écran", () => {
  it("sont tous dépouillés au corpus", () => {
    // La règle du dépôt vaut aussi pour une phrase d'interface : on ne cite pas
    // un texte que personne n'a lu. Le cliquet de `corpus.test.ts` ne garde que
    // les obligations — il n'aurait rien vu ici.
    //
    // Le risque est réel et il a failli se produire : la phrase du tiers
    // obligatoire nomme les deux formes de service, et ces deux branches ne
    // viennent PAS de `L. 4622-1`, qui tient en une ligne, mais de `D. 4622-1`
    // et `D. 4622-2`. Les citer sans les avoir ouverts aurait fait dire à
    // l'article fondateur ce qu'il ne dit pas — l'erreur exacte qui a coûté
    // deux tours de revue sur `L. 4622-7`.
    //
    // Ici ils sont dépouillés, par le lot 8. Ce test existe pour la prochaine
    // entrée, écrite par quelqu'un qui n'aura pas cette histoire en tête.
    const lues = referencesDepouillees();
    const manquants: string[] = [];

    for (const [domaine, phrase] of Object.entries(TIERS_LUI_MEME_OBLIGATOIRE)) {
      if (!phrase) continue;
      const texte = `${phrase.titre} ${phrase.sousTitre}`;
      // « L. 4622-1 », « D. 4622-2 », « R. 4624-10 »…
      const cites = [...texte.matchAll(/\b([LRD])\.\s?(\d+-\d+(?:-\d+)*)/g)].map(
        (m) => `${m[1]}. ${m[2]}`,
      );
      // Ce test n'EXIGE PAS qu'une phrase cite un article, et ne le peut plus.
      // La première rédaction le faisait — « ce qui est dû doit être sourcé » —
      // et c'était une bonne intention démentie par l'écran : la phrase de la
      // santé au travail citait deux articles, dépassait la largeur de la carte
      // et s'affichait « (D. 46… ». Une référence tronquée n'est pas une
      // référence abrégée, c'est un article fabriqué par la mise en page.
      //
      // Les références sont donc sorties du sous-titre, où elles ne tenaient
      // pas, et vivent sur l'obligation, qui les porte avec leurs URL et leurs
      // versions constatées. Ce qui reste gardé ici est la seule moitié qui
      // compte : SI une phrase cite un article, il doit avoir été lu.
      for (const a of cites) {
        if (!lues.has(a)) manquants.push(`${domaine} → ${a}`);
      }
    }

    expect(
      manquants,
      "Ces articles sont cités dans une phrase affichée au dirigeant sans " +
        "qu'aucun corpus ne déclare les avoir lus. Dépouiller avant de citer.",
    ).toEqual([]);
  });
});
