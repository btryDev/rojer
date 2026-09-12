import { describe, expect, it } from "vitest";
import { rapprocher } from "./transmissions";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { supposeUnTiers } from "@/lib/prestataires/domaines";
import { genererRecommandations, type EntreeRecos } from "./recommandations";
import type { Obligation } from "@/lib/referentiels/conformite/types";

const NOW = new Date("2026-08-28T10:00:00Z");

const obligation = (o: Partial<Obligation> = {}): Obligation =>
  ({
    id: "test",
    domaine: "electricite",
    libelle: "Vérification électrique",
    referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
    periodicite: "annuelle",
    realisateurs: ["organisme_agree"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    ...o,
  }) as Obligation;

const habilitation = () =>
  obligation({
    id: "habilitation",
    libelle: "Habilitation électrique du personnel",
    periodicite: "autre",
    realisateurs: ["exploitant"],
    transmet: [
      {
        vers: "salarie_designe",
        titre: null,
        motif:
          "R. 4544-10 fait délivrer l'habilitation à un travailleur désigné : l'obligation suppose une personne nommée.",
      },
    ],
  });

describe("rapprochement des transmissions (ADR-024)", () => {
  it("signale un domaine qu'aucun prestataire déclaré ne couvre", () => {
    const t = rapprocher([obligation()], [], new Set());
    expect(t.domainesSansPrestataire).toEqual([
      { domaine: "electricite", libelle: "Électricité" },
    ]);
  });

  it("se tait dès qu'un prestataire couvre le domaine", () => {
    expect(
      rapprocher([obligation()], ["electricite"], new Set()).domainesSansPrestataire,
    ).toEqual([]);
  });

  it("signale une obligation qui suppose une personne, quand aucun titre n'est déclaré", () => {
    const t = rapprocher([habilitation()], ["electricite"], new Set());
    expect(t.obligationsSupposantUnePersonne).toEqual([
      { id: "habilitation", libelle: "Habilitation électrique du personnel" },
    ]);
  });

  it("se tait quand un titre DU MÊME DOMAINE est déclaré", () => {
    // L'attestation médicale de voisinage est le seul titre d'électricité du
    // catalogue. La déclarer, c'est avoir saisi ce qu'on savait saisir dans ce
    // domaine — insister au-delà reviendrait à réclamer un titre que le
    // référentiel ne sait pas nommer (ADR-023).
    expect(
      rapprocher(
        [habilitation()],
        ["electricite"],
        new Set(["elec-salarie-attestation-medicale-voisinage"]),
      ).obligationsSupposantUnePersonne,
    ).toEqual([]);
  });

  it("ne se tait PAS quand le titre déclaré relève d'un autre domaine", () => {
    // LA régression que le lot 7 a failli livrer, et le seul test qui
    // l'attrape.
    //
    // La règle disait « dès qu'un titre QUELCONQUE est déclaré ». Elle était
    // juste tant que le catalogue tenait en une ligne : « un titre quelconque »
    // et « un titre d'électricité » désignaient alors la même chose. Le lot 7
    // a porté le catalogue à neuf lignes et l'équivalence est tombée.
    //
    // Le scénario, tel qu'il se produirait : un restaurateur déclare une
    // installation électrique, voit « une habilitation est peut-être due,
    // personne n'est déclaré », et saisit la formation à la sécurité de sa
    // plongeuse — le PREMIER geste que le catalogue élargi l'invite à faire.
    // Avec l'ancienne règle, le signal sur l'habilitation disparaissait
    // définitivement sans que rien n'en ait été dit.
    //
    // Les deux identifiants sont réels et le doivent : le domaine se lit sur
    // le référentiel, un id inventé n'en aurait aucun et le test passerait
    // pour la mauvaise raison.
    expect(
      rapprocher(
        [habilitation()],
        ["electricite"],
        new Set(["formation-securite-salarie-accueil"]),
      ).obligationsSupposantUnePersonne,
    ).toEqual([
      { id: "habilitation", libelle: "Habilitation électrique du personnel" },
    ]);
  });

  it("l'obligation qui ne transmet rien ne produit aucun signal de personne", () => {
    // Contre-épreuve : sans elle, une implémentation qui signalerait TOUTE
    // obligation passerait les tests précédents.
    expect(
      rapprocher([obligation()], ["electricite"], new Set())
        .obligationsSupposantUnePersonne,
    ).toEqual([]);
  });

  it("une obligation réalisée par l'exploitant ne réclame aucun prestataire", () => {
    // Le faux positif à ne jamais produire : envoyer chercher un tiers pour
    // une obligation que le dirigeant réalise lui-même.
    const t = rapprocher([obligation({ realisateurs: ["exploitant"] })], [], new Set());
    expect(t.domainesSansPrestataire).toEqual([]);
  });

  it("une obligation que l'exploitant PEUT réaliser n'en réclame pas non plus", () => {
    // Le cas que le test précédent ne couvrait pas, et le défaut qui était
    // livré : `realisateurs` est une DISJONCTION. « personne qualifiée OU
    // exploitant » veut dire que le dirigeant a le droit de faire l'acte
    // lui-même. Trois obligations réelles sont dans ce cas, dont le nettoyage
    // des circuits d'extraction (GC 21 § 2) — un restaurateur avec une hotte
    // s'entendait dire qu'aucun prestataire ne couvrait son domaine.
    const o = obligation({
      domaine: "cuisson_hotte",
      realisateurs: ["personne_qualifiee", "exploitant"],
    });
    expect(supposeUnTiers(o)).toBe(false);
    expect(rapprocher([o], [], new Set()).domainesSansPrestataire).toEqual([]);
  });

  it("une disjonction entièrement composée de tiers en réclame bien un", () => {
    // Contre-épreuve du test précédent : sans elle, un `every` qui rendrait
    // toujours faux passerait les deux.
    const o = obligation({
      realisateurs: ["personne_qualifiee", "organisme_agree"],
    });
    expect(supposeUnTiers(o)).toBe(true);
    expect(rapprocher([o], [], new Set()).domainesSansPrestataire).toEqual([
      { domaine: "electricite", libelle: "Électricité" },
    ]);
  });

  it("une transmission qui nomme son titre ne se tait que sur CE titre", () => {
    // Le faux négatif muet qu'un compte global aurait produit : un cuisinier
    // détenteur d'une attestation SST aurait fait disparaître la suggestion
    // de CACES d'un cariste.
    const o = obligation({
      id: "levage-caces",
      libelle: "Autorisation de conduite",
      transmet: [
        {
          vers: "salarie_designe",
          titre: "levage-caces-titre",
          motif:
            "Motif de test, assez long pour tenir le contrôle de substance du motif.",
        },
      ],
    });
    // Un autre titre déclaré ne doit rien éteindre.
    expect(
      rapprocher([o], ["electricite"], new Set(["sst"]))
        .obligationsSupposantUnePersonne,
    ).toHaveLength(1);
    // Le titre nommé, lui, éteint.
    expect(
      rapprocher([o], ["electricite"], new Set(["levage-caces-titre"]))
        .obligationsSupposantUnePersonne,
    ).toEqual([]);
  });
});

describe("règles 9-10 : une transmission ne passe jamais devant une urgence", () => {
  const base = (): EntreeRecos => ({
    etablissementId: "etab-x",
    verifications: [
      {
        id: "v1",
        statut: "planifiee",
        datePrevue: new Date("2026-01-01T00:00:00Z"),
        dateRealisee: null,
        libelleObligation: "Vérification en retard",
        equipementLibelle: "Tableau",
        archiveLe: null,
      },
    ],
    actions: [],
    nbEquipements: 3,
    duerpSecteurChoisi: true,
    nbRapports: 2,
    transmissions: {
      domainesSansPrestataire: [
        { domaine: "electricite", libelle: "Électricité" },
      ],
      obligationsSupposantUnePersonne: [
        { id: "habilitation", libelle: "Habilitation électrique" },
      ],
    },
  });

  it("le retard reste en tête", () => {
    const recs = genererRecommandations(base(), { now: NOW });
    expect(recs[0].kind).toBe("verif_depassee");
  });

  it("les deux transmissions apparaissent, derrière", () => {
    const recs = genererRecommandations(base(), { now: NOW });
    const kinds = recs.map((r) => r.kind);
    expect(kinds).toContain("transmission_prestataire");
    expect(kinds).toContain("transmission_salarie");
    expect(kinds.indexOf("transmission_prestataire")).toBeGreaterThan(0);
  });

  it("le prestataire passe devant le salarié", () => {
    const recs = genererRecommandations(base(), { now: NOW });
    expect(recs.indexOf(recs.find((r) => r.kind === "transmission_salarie")!)).
      toBeGreaterThan(
        recs.indexOf(recs.find((r) => r.kind === "transmission_prestataire")!),
      );
  });

  it("aucune transmission déclarée, aucune ligne", () => {
    // Contre-épreuve du bloc : sans elle, des règles qui pousseraient
    // toujours deux lignes passeraient tout ce qui précède.
    const e = base();
    e.transmissions = {
      domainesSansPrestataire: [],
      obligationsSupposantUnePersonne: [],
    };
    const kinds = genererRecommandations(e, { now: NOW }).map((r) => r.kind);
    expect(kinds).not.toContain("transmission_prestataire");
    expect(kinds).not.toContain("transmission_salarie");
  });

  it("ne dit pas « aucun n'est déclaré » — la règle a changé sous cette phrase", () => {
    // Le défaut, et il est né d'une correction juste.
    //
    // La phrase disait « Suppose un titre nominatif — aucun n'est déclaré ».
    // Elle était vraie par construction : `rapprocher()` ne signalait une
    // transmission `titre: null` que si le dossier ne portait AUCUN titre.
    //
    // Le 2026-08-31, cette règle est passée au domaine — un certificat de
    // secourisme ne fait plus taire le signal d'électricité. Le contrôle
    // visuel a alors montré, dans un dossier où une salariée détenait un titre
    // SST déclaré et visible sur sa fiche, le tableau de bord affichant
    // « aucun n'est déclaré » pour une autre obligation.
    //
    // La phrase voulait dire « aucun DE CE TYPE » ; elle disait « aucun ».
    const sousTitre = genererRecommandations(base(), { now: NOW }).find(
      (r) => r.kind === "transmission_salarie",
    )?.sousTitre;

    expect(
      sousTitre,
      "Le sous-titre affirme qu'aucun titre n'est déclaré. C'est faux dès " +
        "qu'un titre d'un autre domaine existe — et depuis que le silence est " +
        "indexé sur le domaine, c'est un état atteignable.",
    ).not.toContain("aucun n'est déclaré");

    // Et il ne peut pas non plus nommer le titre attendu : la transmission ne
    // le sait pas — c'est tout l'objet du `titre: null`, et l'ADR-024 pose que
    // le produit nomme le trou sans le dériver. La formulation doit rester
    // générique SANS être fausse.
    expect(sousTitre).toContain("titre nominatif");
  });

  it("la santé au travail ne se lit pas comme un trou de saisie", () => {
    // Une seule règle servait les onze domaines : « aucun intervenant déclaré
    // en X — s'il intervient déjà chez vous, il reste à l'inscrire ». Juste
    // pour dix domaines techniques, où l'on choisit un organisme et où le cas
    // probable est bien une saisie manquante.
    //
    // Pour la santé au travail, elle ratait sa cible : organiser un service de
    // prévention et de santé au travail n'est pas une relation qu'on peut ne
    // pas avoir, elle est due (L. 4622-1). La phrase était écrite pour celui
    // qui a déjà un service ; pour celui qui n'a pas adhéré — le seul cas où
    // le produit pourrait éviter un manquement réel — elle se lisait comme un
    // trou de saisie.
    //
    // Les deux règles ne constatent pas la même chose : l'une une saisie
    // manquante, l'autre une obligation peut-être non remplie.
    const e = base();
    e.transmissions = {
      domainesSansPrestataire: [
        { domaine: "sante_travail", libelle: "Santé au travail" },
      ],
      obligationsSupposantUnePersonne: [],
    };
    const reco = genererRecommandations(e, { now: NOW }).find(
      (r) => r.kind === "transmission_tiers_obligatoire",
    );
    expect(reco, "La règle du tiers obligatoire ne se déclenche plus").toBeDefined();
    // Ce qui est dû…
    expect(reco!.sousTitre).toContain("doit en avoir un");
    // …l'action du destinataire EN PREMIER et à l'affirmative. Un employeur de
    // six personnes n'organise pas un service, il adhère. Reléguer « adhérer »
    // dans la clause conditionnelle — celle qui s'adresse à ceux qui l'ont déjà
    // fait — laissait sa phrase se lire « montez un service ».
    const i = reco!.sousTitre!.indexOf("adhésion");
    const j = reco!.sousTitre!.indexOf("service autonome");
    expect(i, "l'adhésion n'est plus nommée").toBeGreaterThan(-1);
    expect(j, "la seconde branche n'est plus nommée").toBeGreaterThan(-1);
    expect(i, "le service autonome passe devant l'adhésion").toBeLessThan(j);
    // …et l'issue la plus probable, qui retire le ton de reproche. Sans elle,
    // la phrase accuse un dirigeant qui a très probablement un service. C'est
    // la clause que la troncature coupait en premier.
    expect(reco!.sousTitre).toContain("il reste à l'inscrire");
    // AUCUNE RÉFÉRENCE D'ARTICLE ICI, et c'est délibéré. Une phrase qui en
    // citait deux dépassait la largeur de la carte et s'affichait « (D. 46… » —
    // une référence tronquée n'est pas une référence abrégée, c'est un article
    // fabriqué par la mise en page. Le fondement vit sur l'obligation, qui le
    // porte avec ses URL et ses versions constatées ; la carte oriente.
    expect(reco!.sousTitre).not.toMatch(/\b[LRD]\.\s?\d/);
    // Le titre ne se lit plus comme une case vide d'annuaire.
    expect(reco!.titre).not.toContain("intervenant");
  });

  it("un domaine technique garde la règle de la saisie manquante", () => {
    // Contre-épreuve : sans elle, faire basculer TOUS les domaines sur la
    // formulation « obligation due » passerait le test précédent — et
    // accuserait un restaurateur de ne pas avoir d'électricien.
    const e = base();
    e.transmissions = {
      domainesSansPrestataire: [
        { domaine: "electricite", libelle: "Électricité" },
      ],
      obligationsSupposantUnePersonne: [],
    };
    const kinds = genererRecommandations(e, { now: NOW }).map((r) => r.kind);
    expect(kinds).toContain("transmission_prestataire");
    expect(kinds).not.toContain("transmission_tiers_obligatoire");
  });

  it("chaque recommandation a une clé qui lui est propre", () => {
    // Le défaut, et il est né de la correction qui a rendu les transmissions
    // visibles ensemble : `board.tsx` employait `href` comme clé React, ce qui
    // était juste tant qu'une destination désignait une recommandation. Toutes
    // les transmissions de domaine mènent à l'annuaire des prestataires,
    // toutes celles de salarié à l'écran Équipe — React écrivait donc
    // « Encountered two children with the same key » deux fois par chargement.
    //
    // Une clé absente n'a pas d'effet ; une clé EN DOUBLE en a un. La liste est
    // statique aujourd'hui, mais le jour où elle se réordonne, une des deux
    // recommandations peut disparaître sans trace.
    //
    // Deux domaines et deux obligations salarié, donc quatre lignes qui
    // partagent deux destinations : c'est exactement la forme qui cassait.
    const e = base();
    e.transmissions = {
      domainesSansPrestataire: [
        { domaine: "electricite", libelle: "Électricité" },
        { domaine: "sante_travail", libelle: "Santé au travail" },
      ],
      obligationsSupposantUnePersonne: [
        { id: "habilitation", libelle: "Habilitation électrique" },
        { id: "formation-securite-etablissement-organisation", libelle: "Formation" },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    const cles = recs.map((r) => r.cle);

    expect(
      new Set(cles).size,
      `Deux recommandations partagent une clé : ${cles.join(", ")}`,
    ).toBe(cles.length);

    // Contre-épreuve : sans elle, une implémentation qui rendrait `cle` égale à
    // un compteur d'index passerait le test ci-dessus tout en réintroduisant le
    // défaut au premier réordonnancement. La clé doit être STABLE, donc dérivée
    // de ce que la recommandation désigne.
    const memeEntree = genererRecommandations(e, { now: NOW }).map((r) => r.cle);
    expect(memeEntree).toEqual(cles);
    expect(cles).toContain("transmission-domaine:sante_travail");
    expect(cles).toContain(
      "transmission-salarie:formation-securite-etablissement-organisation",
    );
  });

  it("les liens pointent là où le geste se fait", () => {
    const recs = genererRecommandations(base(), { now: NOW });
    expect(recs.find((r) => r.kind === "transmission_prestataire")?.href).toBe(
      "/etablissements/etab-x/prestataires",
    );
    expect(recs.find((r) => r.kind === "transmission_salarie")?.href).toBe(
      "/etablissements/etab-x/equipe",
    );
  });
});

describe("le parc de levage nomme la conduite (revue du lot 7)", () => {
  it("un chariot déclaré fait dire que quelqu'un doit être formé à le conduire", () => {
    // Le trou que ce test ferme, et il était béant : un commerce déclarait un
    // gerbeur, recevait sa vérification semestrielle, et n'apprenait JAMAIS que
    // la personne qui le conduit doit avoir reçu une formation adéquate
    // (R. 4323-55). Le fait déclencheur était pourtant déjà déclaré — la
    // propriété `estChariotOuGerbeur` de l'équipement.
    //
    // C'est très exactement le « troisième terme » de l'ADR-024 : ni dériver
    // qui conduit — le produit ne le sait pas —, ni se taire. Nommer.
    //
    // L'obligation est prise au référentiel réel : une copie de test aurait
    // passé le jour où quelqu'un retirerait la transmission.
    const vgp = obligationsConformite.find(
      (o) => o.id === "levage-vgp-semestrielle-chariot-gerbeur",
    )!;
    expect(
      rapprocher([vgp], [], new Set()).obligationsSupposantUnePersonne.map(
        (o) => o.id,
      ),
    ).toContain("levage-vgp-semestrielle-chariot-gerbeur");
  });

  it("se tait une fois la formation à la conduite déclarée", () => {
    // La transmission NOMME le titre attendu, donc elle se tait sur ce
    // titre-là précisément — pas sur « un titre quelconque », ni même sur
    // « un titre du même domaine ».
    const vgp = obligationsConformite.find(
      (o) => o.id === "levage-vgp-semestrielle-chariot-gerbeur",
    )!;
    expect(
      rapprocher([vgp], [], new Set(["conduite-salarie-formation"]))
        .obligationsSupposantUnePersonne,
    ).toEqual([]);
  });
});
