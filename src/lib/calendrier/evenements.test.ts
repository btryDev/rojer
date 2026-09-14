import { describe, expect, it } from "vitest";
import { fusionnerEvenements } from "./evenements";
import type { EcheanceCalendrier } from "./echeances";
import type { EvenementFenetre } from "@/lib/dashboard/queries";

const ETAB = "etab-1";

/** Date civile telle que Prisma la rend : minuit UTC (ADR-011). Écrire
 *  `new Date(2026, 6, j)` ferait dépendre le tri et les regroupements du
 *  fuseau du processus de test. */
const jour = (j: number) =>
  new Date(`2026-07-${String(j).padStart(2, "0")}T00:00:00.000Z`);

const BAT_A = { id: "bat-a", nom: "Bâtiment principal" };
const BAT_B = { id: "bat-b", nom: "Réserve" };

function verif(
  id: string,
  j: number,
  tone: EvenementFenetre["tone"] = "ok",
  batiment: EvenementFenetre["batiment"] = BAT_A,
): EvenementFenetre {
  return {
    id,
    libelle: `Vérification ${id}`,
    date: jour(j),
    tone,
    // Une échéance connue par défaut ; le cas contraire a son test.
    sansEcheance: false,
    type: "verification",
    contractuelle: false,
    equipement: "Tableau électrique",
    batiment,
  };
}

/** Une ligne du même flux, mais portée par une personne (ADR-023). Elle
 *  n'a pas de bâtiment : une échéance de salarié n'a pas de lieu (§ 7). */
function titre(
  id: string,
  j: number,
  tone: EvenementFenetre["tone"] = "ok",
): EvenementFenetre {
  return {
    id,
    libelle: `Attestation ${id}`,
    date: jour(j),
    tone,
    sansEcheance: false,
    type: "titre-salarie",
    contractuelle: false,
    equipement: "Camille Roy",
    batiment: null,
  };
}

function autre(
  id: string,
  j: number,
  famille: EcheanceCalendrier["famille"],
  tone: EcheanceCalendrier["tone"] = "alerte",
): EcheanceCalendrier {
  return {
    id,
    // La famille est ce que le test pilote ; le type n'a qu'à être cohérent.
    type: famille === "controle" ? "verification" : "action-duerp",
    famille,
    libelle: `Échéance ${id}`,
    origine: "Origine lisible",
    date: jour(j),
    tone,
    href: `/etablissements/${ETAB}/actions/${id}`,
    batiment: null,
  };
}

const fusion = (
  verifications: EvenementFenetre[],
  autres: EcheanceCalendrier[],
  filtres = {},
) =>
  fusionnerEvenements({
    verifications,
    autres,
    etablissementId: ETAB,
    filtres,
  });

describe("fusionnerEvenements — assemblage", () => {
  it("réunit vérifications et registre dans un seul flux trié par date", () => {
    const out = fusion(
      [verif("v1", 20)],
      [autre("action-a1", 5, "travaux"), autre("duerp-maj", 28, "papiers")],
    );
    expect(out.map((e) => e.id)).toEqual(["action-a1", "v1", "duerp-maj"]);
  });

  it("donne aux vérifications la famille contrôle et leur porte de sortie", () => {
    const [e] = fusion([verif("v1", 20)], []);
    expect(e.famille).toBe("controle");
    expect(e.href).toBe(`/etablissements/${ETAB}/verifications/v1`);
  });

  it("reporte la porte et la famille du registre, et son origine en sous-titre", () => {
    const [e] = fusion([], [autre("action-a1", 5, "travaux")]);
    expect(e.famille).toBe("travaux");
    expect(e.href).toBe(`/etablissements/${ETAB}/actions/action-a1`);
    // La grille lit `equipement` sous le libellé : pour une échéance du
    // registre, c'est l'origine qui s'y affiche.
    expect(e.equipement).toBe("Origine lisible");
  });

  it("écarte les vérifications à planifier — leur date n'est pas choisie", () => {
    const out = fusion([verif("v1", 20, "warn"), verif("v2", 22)], []);
    expect(out.map((e) => e.id)).toEqual(["v2"]);
  });

  it("écarte aussi une vérification SANS ÉCHÉANCE en retard — ton alerte compris", () => {
    // Relecture du lot C (2026-09-14) : le filtre ne lisait que le ton
    // `warn`, et une « à planifier » en retard (ton `alerte`) passait — la
    // frise la posait sur sa date de génération. Une vraie échéance en retard,
    // elle, reste posée.
    const sansDate = { ...verif("v-generee", -13, "alerte"), sansEcheance: true };
    const out = fusion([sansDate, verif("v-retard", -20, "alerte")], []);
    expect(out.map((e) => e.id)).toEqual(["v-retard"]);
  });

  it("garde les retards du registre : c'est ce que le board taisait", () => {
    const out = fusion(
      [],
      [
        autre("permis-feu-p1", 3, "travaux", "alerte"),
        autre("prestataire-x-urssaf", 9, "papiers", "alerte"),
      ],
    );
    expect(out).toHaveLength(2);
    expect(out.every((e) => e.tone === "alerte")).toBe(true);
  });
});

