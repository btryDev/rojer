import { describe, expect, it } from "vitest";
import {
  couvertureDeLEtablissement,
  couvertureDuRegime,
  faitInventaire,
  riensASignaler,
  type AxeCouverture,
  type FaitsCouverture,
  type RegimeEtablissement,
} from "./couverture";
import type { EtatCouverture } from "@/lib/duerps/couverture";
import type { CorrespondanceSecteur } from "./secteur";

const regimeCouvert: RegimeEtablissement = {
  estERP: true,
  estIGH: false,
  categorieErp: "N5",
  estHabitation: false,
};

/** Un dossier sans rien à signaler : chaque test n'y ajoute que son axe. */
function faits(partiel: Partial<FaitsCouverture> = {}): FaitsCouverture {
  return {
    regime: regimeCouvert,
    duerp: null,
    equipements: { nbSansObligation: 0, nbEquipements: 12, nbRetires: 0 },
    effectif: null,
    ...partiel,
  };
}

const axes = (c: { manques: { axe: AxeCouverture }[] }) =>
  c.manques.map((m) => m.axe);
const axesIndetermines = (c: { indeterminations: { axe: AxeCouverture }[] }) =>
  c.indeterminations.map((i) => i.axe);

/* ─── L'axe du régime — le comportement d'origine, préservé ───────────── */

describe("axe du régime", () => {
  it("ne signale rien pour un ERP de 5e catégorie", () => {
    expect(riensASignaler(couvertureDuRegime(regimeCouvert))).toBe(true);
  });

  it("ne signale rien pour un établissement qui n'est pas ERP, sans regarder la catégorie", () => {
    const c = couvertureDuRegime({
      estERP: false,
      estIGH: false,
      categorieErp: null,
      estHabitation: false,
    });
    expect(riensASignaler(c)).toBe(true);
  });

  it.each(["N1", "N2", "N3", "N4"] as const)(
    "met hors périmètre un ERP de catégorie %s",
    (categorieErp) => {
      const c = couvertureDuRegime({ ...regimeCouvert, categorieErp });
      expect(axes(c)).toEqual(["categorie_erp"]);
    },
  );

  it("ne tranche pas quand la catégorie manque, et ne suppose surtout pas la 5e", () => {
    // Supposer « couvert » ici est l'erreur que ce module existe pour
    // empêcher : elle produirait un écran rassurant sur une donnée absente.
    const c = couvertureDuRegime({ ...regimeCouvert, categorieErp: null });
    expect(c.manques).toEqual([]);
    expect(axesIndetermines(c)).toEqual(["categorie_erp"]);
    // Et surtout : une indétermination n'est pas un silence.
    expect(riensASignaler(c)).toBe(false);
  });

  it("met un IGH hors périmètre avant même de regarder la catégorie ERP", () => {
    const c = couvertureDuRegime({
      ...regimeCouvert,
      estIGH: true,
      categorieErp: "N5",
      estHabitation: false,
    });
    expect(axes(c)).toEqual(["igh"]);
    expect(c.manques[0].motif).toContain("de grande hauteur (IGH)");
  });

  it("dit l'établissement SITUÉ dans l'immeuble, pas l'immeuble lui-même", () => {
    // La donnée recueillie porte sur le bâtiment (« Immeuble de Grande
    // Hauteur », > 28 m ou > 50 m) : un établissement n'est pas « déclaré
    // immeuble ». Même phrase que `pdf/mentions-registre.ts`.
    const c = couvertureDuRegime({ ...regimeCouvert, estIGH: true });
    expect(c.manques[0].motif).toMatch(/situé dans un immeuble déclaré de grande hauteur/);
    expect(c.manques[0].motif).not.toMatch(/est déclaré immeuble/);
  });
});

/* ─── L'axe DUERP — une projection de l'ADR-020, pas une déclaration ──── */

