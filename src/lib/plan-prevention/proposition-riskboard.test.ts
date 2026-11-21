import { describe, expect, it } from "vitest";
import { bandeauDeLaProposition } from "./bandeau-proposition";
import {
  aucunEcart,
  ecartsDeLaProposition,
  famillesAAppliquer,
  lireProposition,
  type PlanComparable,
} from "./proposition";

/**
 * La proposition de l'entreprise extérieure et les champs repris de RiskBoard
 * (2026-11-21) : son adresse et son téléphone, le lieu et la fréquence de
 * chaque risque se proposent et se lisent dans les écarts ; une proposition
 * enregistrée AVANT, qui ne les porte pas, se lit encore et ne change rien.
 */

const plan: PlanComparable = {
  entrepriseExterieureRaison: "Toitures Martin",
  entrepriseExterieureSiret: null,
  efChefNom: "Paul Martin",
  efEffectifIntervenant: 2,
  entrepriseExterieureAdresse: "1 rue des Lilas, Lyon",
  efChefTelephone: null,
  lignes: [
    {
      id: "l1",
      risque: "Chutes en hauteur",
      mesureEntrepriseUtilisatrice: "Accès balisé",
      mesureEntrepriseExterieure: "Harnais",
      famille: "CHUTES_HAUTEUR",
      lieu: "Toiture",
      frequence: null,
    },
  ],
};

const ids = new Set(["l1"]);

const lire = (contenu: unknown) => {
  const r = lireProposition(JSON.stringify(contenu), ids);
  if (!r.ok) throw new Error(r.message);
  return r.proposition;
};

const ficheDuPlan = {
  entrepriseExterieureRaison: "Toitures Martin",
  entrepriseExterieureSiret: null,
  efChefNom: "Paul Martin",
  efEffectifIntervenant: 2,
};

describe("une proposition d'avant le 2026-11-21, sans les champs neufs", () => {
  const ancienne = {
    fiche: ficheDuPlan,
    lignes: [
      { id: "l1", risque: "Chutes en hauteur", mesureEntrepriseUtilisatrice: "Accès balisé", mesureEntrepriseExterieure: "Harnais" },
    ],
  };

  it("se lit encore", () => {
    expect(() => lire(ancienne)).not.toThrow();
  });

  it("ne propose pas d'effacer l'adresse que le plan porte", () => {
    const p = lire(ancienne);
    expect(p.fiche.entrepriseExterieureAdresse).toBeUndefined();
    expect(ecartsDeLaProposition(plan, p).fiche).toEqual([]);
  });
});

