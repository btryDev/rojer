import { describe, expect, it } from "vitest";
import {
  categorieDeItem,
  construireRail,
  construireSections,
  deduireActif,
  type SidebarItemId,
  type SidebarModules,
} from "./sidebar-nav";

const ID = "etab_1";

/** Établissement le plus courant de nos trois secteurs : un ERP qui n'a
 *  encore ouvert aucun registre événementiel. */
const MODULES_ERP_NEUF: SidebarModules = {
  estERP: true,
  nbPermisFeu: 0,
  nbPlansPrevention: 0,
  carnetSanitaireExiste: false,
};

/** Items d'une section, dans l'ordre de rendu. */
function itemsDe(titre: string, modules?: SidebarModules) {
  const section = construireSections({ etablissementId: ID, modules }).find(
    (s) => s.title === titre,
  );
  return section?.items ?? [];
}

/** L'axe du lieu — le parc, les zones, et les registres qui en consignent
 *  l'état (ADR-030). */
function equipementBatiment(modules?: SidebarModules) {
  return itemsDe("Équipement et bâtiment", modules);
}

/** L'axe des personnes et des actes de prévention (ADR-030). */
function santeSecurite(modules?: SidebarModules) {
  return itemsDe("Santé-sécurité", modules);
}

/**
 * Les quatre registres, où qu'ils soient rangés.
 *
 * L'ADR-030 les a séparés : le DUERP suit les personnes, les trois autres
 * suivent le lieu. Leur QUALIFICATION — actif, non ouvert, non applicable —
 * n'a pas bougé pour autant, et c'est ce que les tests ci-dessous gardent.
 * Les chercher dans les deux axes plutôt que dans une section nommée évite
 * qu'un déplacement d'entrée fasse passer une règle métier pour cassée.
 */
const IDS_REGISTRES = ["duerp", "registre", "accessibilite", "carnet-sanitaire"];
function registres(modules?: SidebarModules) {
  return [...santeSecurite(modules), ...equipementBatiment(modules)].filter(
    (i) => IDS_REGISTRES.includes(i.id),
  );
}

function etatDe(id: SidebarItemId, modules?: SidebarModules) {
  return [...equipementBatiment(modules), ...santeSecurite(modules)].find(
    (i) => i.id === id,
  )?.etat;
}

function sections() {
  return construireSections({ etablissementId: ID });
}

function idsVisibles() {
  return sections().flatMap((s) => s.items.map((i) => i.id));
}

describe("deduireActif", () => {
  it("distingue la fiche établissement du tableau de bord", () => {
    expect(deduireActif(`/etablissements/${ID}`, ID)).toBe("tableau");
    expect(deduireActif(`/etablissements/${ID}/modifier`, ID)).toBe("fiche");
  });

  it("range les zones sous « Équipement et bâtiment » (ADR-019, ADR-030)", () => {
    expect(deduireActif(`/etablissements/${ID}/batiments`, ID)).toBe("batiments");
    expect(categorieDeItem("batiments")).toBe("equipement-batiment");
  });

  it("rattache les vérifications au calendrier", () => {
    expect(deduireActif(`/etablissements/${ID}/verifications/v1`, ID)).toBe(
      "calendrier",
    );
  });

  it("retombe sur le tableau de bord pour un chemin inconnu", () => {
    expect(deduireActif(`/etablissements/${ID}/inconnu`, ID)).toBe("tableau");
  });

  it("ne confond pas deux établissements", () => {
    expect(deduireActif(`/etablissements/autre/actions`, ID)).toBe("tableau");
  });

  it("reconnaît la page « Connecter »", () => {
    expect(deduireActif(`/etablissements/${ID}/connecter`, ID)).toBe(
      "connecter",
    );
  });
});