describe("axe secteur_duerp — projection de l'ADR-020", () => {
  const avecEtat = (etat: EtatCouverture, nbActivitesDeclarees = 0) =>
    couvertureDeLEtablissement(
      faits({
        duerp: {
          etat,
          secteurNom: "Commerce de détail",
          nbActivitesDeclarees,
          correspondance: { statut: "correspond" as const },
        },
      }),
    );

  it("se tait quand le dossier n'a pas de DUERP — un DUERP absent est un autre sujet", () => {
    expect(
      riensASignaler(couvertureDeLEtablissement(faits({ duerp: null }))),
    ).toBe(true);
  });

  it("se tait quand l'ADR-020 n'a identifié aucun manque", () => {
    expect(riensASignaler(avecEtat("aucun_manque_identifie"))).toBe(true);
  });

  it.each([
    "secteur_inconnu",
    "secteur_non_instruit",
    "manques_identifies",
  ] as const)("rend un manque pour l'état %s", (etat) => {
    const c = avecEtat(etat, 3);
    expect(axes(c)).toEqual(["secteur_duerp"]);
    expect(c.indeterminations).toEqual([]);
  });

  it("range `reponses_incompletes` en indétermination, jamais en manque", () => {
    // Le distinguer est tout l'enjeu de l'ADR-020 : un silence n'est pas un
    // « non », et l'afficher en rouge dirait au dirigeant qu'un fait est
    // établi alors qu'une question attend sa réponse.
    const c = avecEtat("reponses_incompletes");
    expect(c.manques).toEqual([]);
    expect(axesIndetermines(c)).toEqual(["secteur_duerp"]);
    expect(c.indeterminations[0].quoiFaire).toContain("Activités");
  });

  it("compte les activités déclarées sans jamais les renommer", () => {
    const c = avecEtat("manques_identifies", 2);
    expect(c.manques[0].motif).toContain("2 activités");
  });

  it("accorde au singulier quand il n'y en a qu'une", () => {
    const c = avecEtat("manques_identifies", 1);
    expect(c.manques[0].motif).toContain("1 activité ou unité");
    expect(c.manques[0].motif).not.toContain("activités");
  });

  it("nomme le secteur quand il est résolu, et se passe de lui sinon", () => {
    expect(avecEtat("secteur_non_instruit").manques[0].motif).toContain(
      "Commerce de détail",
    );
    const sansNom = couvertureDeLEtablissement(
      faits({
        duerp: {
          etat: "secteur_non_instruit",
          secteurNom: null,
          nbActivitesDeclarees: 0,
          correspondance: { statut: "correspond" as const },
        },
      }),
    );
    expect(sansNom.manques[0].motif).toContain("Le référentiel retenu");
  });

  it("couvre les cinq états de l'ADR-020, et rien de plus", () => {
    // Cette liste est le miroir de l'union `EtatCouverture`. Elle vit ici pour
    // que l'ajout d'un état se voie deux fois : le `switch` exhaustif de
    // `axeDuerp` casse la compilation, et ce test casse au rouge. La
    // compilation seule ne suffirait pas — un `default` ajouté par
    // inadvertance la rendrait de nouveau silencieuse.
    const tous: EtatCouverture[] = [
      "secteur_inconnu",
      "secteur_non_instruit",
      "manques_identifies",
      "reponses_incompletes",
      "aucun_manque_identifie",
    ];
    for (const etat of tous) {
      expect(() => avecEtat(etat)).not.toThrow();
    }
  });
});