describe("une proposition qui touche aux champs neufs", () => {
  it("le téléphone et l'adresse proposés sont des écarts de la fiche", () => {
    const p = lire({
      fiche: { ...ficheDuPlan, efChefTelephone: "06 00 00 00 00", entrepriseExterieureAdresse: "" },
      lignes: [
        {
          id: "l1",
          risque: "Chutes en hauteur",
          mesureEntrepriseUtilisatrice: "Accès balisé",
          mesureEntrepriseExterieure: "Harnais",
          famille: "CHUTES_HAUTEUR",
          lieu: "Toiture",
          frequence: "",
        },
      ],
    });
    const e = ecartsDeLaProposition(plan, p);
    expect(e.fiche.map((c) => [c.champ, c.avant, c.apres])).toEqual([
      ["entrepriseExterieureAdresse", "1 rue des Lilas, Lyon", ""],
      ["efChefTelephone", "", "06 00 00 00 00"],
    ]);
    expect(e.modifiees).toEqual([]);
  });

  it("le lieu et la fréquence d'un risque changés le rendent modifié, et le bandeau le dit", () => {
    const p = lire({
      fiche: ficheDuPlan,
      lignes: [
        {
          id: "l1",
          risque: "Chutes en hauteur",
          mesureEntrepriseUtilisatrice: "Accès balisé",
          mesureEntrepriseExterieure: "Harnais",
          famille: "CHUTES_HAUTEUR",
          lieu: "Toiture et façade",
          frequence: "Chaque matin",
        },
      ],
    });
    expect(ecartsDeLaProposition(plan, p).modifiees).toHaveLength(1);
    const m = bandeauDeLaProposition(plan, p).find((l) => l.type === "modifie");
    expect(m).toMatchObject({
      changements: {
        risque: null,
        eu: null,
        ee: null,
        lieu: { avant: "Toiture", apres: "Toiture et façade" },
        frequence: { avant: "", apres: "Chaque matin" },
      },
    });
  });

  it("une proposition qui reporte la ligne telle quelle ne change rien", () => {
    const p = lire({
      fiche: { ...ficheDuPlan, entrepriseExterieureAdresse: "1 rue des Lilas, Lyon", efChefTelephone: "" },
      lignes: [
        {
          id: "l1",
          risque: "Chutes en hauteur",
          mesureEntrepriseUtilisatrice: "Accès balisé",
          mesureEntrepriseExterieure: "Harnais",
          famille: "CHUTES_HAUTEUR",
          lieu: "Toiture",
          frequence: "",
        },
      ],
    });
    expect(aucunEcart(ecartsDeLaProposition(plan, p))).toBe(true);
  });

  const ligne1 = {
    id: "l1",
    risque: "Chutes en hauteur",
    mesureEntrepriseUtilisatrice: "Accès balisé",
    mesureEntrepriseExterieure: "Harnais",
    lieu: "Toiture",
    frequence: "",
  };

  it("la famille se propose : changée, c'est un écart, et le bandeau le montre", () => {
    const p = lire({
      fiche: ficheDuPlan,
      lignes: [
        { ...ligne1, famille: "AMIANTE" },
        { risque: "Poussières", mesureEntrepriseUtilisatrice: "", mesureEntrepriseExterieure: "", famille: "BIOLOGIQUE" },
      ],
    });
    const e = ecartsDeLaProposition(plan, p);
    expect([e.modifiees.length, e.ajoutees.length]).toEqual([1, 1]);
    const b = bandeauDeLaProposition(plan, p);
    expect(b.find((l) => l.type === "modifie")).toMatchObject({
      changements: { famille: { avant: "Chutes en hauteur", apres: "Amiante" }, risque: null, lieu: null },
    });
    expect(b.find((l) => l.type === "ajoute")).toMatchObject({ famille: "Biologique" });
    // À l'acceptation : la famille proposée.
    expect(famillesAAppliquer(plan.lignes, p.lignes)).toEqual(["AMIANTE", "BIOLOGIQUE"]);
  });

  it("« sans famille » se propose aussi, et se voit", () => {
    const p = lire({ fiche: ficheDuPlan, lignes: [{ ...ligne1, famille: null }] });
    const m = bandeauDeLaProposition(plan, p).find((l) => l.type === "modifie");
    expect(m).toMatchObject({ changements: { famille: { avant: "Chutes en hauteur", apres: "" } } });
    expect(famillesAAppliquer(plan.lignes, p.lignes)).toEqual([null]);
  });

  it("une proposition sans la clé famille (d'avant ce lot) garde celle du plan, sans écart", () => {
    const p = lire({ fiche: ficheDuPlan, lignes: [ligne1] });
    expect(aucunEcart(ecartsDeLaProposition(plan, p))).toBe(true);
    expect(famillesAAppliquer(plan.lignes, p.lignes)).toEqual(["CHUTES_HAUTEUR"]);
  });

  it("une famille hors de la liste est refusée", () => {
    const r = lireProposition(
      JSON.stringify({ fiche: ficheDuPlan, lignes: [{ ...ligne1, famille: "INVENTEE" }] }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it("une ligne ajoutée montre son lieu et sa fréquence au dirigeant", () => {
    const p = lire({
      fiche: ficheDuPlan,
      lignes: [
        ...plan.lignes.map(({ id, risque, mesureEntrepriseUtilisatrice, mesureEntrepriseExterieure, lieu }) => ({
          id,
          risque,
          mesureEntrepriseUtilisatrice,
          mesureEntrepriseExterieure,
          lieu,
        })),
        { risque: "Poussières", mesureEntrepriseUtilisatrice: "", mesureEntrepriseExterieure: "", lieu: "Réserve", frequence: "Le matin" },
      ],
    });
    const ajout = bandeauDeLaProposition(plan, p).find((l) => l.type === "ajoute");
    expect(ajout).toMatchObject({ risque: "Poussières", lieu: "Réserve", frequence: "Le matin" });
  });
});
