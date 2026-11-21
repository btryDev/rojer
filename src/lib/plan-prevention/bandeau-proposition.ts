import { ecartsDeLaProposition, type PlanComparable, type Proposition } from "./proposition";

/**
 * Le plan tel qu'il deviendrait si le dirigeant acceptait la proposition
 * (2026-11-19, lot 4, maquette V2 « Bandeau ») : les champs de la fiche de
 * l'entreprise extérieure qui changent, puis les risques dans l'ordre
 * proposé — inchangés, modifiés, ajoutés —, puis ceux qui disparaîtraient.
 * Module pur, sur `ecartsDeLaProposition`, qui reste le seul juge d'un écart.
 */

export type Changement = { avant: string; apres: string } | null;

export type LigneBandeau =
  | { type: "fiche"; cle: string; libelle: string; avant: string; apres: string }
  | { type: "inchange"; cle: string; numero: number; risque: string; eu: string; ee: string }
  | {
      type: "modifie";
      cle: string;
      numero: number;
      risque: string;
      /** Ce qui change, champ par champ ; `null` : inchangé. */
      changements: { risque: Changement; eu: Changement; ee: Changement };
      eu: string;
      ee: string;
    }
  | { type: "ajoute"; cle: string; risque: string; eu: string; ee: string }
  | { type: "supprime"; cle: string; risque: string };

export type Bandeau = {
  lignes: LigneBandeau[];
  modifies: number;
  ajoutes: number;
  supprimes: number;
};

const texte = (v: string | null | undefined) => (v ?? "").trim();
const changement = (avant: string | null | undefined, apres: string | null | undefined): Changement =>
  texte(avant) === texte(apres) ? null : { avant: texte(avant), apres: texte(apres) };

export function bandeauDeLaProposition(plan: PlanComparable, p: Proposition): Bandeau {
  const e = ecartsDeLaProposition(plan, p);
  const modifiees = new Map(e.modifiees.map((m) => [m.avant.id, m]));
  const parId = new Map(plan.lignes.map((l) => [l.id, l]));
  const lignes: LigneBandeau[] = e.fiche.map((c) => ({
    type: "fiche",
    cle: `fiche-${c.champ}`,
    libelle: c.libelle,
    avant: c.avant,
    apres: c.apres,
  }));
  p.lignes.forEach((l, i) => {
    const numero = i + 1;
    const eu = texte(l.mesureEntrepriseUtilisatrice);
    const ee = texte(l.mesureEntrepriseExterieure);
    const avant = l.id ? parId.get(l.id) : undefined;
    if (!avant) {
      lignes.push({ type: "ajoute", cle: `ajout-${i}`, risque: texte(l.risque), eu, ee });
      return;
    }
    const m = modifiees.get(avant.id);
    if (!m) {
      lignes.push({ type: "inchange", cle: avant.id, numero, risque: texte(l.risque), eu, ee });
      return;
    }
    lignes.push({
      type: "modifie",
      cle: avant.id,
      numero,
      risque: texte(l.risque),
      eu,
      ee,
      changements: {
        risque: changement(avant.risque, l.risque),
        eu: changement(avant.mesureEntrepriseUtilisatrice, l.mesureEntrepriseUtilisatrice),
        ee: changement(avant.mesureEntrepriseExterieure, l.mesureEntrepriseExterieure),
      },
    });
  });
  for (const s of e.supprimees) lignes.push({ type: "supprime", cle: `suppr-${s.id}`, risque: texte(s.risque) });
  return {
    lignes,
    modifies: e.fiche.length + e.modifiees.length,
    ajoutes: e.ajoutees.length,
    supprimes: e.supprimees.length,
  };
}