describe("axe secteur_duerp — le secteur retenu par défaut", () => {
  // Le cas que l'ouverture de la porte d'onboarding (B1) rend courant : plus
  // aucun code NAF n'est refusé, donc un dirigeant hors des trois secteurs
  // instruits arrive à la page de choix du DUERP, qui lui propose de prendre
  // « le secteur le plus proche ». Son document sort alors pré-rempli pour un
  // autre métier que le sien — et sans cette ligne, rien ne le dirait.
  const avecCorrespondance = (
    correspondance: CorrespondanceSecteur,
    etat: EtatCouverture = "aucun_manque_identifie",
  ) =>
    couvertureDeLEtablissement(
      faits({
        duerp: {
          etat,
          secteurNom: "Restauration",
          nbActivitesDeclarees: 0,
          correspondance,
        },
      }),
    );

  const diverge = (referentielDuNaf: { id: string; nom: string } | null) =>
    ({ statut: "diverge", referentielDuNaf }) as const;

  it("se tait quand le secteur retenu est celui du code NAF", () => {
    expect(riensASignaler(avecCorrespondance({ statut: "correspond" }))).toBe(
      true,
    );
  });

  it.each([
    ["sans_naf", { statut: "sans_naf" } as const],
    [
      "sans_secteur_retenu",
      { statut: "sans_secteur_retenu", referentielDuNaf: null } as const,
    ],
    [
      "sans_secteur_retenu, NAF résolu",
      {
        statut: "sans_secteur_retenu",
        referentielDuNaf: { id: "commerce", nom: "Commerce de détail" },
      } as const,
    ],
  ])("se tait sur l'axe « par défaut » quand rien ne diverge (%s)", (_, c) => {
    // Cet axe-là ne parle que de divergence. Les deux autres états sont dits
    // par `axeDuerp`, qui a la donnée pour les distinguer ; les redire ici
    // ferait deux messages pour un fait.
    expect(riensASignaler(avecCorrespondance(c))).toBe(true);
  });

  it("le dit quand le référentiel retenu n'est pas celui du code NAF", () => {
    const c = avecCorrespondance(diverge(null));
    expect(axes(c)).toEqual(["secteur_duerp"]);
    expect(c.manques[0].motif).toContain("Restauration");
    expect(c.manques[0].consequence).toContain("un autre métier que le vôtre");
  });

  it("n'affirme « aucun référentiel instruit » que si le NAF n'en désigne aucun", () => {
    // Le défaut relevé en revue. `diverge` recouvre deux situations : le code
    // n'a aucun référentiel (la page a proposé « le plus proche »), ou il en a
    // un et le dirigeant en a retenu un autre — une boulangerie en 47.24Z a
    // bien son référentiel commerce, et la page offre quand même « Changer de
    // secteur ». Confondre les deux faisait affirmer, jusque dans le PDF remis
    // à un tiers, un fait que la comparaison n'établit pas.
    const sansRef = avecCorrespondance(diverge(null));
    expect(sansRef.manques[0].consequence).toContain(
      "Aucun référentiel n'est instruit pour votre activité",
    );

    const avecRef = avecCorrespondance(
      diverge({ id: "commerce", nom: "Commerce de détail" }),
    );
    expect(avecRef.manques[0].consequence).not.toContain(
      "Aucun référentiel n'est instruit",
    );
    expect(avecRef.manques[0].consequence).toContain("Commerce de détail");
  });

  it("s'ajoute à l'état de l'ADR-020 au lieu de s'y substituer", () => {
    // Un DUERP peut n'avoir « aucun manque identifié » au sens de sa propre
    // liste d'activités ET reposer sur le référentiel d'un autre métier. Les
    // deux sont vrais, et les confondre ferait disparaître le second — c'est
    // précisément le silence qui prend l'apparence d'une réponse.
    const c = avecCorrespondance(diverge(null), "manques_identifies");
    expect(axes(c)).toEqual(["secteur_duerp", "secteur_duerp"]);
    expect(c.manques[0].motif).toContain("ne couvre pas");
    expect(c.manques[1].motif).toContain("ne correspond pas à votre code");
  });

  it("se passe du nom du secteur quand il manque, sans se taire", () => {
    const c = couvertureDeLEtablissement(
      faits({
        duerp: {
          etat: "aucun_manque_identifie",
          secteurNom: null,
          nbActivitesDeclarees: 0,
          correspondance: diverge(null),
        },
      }),
    );
    expect(axes(c)).toEqual(["secteur_duerp"]);
    expect(c.manques[0].motif).toContain("s'appuie sur un référentiel");
  });
});

