import { describe, expect, it } from "vitest";
import { construireBrief, type EntreeBrief } from "./brief";
import { repartirRetards } from "@/lib/calendrier/retards";
import {
  FAMILLE_DE_TYPE,
  TYPES_VERIFICATION,
  type EcheanceCalendrier,
  type FamilleEcheance,
  type TypeEcheance,
  type TypeVerification,
} from "@/lib/calendrier/echeances";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";
import {
  porteursComptesPar,
  porteursDuReferentiel,
  type LigneSondee,
} from "@/lib/perimetre/porteurs-comptes";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE TITRE DU HERO A LE DROIT DE DIRE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT. Le titre écrivait « Onze échéances à traiter CETTE SEMAINE »
 * au-dessus d'un relevé « DÉPASSÉES · 11 » posé soixante pixels plus bas. Même
 * nombre, deux fois — et une semaine qui n'existe nulle part dans le calcul :
 * le calendrier montrait ces onze-là étalées sur quatre mois (1 + 1 + 2 + 7 de
 * mai à août). Constat N2 du contrôle visuel du 2026-09-02, resté ouvert.
 *
 * CE QUE CETTE GARDE FAIT, ET POURQUOI ELLE NE PEUT PAS SE RÉPARER EN
 * RECOPIANT. Elle ne relit pas la phrase : elle fait TOURNER le compteur que la
 * phrase coiffe, sur les cas mêmes que la phrase excluait, et regarde ce qui en
 * ressort. Une occurrence de quatre mois, une d'hier, les cinq familles, les
 * trois porteurs. Le jour où quelqu'un pose une fenêtre de temps sur ce
 * compteur — la « semaine » que le titre annonçait —, elle tombe ; le jour où
 * quelqu'un remet un délai dans le titre sans toucher au calcul, elle tombe
 * aussi.
 *
 * Elle est le pendant de `porteurs-comptes.test.ts` pour le seul compteur que
 * ce module-là ne pouvait pas sonder, faute d'écran à qui poser la question.
 */

const AUJOURDHUI = new Date("2026-09-04T09:00:00Z");

/**
 * Une famille, et un type d'échéance qui y tombe — dérivés de `FAMILLE_DE_TYPE`
 * et jamais recopiés.
 *
 * Une liste écrite ici se réparerait en recopiant la liste d'à côté, et
 * cesserait donc de vérifier quoi que ce soit : la sixième famille qui naîtrait
 * sans que le titre la compte passerait inaperçue. Le type est pris avec elle
 * parce qu'une sonde dont le type et la famille se contredisent n'est pas une
 * ligne que le produit peut produire.
 */
const TYPE_PAR_FAMILLE = new Map<FamilleEcheance, TypeEcheance>();
for (const [type, famille] of Object.entries(FAMILLE_DE_TYPE) as [
  TypeEcheance,
  FamilleEcheance,
][]) {
  if (!TYPE_PAR_FAMILLE.has(famille)) TYPE_PAR_FAMILLE.set(famille, type);
}
const FAMILLES = [...TYPE_PAR_FAMILLE.keys()];

function ventil(parts: Partial<Record<FamilleEcheance, number>> = {}) {
  const parFamille = Object.fromEntries(
    FAMILLES.map((f) => [f, parts[f] ?? 0]),
  ) as Record<FamilleEcheance, number>;
  return {
    parFamille,
    total: FAMILLES.reduce((n, f) => n + parFamille[f], 0),
  };
}

const AUCUNE_VERIF = Object.fromEntries(
  TYPES_VERIFICATION.map((t) => [t, 0]),
) as Record<TypeVerification, number>;

/** Une échéance du registre, dépassée, à la date qu'on lui donne. */
function depassee(famille: FamilleEcheance, iso: string): EcheanceCalendrier {
  return {
    id: `sonde-${famille}-${iso}`,
    type: TYPE_PAR_FAMILLE.get(famille)!,
    famille,
    libelle: "Sonde de titre",
    origine: "",
    date: new Date(`${iso}T00:00:00.000Z`),
    tone: "alerte",
    href: "#",
    batiment: null,
  };
}

const CALME: EntreeBrief = {
  aujourdhui: AUJOURDHUI,
  retards: ventil(),
  sous30j: ventil(),
  verifsAPlanifier: 0,
  verifsEnRetardSansEcheance: 0,
  duerp: { existe: true, estAJour: true },
  recommandations: [],
  nbRapports: 0,
};