describe("fusionnerEvenements — filtres", () => {
  it("une famille choisie écarte toutes les autres", () => {
    const out = fusion(
      [verif("v1", 20)],
      [autre("action-a1", 5, "travaux"), autre("duerp-maj", 28, "papiers")],
      { famille: "papiers" },
    );
    expect(out.map((e) => e.id)).toEqual(["duerp-maj"]);
  });

  it("la famille contrôle garde les vérifications et les contrôles du registre", () => {
    const out = fusion(
      [verif("v1", 20)],
      [autre("legionelles-analyse", 6, "controle"), autre("a1", 7, "travaux")],
      { famille: "controle" },
    );
    expect(out.map((e) => e.id)).toEqual(["legionelles-analyse", "v1"]);
  });

  it("donne au titre d'un salarié la famille personnel, pas contrôle", () => {
    const [e] = fusion([titre("t1", 20)], []);
    expect(e.type).toBe("titre-salarie");
    expect(e.famille).toBe("personnel");
    expect(e.href).toBe(`/etablissements/${ETAB}/verifications/t1`);
  });

  it("« Personnel » retient les titres — le flux des vérifications n'est plus jeté en bloc", () => {
    // Le défaut d'origine : `famille !== "controle" ? [] : …` écartait tout
    // le flux. Un titre de salarié était donc visible sous « Tout »,
    // introuvable sous « Personnel », et compté dans « Vérifications ».
    const out = fusion(
      [verif("v1", 20), titre("t1", 21)],
      [autre("a1", 7, "travaux")],
      { famille: "personnel" },
    );
    expect(out.map((e) => e.id)).toEqual(["t1"]);
  });

  it("« Vérifications » n'attrape plus les titres de salariés", () => {
    const out = fusion([verif("v1", 20), titre("t1", 21)], [], {
      famille: "controle",
    });
    expect(out.map((e) => e.id)).toEqual(["v1"]);
  });

  it("sans filtre de famille, les deux natures du flux restent", () => {
    const out = fusion([verif("v1", 20), titre("t1", 21)], []);
    expect(out.map((e) => e.id)).toEqual(["v1", "t1"]);
  });

  it("un domaine ne qualifie que les contrôles : le registre sort", () => {
    // Le filtrage par domaine des vérifications est fait en amont par la
    // requête — ici il ne reste qu'à écarter les autres familles.
    const out = fusion([verif("v1", 20)], [autre("action-a1", 5, "travaux")], {
      domaine: "electricite",
    });
    expect(out.map((e) => e.id)).toEqual(["v1"]);
  });

  it("l'urgence ne garde que le dépassé, registre compris", () => {
    const out = fusion(
      [verif("v1", 20, "alerte")],
      [autre("a1", 5, "travaux", "ok"), autre("a2", 6, "travaux", "alerte")],
      { urgentsSeulement: true },
    );
    expect(out.map((e) => e.id)).toEqual(["a2", "v1"]);
  });
});

describe("fusionnerEvenements — bâtiment (ADR-019)", () => {
  it("garde le bâtiment choisi ET ce qui concerne tout l'établissement", () => {
    const duerp = { ...autre("duerp", 3, "papiers", "ok"), batiment: null };
    const permisB = {
      ...autre("permis-b", 4, "operations", "ok"),
      batiment: BAT_B,
    };
    const out = fusion(
      [verif("v-a", 10, "ok", BAT_A), verif("v-b", 11, "ok", BAT_B)],
      [duerp, permisB],
      { batimentId: BAT_B.id },
    );
    // v-a sort ; la mise à jour du DUERP (sans bâtiment) reste : la masquer
    // ferait croire qu'il n'y a rien à faire dans la Réserve ce mois-là.
    expect(out.map((e) => e.id)).toEqual(["duerp", "permis-b", "v-b"]);
  });

  it("sans filtre, tout passe et le bâtiment descend jusqu'à la grille", () => {
    const out = fusion([verif("v-a", 10, "ok", BAT_A)], [
      { ...autre("a1", 5, "travaux"), batiment: null },
    ]);
    expect(out.find((e) => e.id === "v-a")?.batiment).toEqual(BAT_A);
    expect(out.find((e) => e.id === "a1")?.batiment).toBeNull();
  });
});