describe("axe secteur_duerp — `secteur_inconnu` couvre trois situations", () => {
  // Un seul état de l'ADR-020, trois faits distincts, et une seule des trois
  // situations autorise à dire qu'aucun référentiel n'existe pour l'activité.
  // La première version disait cette phrase dans les trois cas, sans jamais
  // regarder le code NAF — et `duerps/actions.ts` crée le DUERP SANS secteur
  // puis redirige vers l'écran de choix, donc le cas passe par là à chaque
  // création de dossier.
  const inconnuAvec = (correspondance: CorrespondanceSecteur) =>
    couvertureDeLEtablissement(
      faits({
        duerp: {
          etat: "secteur_inconnu",
          secteurNom: null,
          nbActivitesDeclarees: 0,
          correspondance,
        },
      }),
    );

  it("n'affirme PAS l'absence de référentiel quand le NAF en désigne un", () => {
    // Le défaut : la boulangerie 47.24Z venait de créer son DUERP et lisait,
    // sur son board comme dans le PDF remis à un tiers, qu'aucun référentiel
    // ne correspondait à son activité — pendant que l'écran suivant lui
    // recommandait Commerce de détail.
    const c = inconnuAvec({
      statut: "sans_secteur_retenu",
      referentielDuNaf: { id: "commerce", nom: "Commerce de détail" },
    });
    expect(axes(c)).toEqual(["secteur_duerp"]);
    expect(c.manques[0].motif).toContain("pas encore de référentiel sectoriel");
    expect(c.manques[0].consequence).toContain("Commerce de détail");
    for (const t of [c.manques[0].motif, c.manques[0].consequence]) {
      expect(t).not.toMatch(/aucun référentiel/i);
    }
  });

  it("l'affirme quand le NAF n'en désigne effectivement aucun", () => {
    const c = inconnuAvec({
      statut: "sans_secteur_retenu",
      referentielDuNaf: null,
    });
    expect(c.manques[0].motif).toContain(
      "Aucun référentiel sectoriel n'est instruit",
    );
  });

  it("dit qu'il ne peut pas se prononcer quand aucun code NAF n'est renseigné", () => {
    // Ne pas avoir de code n'est pas la même chose que d'en avoir un sans
    // référentiel. Les confondre affirmerait l'inexistence sur une donnée
    // absente — l'hypothèse silencieuse que ce dossier existe pour empêcher.
    const c = inconnuAvec({ statut: "sans_naf" });
    expect(c.manques[0].motif).toContain(
      "aucun code d'activité n'est renseigné",
    );
    expect(c.manques[0].consequence).toContain(
      "on ne peut pas non plus vous dire quel référentiel conviendrait",
    );
  });

  it("le secteur retiré depuis : une seule phrase, et pas son contraire", () => {
    // La quatrième combinaison, oubliée par le `describe` d'origine et
    // introduite par la correction précédente. `secteur_inconnu` + `diverge` :
    // le document PORTE un identifiant de secteur — d'où `diverge` — mais plus
    // aucun référentiel ne le résout. C'est le second cas que l'ADR-020 nomme,
    // « ou secteur retiré depuis ».
    //
    // La première version tirait `referentielDuNaf` de `sans_secteur_retenu`
    // OU de `diverge` et écrivait la phrase du premier dans les deux cas. Le
    // bandeau et le PDF sortaient alors deux blocs contradictoires à une ligne
    // d'intervalle : « n'a pas ENCORE de référentiel sectoriel » suivi de
    // « s'APPUIE sur un référentiel ».
    const c = inconnuAvec({
      statut: "diverge",
      referentielDuNaf: { id: "commerce", nom: "Commerce de détail" },
    });

    // Un seul manque : `axeSecteurParDefaut` se tait, `secteur_inconnu` a tout
    // dit. Deux messages pour un fait tireraient vers une comparaison qui n'a
    // plus d'objet.
    expect(c.manques).toHaveLength(1);
    expect(c.manques[0].motif).toContain("n'existe plus dans l'outil");
    expect(c.manques[0].consequence).toContain("Commerce de détail");

    // Et surtout : aucune des deux phrases contradictoires.
    const tout = `${c.manques[0].motif} ${c.manques[0].consequence}`;
    expect(tout).not.toMatch(/n'a pas encore de référentiel/i);
    expect(tout).not.toMatch(/s'appuie sur/i);
  });

  it("le secteur retiré depuis, sans référentiel pour le NAF non plus", () => {
    const c = inconnuAvec({ statut: "diverge", referentielDuNaf: null });
    expect(c.manques).toHaveLength(1);
    expect(c.manques[0].motif).toContain("n'existe plus dans l'outil");
    expect(c.manques[0].consequence).not.toMatch(/correspond à votre code/i);
  });

  it("dit dans les trois cas que le référentiel de conformité fonctionne", () => {
    // La phrase qui empêche de lire « votre dossier ne sert à rien ». Le
    // moteur de conformité ne lit jamais le code NAF.
    for (const c of [
      inconnuAvec({ statut: "sans_naf" }),
      inconnuAvec({ statut: "sans_secteur_retenu", referentielDuNaf: null }),
      inconnuAvec({
        statut: "sans_secteur_retenu",
        referentielDuNaf: { id: "commerce", nom: "Commerce de détail" },
      }),
    ]) {
      expect(c.manques[0].consequence).toContain(
        "Le référentiel de conformité, lui, fonctionne normalement",
      );
    }
  });
});

/* ─── L'axe équipements — un rappel, pas un second calcul ─────────────── */

describe("axe domaine_equipement", () => {
  it("se tait quand tous les appareils déclenchent quelque chose", () => {
    const c = couvertureDeLEtablissement(
      faits({ equipements: { nbSansObligation: 0, nbEquipements: 12, nbRetires: 0 } }),
    );
    expect(riensASignaler(c)).toBe(true);
  });

  it("dit le nombre, le situe, et renvoie au détail plutôt que de le refaire", () => {
    const c = couvertureDeLEtablissement(
      faits({ equipements: { nbSansObligation: 3, nbEquipements: 12, nbRetires: 0 } }),
    );
    expect(axes(c)).toEqual(["domaine_equipement"]);
    expect(c.manques[0].motif).toContain("3 équipements");
    expect(c.manques[0].motif).toContain("sur 12 en service");
    expect(c.manques[0].consequence).toContain("page Équipements");
  });

  it("ne conclut jamais qu'aucune vérification n'est due", () => {
    // C'est la phrase que `hors-referentiel.ts` s'interdit explicitement de
    // dire ; la dire ici, en agrégé, annulerait sa précaution.
    //
    // La première version de ce test cherchait la PRÉSENCE du démenti (« cela
    // ne veut pas dire qu'aucune vérification ne leur est due »). Elle passait
    // encore après qu'on eut préfixé la phrase par l'affirmation contraire :
    // le démenti était toujours là, l'affirmation aussi. Un test de présence
    // ne peut pas garantir une absence.
    const c = couvertureDeLEtablissement(
      faits({ equipements: { nbSansObligation: 1, nbEquipements: 1, nbRetires: 0 } }),
    );
    const phrase = c.manques[0].consequence;
    expect(phrase).toContain(
      "ne veut pas dire qu'aucune vérification ne leur est due",
    );
    // Ce qu'on interdit vraiment : que la phrase AFFIRME quelque part
    // qu'aucune vérification n'est due. Toute occurrence du groupe doit donc
    // être immédiatement précédée du démenti — une seule qui ne le soit pas,
    // et le test tombe, où qu'elle ait été glissée.
    for (const m of phrase.matchAll(/aucune vérification/gi)) {
      const avant = phrase.slice(0, m.index);
      expect(
        avant,
        `« ${phrase.slice(Math.max(0, m.index - 40), m.index + 30)} »`,
      ).toMatch(/ne veut pas dire qu'$/);
    }
  });
});

/* ─── Ce que les axes ne font pas ─────────────────────────────────────── */

describe("les axes ne s'additionnent ni ne se recouvrent", () => {
  const troisManques = couvertureDeLEtablissement({
    regime: {
      estERP: true,
      estIGH: false,
      categorieErp: "N2",
      estHabitation: false,
    },
    duerp: {
      etat: "secteur_inconnu",
      secteurNom: null,
      nbActivitesDeclarees: 0,
      correspondance: { statut: "sans_naf" as const },
    },
    equipements: { nbSansObligation: 4, nbEquipements: 9, nbRetires: 0 },
    effectif: null,
  });

  it("rend un manque par axe, dans un ordre stable — le régime d'abord", () => {
    expect(axes(troisManques)).toEqual([
      "categorie_erp",
      "secteur_duerp",
      "domaine_equipement",
    ]);
  });

  it("ne rend ni total, ni score, ni pourcentage de couverture", () => {
    // Un chiffre unique laisserait croire à une mesure de la complétude, que
    // rien ne fonde : quatre manques sur quatre axes ne sont pas quatre fois
    // la même chose. Le contrat de sortie est donc fermé à deux listes.
    expect(Object.keys(troisManques).sort()).toEqual([
      "indeterminations",
      "manques",
    ]);
  });

  it("ne qualifie jamais la situation au regard du droit", () => {
    const interdits = /conforme|non conforme|infraction|complet à|% couvert/i;
    for (const m of troisManques.manques) {
      expect(m.motif).not.toMatch(interdits);
      expect(m.consequence).not.toMatch(interdits);
    }
  });

  it("dit manque ET indétermination quand les deux sont vraies", () => {
    // Les rabattre sur un état unique en perdrait une moitié : c'est la raison
    // d'être des deux listes.
    const c = couvertureDeLEtablissement(
      faits({
        regime: {
          estERP: true,
          estIGH: false,
          categorieErp: null,
          estHabitation: false,
        },
        equipements: { nbSansObligation: 2, nbEquipements: 5, nbRetires: 0 },
      }),
    );
    expect(axes(c)).toEqual(["domaine_equipement"]);
    expect(axesIndetermines(c)).toEqual(["categorie_erp"]);
  });
});

/* ─── L'axe de la famille d'habitation, retiré le 2026-09-03 ──────────────
   Quatre tests vivaient ici et tenaient une distinction juste : l'habitation
   sans famille produisait une INDÉTERMINATION — « il ne sait pas encore, et
   voici comment le lui apprendre » — et jamais un MANQUE, qui aurait dit à
   tort « l'outil ne couvre pas votre régime ». Ils vérifiaient aussi les deux
   pièges : ne pas déclencher l'axe sur `familleHabitation === null` seul, ce
   qui l'aurait posé sur tous les commerces, et cohabiter avec l'axe du régime
   sans le remplacer.

   L'axe part avec la question. Une indétermination annonce à l'utilisateur
   qu'une réponse manquante élargit ce qu'on lui sert ; l'arrêté du 31 janvier
   1986 ouvert, aucune obligation ne dépend de la famille, et il n'y avait donc
   rien à élargir. Annoncer une incertitude qui n'en est pas une envoie
   chercher chez son syndic une information sans effet. */

/* ─── L'axe de l'effectif — ADR-031 § 1 bis ───────────────────────────── */

describe("axe effectif", () => {
  it("se tait quand l'effectif n'a pas été collecté", () => {
    // Et surtout il ne conclut pas « dans la cible » : un écran qui n'a pas
    // lu l'effectif n'a rien établi. Même règle que `publicRecu`.
    expect(riensASignaler(couvertureDeLEtablissement(faits()))).toBe(true);
  });

  it("se tait sous le seuil du programme annuel, parle à partir de lui", () => {
    // L. 4121-3-1, III, 1° : « supérieur ou égal à cinquante salariés ». Une
    // borne se prouve des deux côtés : 49 se tait, 50 parle — du programme,
    // pas du dépassement, puisque 50 est servi.
    const sous = couvertureDeLEtablissement(
      faits({ effectif: { surSite: 49, seuilServi: 50 } }),
    );
    expect(axes(sous)).not.toContain("effectif");

    const au = couvertureDeLEtablissement(
      faits({ effectif: { surSite: 50, seuilServi: 50 } }),
    );
    const m = au.manques.filter((x) => x.axe === "effectif");
    expect(m).toHaveLength(1);
    expect(m[0].motif).toContain("L. 4121-3-1");
    expect(m[0].motif).not.toContain("au-delà");
  });

  it("au-dessus du seuil servi, dit le dépassement, une seule fois", () => {
    // Un `>=` mis à la place du `>` refuserait l'établissement de cinquante
    // salariés, qui est exactement la cible haute du produit.
    const audela = couvertureDeLEtablissement(
      faits({ effectif: { surSite: 51, seuilServi: 50 } }),
    );
    const m = audela.manques.filter((x) => x.axe === "effectif");
    expect(m).toHaveLength(1);
    expect(m[0].motif).toContain("au-delà");
  });

  it("est un MANQUE, jamais une indétermination", () => {
    // La distinction porte tout l'axe. Une indétermination dirait « répondez
    // et on saura » ; ici la réponse est donnée, et c'est elle qui établit le
    // manque. Le dossier reste ouvert (ADR-031 § 1 bis) : ce module ne ferme
    // rien, il dit.
    const c = couvertureDeLEtablissement(
      faits({ effectif: { surSite: 62, seuilServi: 50 } }),
    );
    expect(axes(c)).toEqual(["effectif"]);
    expect(c.indeterminations).toEqual([]);
  });

  it("dit l'effectif déclaré et le seuil qu'il reçoit, sans en écrire aucun", () => {
    // Le seuil est un FAIT reçu, pas une constante de ce module : la phrase
    // doit donc suivre celui qu'on lui donne. Un 50 écrit en dur ici ferait
    // de cet axe une seconde déclaration de ce que le produit sait servir, et
    // elle divergerait en silence de `EFFECTIF_MAX`.
    const c = couvertureDeLEtablissement(
      faits({ effectif: { surSite: 77, seuilServi: 60 } }),
    );
    const m = c.manques.find((x) => x.axe === "effectif");
    expect(m?.motif).toContain("77");
    expect(m?.motif).toContain("60");
  });

  it("ne qualifie jamais la situation au regard du droit", () => {
    const c = couvertureDeLEtablissement(
      faits({ effectif: { surSite: 80, seuilServi: 50 } }),
    );
    const dit = c.manques.map((m) => `${m.motif} ${m.consequence}`).join(" ");
    for (const interdit of [
      "conforme",
      "non conforme",
      "infraction",
      "en règle",
    ]) {
      expect(dit.toLowerCase()).not.toContain(interdit);
    }
  });

  it("s'ajoute à l'axe du régime au lieu de s'y substituer", () => {
    const c = couvertureDeLEtablissement(
      faits({
        regime: { ...regimeCouvert, categorieErp: "N3" },
        effectif: { surSite: 90, seuilServi: 50 },
      }),
    );
    // L'ordre est celui de l'énumération : le régime, puis la taille.
    expect(axes(c)).toEqual(["categorie_erp", "effectif"]);
  });
});

/* ─── L'axe de l'inventaire — § 15 des chantiers ouverts ──────────────── */

describe("axe de l'inventaire : aucun équipement déclaré", () => {
  // Le cas réel : un dossier qui sort de l'onboarding. Trois étapes, aucune
  // ne déclare d'équipement — le parc en service est vide.
  const dossierNeuf = faits({
    equipements: { nbSansObligation: 0, nbEquipements: 0, nbRetires: 0 },
  });

  it("le dit, et comme un fait", () => {
    const m = faitInventaire(couvertureDeLEtablissement(dossierNeuf));
    expect(m?.axe).toBe("inventaire");
    expect(m?.motif).toMatch(/^Aucun équipement/);
  });

  it("se tait dès qu'un seul équipement est en service", () => {
    const c = couvertureDeLEtablissement(
      faits({ equipements: { nbSansObligation: 0, nbEquipements: 1, nbRetires: 0 } }),
    );
    expect(faitInventaire(c)).toBeNull();
    expect(axes(c)).not.toContain("inventaire");
  });

  it("n'est pas affirmé par l'écran qui n'a pas lu le parc", () => {
    // `couvertureDuRegime` ne reçoit que le régime. Il passait autrefois un
    // parc fictif à zéro à l'entrée complète : depuis cet axe, ce zéro aurait
    // fait dire « aucun équipement » à un écran qui n'a rien regardé.
    for (const estIGH of [false, true]) {
      const c = couvertureDuRegime({ ...regimeCouvert, estIGH });
      expect(axes(c)).not.toContain("inventaire");
    }
  });

  // Un parc entièrement retiré : l'équipement portait une preuve, il a été
  // désactivé plutôt que supprimé (`supprimerEquipement`), et le registre
  // imprime encore son rapport.
  const parcRetire = faits({
    equipements: { nbSansObligation: 0, nbEquipements: 0, nbRetires: 1 },
  });

  it("ne dit pas « rien au registre » quand un équipement retiré y porte ses preuves", () => {
    const m = faitInventaire(couvertureDeLEtablissement(parcRetire));
    expect(m?.axe).toBe("inventaire");
    expect(m?.consequence).not.toMatch(/registre/i);
    expect(m?.consequence).toMatch(/1 équipement retiré du parc sont conservés/);
  });

  it("ne qualifie rien, et ne renvoie pas le lecteur à un écran", () => {
    // Borne basse : les formes du verdict que la charte interdit (interdit 15,
    // « Rojer calcule, il n'avise pas »), par RADICAL — la première version
    // cherchait « complet » et laissait passer « se complète ». Et le renvoi à
    // un écran : ces phrases s'impriment dans des pièces lues par un tiers.
    for (const f of [dossierNeuf, parcRetire]) {
      const m = faitInventaire(couvertureDeLEtablissement(f));
      const texte = `${m?.motif} ${m?.consequence}`.toLowerCase();
      for (const radical of [/conform/, /en règle/, /compl[eè]t/, /à jour/, /score/, /page équipements/]) {
        expect(texte).not.toMatch(radical);
      }
      expect(texte).not.toMatch(/\d+\s*(%|\/\s*100)/);
    }
  });

  it("ne se confond pas avec l'axe des équipements sans obligation", () => {
    // Deux faits, deux phrases : le parc vide n'est pas un parc qui ne
    // déclenche rien. Les deux ne peuvent pas sortir ensemble.
    const c = couvertureDeLEtablissement(dossierNeuf);
    expect(axes(c)).toEqual(["inventaire"]);
  });
});