describe("le compteur que le titre coiffe", () => {
  it("ne borne rien par le bas : une occurrence de quatre mois pèse comme celle d'hier", () => {
    // C'est LE fait que « cette semaine » démentait. Si une fenêtre de temps
    // apparaissait un jour ici, ce test tomberait — et le titre redeviendrait
    // libre de nommer un délai.
    const vieille = repartirRetards(
      [depassee("controle", "2026-05-04")],
      AUCUNE_VERIF,
    );
    const recente = repartirRetards(
      [depassee("controle", "2026-09-03")],
      AUCUNE_VERIF,
    );
    expect(vieille.total).toBe(1);
    expect(recente.total).toBe(1);

    // Et les deux ensemble, pour que le titre ne puisse pas non plus en
    // retenir une seule.
    const ensemble = repartirRetards(
      [depassee("controle", "2026-05-04"), depassee("controle", "2026-09-03")],
      AUCUNE_VERIF,
    );
    expect(ensemble.total).toBe(2);
  });

  it("réunit les cinq familles, pas une de moins", () => {
    const r = repartirRetards(
      FAMILLES.map((f) => depassee(f, "2026-06-01")),
      AUCUNE_VERIF,
    );
    // Borne haute — le total les prend toutes.
    expect(r.total).toBe(FAMILLES.length);
    // Borne basse — aucune n'est comptée deux fois.
    for (const f of FAMILLES) expect(r.parFamille[f]).toBe(1);
  });

  it("compte les trois porteurs, là où le parc n'en compte qu'un", () => {
    // Mesuré, pas déclaré : on passe une ligne par porteur à l'agrégation qui
    // alimente le compteur (`repartirVerifications`, le pendant pur de la
    // lecture Prisma du tableau de bord) et on regarde lesquelles ressortent.
    // C'est le geste de `perimetre/porteurs-comptes.ts`, appliqué au seul
    // compteur du produit qui ne laisse personne dehors.
    const comptes = porteursComptesPar(
      (lignes: LigneSondee[]) =>
        repartirVerifications(lignes, AUJOURDHUI).enRetard.length,
      AUJOURDHUI,
    );
    expect([...comptes].sort()).toEqual([...porteursDuReferentiel()].sort());
    expect(comptes.size).toBeGreaterThan(1);
  });
});

describe("le titre dit ce que le compteur compte", () => {
  it("nomme le dépassement d'une date, et aucun délai", () => {
    const b = construireBrief({ ...CALME, retards: ventil({ controle: 11 }) });
    expect(b.titre).toBe("11 échéances ont dépassé leur date");
  });

  it("n'annonce aucune fenêtre de temps que le compteur ne mesure pas", () => {
    // La liste n'est pas exhaustive et n'a pas à l'être : elle nomme les unités
    // qu'un compteur SANS fenêtre ne peut pas revendiquer. « trente jours »
    // n'y figure pas — c'est le titre de l'autre branche, et celui-là mesure
    // bien une fenêtre.
    const interdits = ["semaine", "aujourd'hui", "ce mois", "ce jour"];
    for (const n of [1, 2, 9, 11, 40]) {
      const titre = construireBrief({
        ...CALME,
        retards: ventil({ controle: n }),
      }).titre;
      for (const mot of interdits) {
        expect(
          titre.toLowerCase().includes(mot),
          `« ${titre} » annonce « ${mot} » sur un compteur qui n'a pas de fenêtre.`,
        ).toBe(false);
      }
    }
  });

  it("accorde les deux mots que le singulier change", () => {
    // « Une échéance a dépassé SA date » / « Deux échéances ont dépassé LEUR
    // date » : le verbe et le possessif, pas seulement le « s ».
    expect(
      construireBrief({ ...CALME, retards: ventil({ controle: 1 }) }).titre,
    ).toBe("Une échéance a dépassé sa date");
    expect(
      construireBrief({ ...CALME, retards: ventil({ controle: 2 }) }).titre,
    ).toBe("Deux échéances ont dépassé leur date");
  });

  it("le dossier calme n'annonce plus une semaine pour une mesure de trente jours", () => {
    // La branche n'est atteinte que si `retards`, `sous30j` et
    // `verifsAPlanifier` sont tous à zéro : ce que le brief sait alors couvre
    // trente jours, et il l'annonçait en semaines.
    expect(construireBrief(CALME).titre).toBe(
      "Rien ne presse dans les trente jours",
    );
  });
});