describe("construireSections — structure", () => {
  // L'ordre porte la découpe de l'ADR-030 : l'activité d'abord — ce qui
  // revient tout seul —, puis les trois axes thématiques.
  it("expose l'activité, les trois axes, puis le réglage", () => {
    expect(sections().map((s) => s.title)).toEqual([
      "À faire",
      "Santé-sécurité",
      "Équipement et bâtiment",
      "Documentation",
      "Paramètres",
    ]);
  });

  it("range les opérations ponctuelles avec la prévention, pas avec le lieu", () => {
    // Un permis de feu naît d'un chantier daté et meurt clos (ADR-017) : ce
    // n'est ni un registre tenu en continu, ni une propriété du bâtiment.
    // C'est un acte de prévention, et il suit les personnes.
    const ids = santeSecurite().map((i) => i.id);
    expect(ids).toContain("permis-feu");
    expect(ids).toContain("plan-prevention");
    expect(equipementBatiment().map((i) => i.id)).not.toContain("permis-feu");
  });

  it("ne porte dans « À faire » que des activités, jamais un filtre", () => {
    const aFaire = sections()[0];
    // `etats-permanents` entre ici et non au rail : l'ADR-022 nomme quatre
    // natures d'obligation, la première a le calendrier, la deuxième n'avait
    // aucune surface. Mettre en place EST une activité, et ce n'est pas l'état
    // filtré du calendrier — `estSansRendezVous` fait que ces lignes ne peuvent
    // pas y exister. Un filtre suppose que l'objet soit là.
    // « Préparer un contrôle » a quitté cette liste pour « Documentation » :
    // sa sortie est un jeu de documents, et une entrée qui figurerait aux
    // deux endroits laisserait le dirigeant se demander laquelle est la
    // bonne (ADR-015, décision 4).
    expect(aFaire.items.map((i) => i.id)).toEqual([
      "calendrier",
      "actions",
      "etats-permanents",
      // ADR-037 : la troisième nature. Une activité à une condition près — ce
      // qu'il faudra faire le jour où le fait survient —, pas un filtre : ces
      // lignes ne peuvent exister ni au calendrier ni à l'écran précédent.
      "quand-ca-arrive",
    ]);
    // Aucune destination du panneau ne porte de query : un filtre est un
    // réglage d'écran, pas une place dans l'arborescence (ADR-015 révisé).
    for (const it of aFaire.items) {
      expect(it.href).not.toContain("?");
    }
  });

  it("garde hors des sections ce qui vit ailleurs", () => {
    // Un résumé n'est pas une tâche — on y revient par la marque (ADR-015,
    // seconde révision) ; le guide a son entrée de premier niveau : les
    // laisser ici les afficherait deux fois.
    // Le tableau de bord reste hors sections : un résumé n'est pas une des
    // questions du dirigeant, on y revient par la marque (ADR-015, seconde
    // révision). Le guide, lui, EST revenu — sous « Documentation », où il
    // est un document parmi ceux qui expliquent le dossier et non une
    // activité de premier rang (ADR-030).
    expect(idsVisibles()).not.toContain("tableau");
    expect(idsVisibles()).toContain("guide");
  });

  it("ouvre la santé-sécurité par le DUERP et la ferme par ce qui n'est pas couvert", () => {
    const ids = santeSecurite().map((i) => i.id);
    expect(ids[0]).toBe("duerp");
    expect(ids[ids.length - 1]).toBe("perimetre");
  });

  it("garde les registres du lieu à plat, le registre de sécurité en tête", () => {
    const ids = equipementBatiment().map((i) => i.id);
    expect(ids.filter((i) => ["registre", "accessibilite", "carnet-sanitaire"].includes(i))).toEqual([
      "registre",
      "accessibilite",
      "carnet-sanitaire",
    ]);
  });

  it("n'expose aucun id en double", () => {
    const tous = idsVisibles();
    expect(new Set(tous).size).toBe(tous.length);
  });

  it("ne fait porter à aucun item le nom de sa propre section", () => {
    // Le rail affiche le nom de la catégorie, le panneau le répète en
    // en-tête, et l'item le disait une troisième fois : « Paramètres » se
    // lisait trois fois d'affilée pour quatre écrans différents, dont une
    // page intitulée « Connecter » au bout du lien. Un item qui reprend le
    // nom de sa section ne nomme rien — il ne dit pas ce qui le distingue de
    // sa voisine, et c'est la seule chose qu'on lui demande.
    for (const sec of sections()) {
      for (const it of sec.items) {
        expect(it.label.toLowerCase()).not.toBe(sec.title.toLowerCase());
      }
    }
  });

  it("ne fait porter à aucun item le nom d'un autre item", () => {
    // Borne voisine, et pas la même règle : deux entrées homonymes dans deux
    // panneaux différents se distinguent aussi mal que l'item et sa section.
    const labels = sections().flatMap((s) => s.items.map((i) => i.label));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("préfixe toutes les destinations réelles par l'établissement", () => {
    for (const sec of sections()) {
      for (const it of sec.items) {
        if (it.bientot) continue;
        expect(it.href.startsWith(`/etablissements/${ID}`)).toBe(true);
      }
    }
  });

  it("« Équipe » mène à son écran et n'est plus annoncée à venir", () => {
    // L'entrée est restée inerte le temps que le porteur salarié existe
    // (ADR-023). Il existe : elle doit mener quelque part, et surtout ne plus
    // porter `bientot` — une entrée « à venir » qui navigue ment deux fois.
    const equipe = sections()
      .flatMap((s) => s.items)
      .find((i) => i.id === "equipe");
    expect(equipe?.href).toBe(`/etablissements/${ID}/equipe`);
    expect(equipe?.bientot).toBeFalsy();
  });

  it("surligne « Équipe » sur la fiche d'une personne", () => {
    // La fiche vit sous `/equipe/<id>` : sans branche dans `deduireActif`,
    // elle retomberait sur « Tableau de bord » et le rail désignerait un
    // écran que l'utilisateur n'a pas ouvert.
    expect(deduireActif(`/etablissements/${ID}/equipe`, ID)).toBe("equipe");
    expect(deduireActif(`/etablissements/${ID}/equipe/abc`, ID)).toBe("equipe");
  });

  it("ne donne pas deux fois la même icône à deux entrées", () => {
    // « La même icône ne peut pas nommer un objet ici et une action là »
    // (docs/charte-board.md). `Users` désignait Prestataires ET Équipe.
    const items = sections().flatMap((s) => s.items);
    const parIcone = new Map<unknown, string[]>();
    for (const it of items) {
      parIcone.set(it.Icon, [...(parIcone.get(it.Icon) ?? []), it.id]);
    }
    const collisions = [...parIcone.values()].filter((ids) => ids.length > 1);
    expect(collisions).toEqual([]);
  });
});

describe("construireRail — rail à deux niveaux", () => {
  function rail() {
    return construireRail({ etablissementId: ID });
  }

  it("expose les catégories dans l'ordre du rail", () => {
    // L'activité d'abord, les trois axes thématiques ensuite, le réglage en
    // dernier (ADR-030). Cinq entrées pour trois axes, et c'est assumé : les
    // trois axes répondent à « de quoi s'agit-il », les deux autres à
    // « qu'est-ce que je fais maintenant » et « où je règle ».
    expect(rail().map((c) => c.id)).toEqual([
      "a-faire",
      "sante-securite",
      "equipement-batiment",
      "documentation",
      "parametres",
    ]);
  });

  it("donne une page d'entrée à chaque catégorie, panneau ou non", () => {
    // ADR-015 : cliquer une entrée de rail navigue. Une icône de premier
    // niveau qui ne mène nulle part n'est qu'un tiroir.
    for (const cat of rail()) {
      expect(cat.href.startsWith(`/etablissements/${ID}`)).toBe(true);
    }
  });

  it("fait entrer chaque panneau par son premier item", () => {
    // Sans quoi le rail déposerait sur un écran que le panneau ne montre
    // pas, et aucun item ne serait surligné à l'arrivée.
    for (const cat of rail()) {
      if (!cat.items) continue;
      expect(cat.href).toBe(cat.items[0].href);
    }
  });

  it("ne donne pas d'entrée de rail au tableau de bord", () => {
    // On y revient par la marque en tête de rail, comme un logo ramène à
    // l'accueil. Une entrée de plus l'aurait mis au rang des quatre
    // questions du dirigeant, alors qu'il y répond toutes.
    expect(rail().some((c) => c.id === "tableau")).toBe(false);
    expect(idsVisibles()).not.toContain("tableau");
  });

  it("donne à « Paramètres » un panneau, pour que rien n'y devienne inatteignable", () => {
    const parametres = rail().find((c) => c.id === "parametres");
    // Le panneau est né d'une régression : en devenant la page d'entrée de
    // « Paramètres », la fiche établissement avait pris la place de
    // « Connecter », qui n'était plus listé nulle part — atteignable
    // seulement en tapant son URL. Une entrée de rail qui déplace une page
    // sans lui en rendre une autre la supprime.
    expect(parametres?.items?.map((i) => i.id)).toEqual(["fiche", "connecter"]);
    expect(parametres?.href).toBe(`/etablissements/${ID}/modifier`);
    expect(idsVisibles()).toContain("connecter");
    expect(idsVisibles()).toContain("fiche");
    // La césure entre le dossier et son réglage est portée par la donnée,
    // pas devinée au rendu.
    expect(parametres?.separateurAvant).toBe(true);
  });

  it("rend le guide au panneau Documentation, sans lui donner d'entrée de rail", () => {
    // Il avait perdu son entrée de premier niveau en août, faute d'endroit
    // juste : une lecture n'est pas une des questions du dirigeant, et le
    // rang de rail la mettait au niveau d'un registre tenu. Sous
    // « Documentation », il est un document parmi ceux qui expliquent le
    // dossier — et il redevient atteignable sans passer par un autre écran.
    const cats = rail();
    expect(cats.map((c) => c.href)).not.toContain(
      `/etablissements/${ID}/guide`,
    );
    expect(idsVisibles()).toContain("guide");
    expect(categorieDeItem("guide")).toBe("documentation");
  });

  it("reprend exactement les items des sections", () => {
    const idsSections = construireSections({ etablissementId: ID }).flatMap(
      (s) => s.items.map((i) => i.id),
    );
    const idsRail = rail().flatMap((c) => (c.items ?? []).map((i) => i.id));
    expect(idsRail.sort()).toEqual(idsSections.sort());
  });

  it("agrège les alertes des items au niveau de la catégorie", () => {
    const cats = construireRail({
      etablissementId: ID,
      counts: { enRetardTotal: 2, prestatairesAlertes: 0 },
    });
    expect(cats.find((c) => c.id === "a-faire")?.alert).toBe(true);
    expect(cats.find((c) => c.id === "equipement-batiment")?.alert).toBe(
      false,
    );
  });

  it("rattache chaque item à la catégorie qui le contient", () => {
    for (const cat of rail()) {
      for (const it of cat.items ?? []) {
        expect(categorieDeItem(it.id)).toBe(cat.id);
      }
    }
    expect(categorieDeItem("tableau")).toBe("tableau");
    expect(categorieDeItem("connecter")).toBe("parametres");
    // Le guide est rattaché depuis l'ADR-030, et ce n'est plus une
    // approximation : il figure vraiment dans le panneau « Documentation ».
    // Il avait été délié en août parce qu'aucun axe ne le contenait — le
    // rattacher au voisin le plus proche allumait alors « Paramètres » sur un
    // écran qui n'en faisait pas partie. L'ADR-015 veut qu'une entrée de rail
    // désigne une page ; c'est désormais le cas.
    expect(categorieDeItem("guide")).toBe("documentation");
    // La fiche établissement, elle, quitte les panneaux pour « Paramètres »,
    // dont elle devient la page d'entrée.
    expect(categorieDeItem("fiche")).toBe("parametres");
  });
});

describe("construireSections — badges", () => {
  it("passe en alerte les compteurs de dette, pas les volumétries", () => {
    const items = construireSections({
      etablissementId: ID,
      counts: {
        equipements: 13,
        enRetardTotal: 5,
        prestatairesAlertes: 1,
        actions: 5,
      },
    }).flatMap((s) => s.items);

    const parId = (id: SidebarItemId) => items.find((i) => i.id === id);

    expect(parId("equipements")?.count).toBe(13);
    expect(parId("equipements")?.alert).toBeFalsy();
    expect(parId("actions")?.count).toBe(5);
    expect(parId("actions")?.alert).toBeFalsy();
    expect(parId("prestataires")).toMatchObject({ count: 1, alert: true });
  });

  it("donne au calendrier le retard de toutes les familles", () => {
    const items = construireSections({
      etablissementId: ID,
      counts: { enRetardTotal: 5 },
    }).flatMap((s) => s.items);

    expect(items.find((i) => i.id === "calendrier")).toMatchObject({
      count: 5,
      alert: true,
    });
  });

  it("n'affiche pas d'alerte quand les compteurs sont à zéro", () => {
    const items = construireSections({
      etablissementId: ID,
      counts: { enRetardTotal: 0, prestatairesAlertes: 0 },
    }).flatMap((s) => s.items);

    expect(items.find((i) => i.id === "calendrier")?.alert).toBe(false);
    expect(items.find((i) => i.id === "prestataires")?.alert).toBe(false);
  });
});

describe("construireSections — qualification des registres", () => {
  it("ne qualifie rien quand l'état des modules n'est pas fourni", () => {
    // Un appelant qui ne sait pas vaut mieux qu'une entrée qualifiée à tort :
    // on retombe exactement sur le comportement d'avant.
    expect(registres().every((i) => i.etat === undefined)).toBe(true);
  });

  it("laisse DUERP et registre de sécurité hors qualification", () => {
    // Tout employeur tient un DUERP ; le registre de sécurité reçoit les
    // rapports de n'importe quelle vérification. Rien à conditionner.
    expect(etatDe("duerp", MODULES_ERP_NEUF)).toBeUndefined();
    expect(etatDe("registre", MODULES_ERP_NEUF)).toBeUndefined();
  });

  it("rend l'accessibilité applicable dès que l'établissement est ERP", () => {
    // Même sans registre créé : c'est précisément ce qu'il reste à faire.
    expect(etatDe("accessibilite", MODULES_ERP_NEUF)).toBe("actif");
  });

  it("marque l'accessibilité non applicable hors ERP", () => {
    expect(
      etatDe("accessibilite", { ...MODULES_ERP_NEUF, estERP: false }),
    ).toBe("non-applicable");
  });

  it("laisse l'événementiel « non ouvert » tant qu'il est vide", () => {
    expect(etatDe("permis-feu", MODULES_ERP_NEUF)).toBe("non-ouvert");
    expect(etatDe("plan-prevention", MODULES_ERP_NEUF)).toBe("non-ouvert");
    expect(etatDe("carnet-sanitaire", MODULES_ERP_NEUF)).toBe("non-ouvert");
  });

  it("active un registre événementiel dès la première pièce", () => {
    const modules: SidebarModules = {
      estERP: true,
      nbPermisFeu: 1,
      nbPlansPrevention: 2,
      carnetSanitaireExiste: true,
    };
    expect(etatDe("permis-feu", modules)).toBe("actif");
    expect(etatDe("plan-prevention", modules)).toBe("actif");
    expect(etatDe("carnet-sanitaire", modules)).toBe("actif");
  });

  it("relègue le non applicable en fin de liste, dans l'axe qui le porte", () => {
    // Le tri ne concerne que les trois registres du lieu : le DUERP a rejoint
    // l'axe santé-sécurité et n'est plus dans le même ordonnancement.
    const ordre = equipementBatiment({ ...MODULES_ERP_NEUF, estERP: false })
      .map((i) => i.id)
      .filter((i) => IDS_REGISTRES.includes(i));
    expect(ordre).toEqual(["registre", "carnet-sanitaire", "accessibilite"]);
  });

  it("ne retire jamais un registre de la liste", () => {
    // Masquer rendrait le registre introuvable le jour où il devient
    // nécessaire — c'est ce qui avait fait retirer la divulgation progressive.
    const attendus = ["accessibilite", "carnet-sanitaire", "duerp", "registre"];
    const cas: Array<SidebarModules | undefined> = [
      MODULES_ERP_NEUF,
      { ...MODULES_ERP_NEUF, estERP: false },
      undefined,
    ];
    for (const modules of cas) {
      expect(
        registres(modules)
          .map((i) => i.id)
          .sort(),
      ).toEqual(attendus);
    }
  });

  it("garde une destination réelle pour un registre non applicable", () => {
    // L'entrée reste un lien : la page explique, et permet de corriger le
    // régime déclaré si c'est la déclaration qui était fausse.
    const accessibilite = registres({
      ...MODULES_ERP_NEUF,
      estERP: false,
    }).find((i) => i.id === "accessibilite");
    expect(accessibilite?.href).toBe(`/etablissements/${ID}/accessibilite`);
    expect(accessibilite?.bientot).toBeFalsy();
  });

  it("propage la qualification jusqu'au panneau du rail", () => {
    const panneau = construireRail({
      etablissementId: ID,
      modules: { ...MODULES_ERP_NEUF, estERP: false },
    }).find((c) => c.id === "equipement-batiment");
    expect(panneau?.items?.find((i) => i.id === "accessibilite")?.etat).toBe(
      "non-applicable",
    );
  });
});
