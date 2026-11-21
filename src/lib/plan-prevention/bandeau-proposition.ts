import { ecartsDeLaProposition, type PlanComparable, type Proposition } from "./proposition";
import { libelleFamille } from "./familles-risque";

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
      changements: {
        risque: Changement;
        eu: Changement;
        ee: Changement;
        lieu: Changement;
        frequence: Changement;
        famille: Changement;
      };
      eu: string;
      ee: string;
      /** Repris de RiskBoard (2026-11-21) ; vides : rien ne s'affiche. */
      lieu: string;
      frequence: string;
      /** Le libellé de la famille après acceptation ; vide : sans famille. */
      famille: string;
    }
  | {
      type: "ajoute";
      cle: string;
      risque: string;
      eu: string;
      ee: string;
      lieu: string;
      frequence: string;
      famille: string;
    }
  | { type: "supprime"; cle: string; risque: string };

export type Bandeau = {
  lignes: LigneBandeau[];
  modifies: number;
  ajoutes: number;
  supprimes: number;
};

const texte = (v: string | null | undefined) => (v ?? "").trim();
/** Le libellé d'une famille (`null` : sans famille, vide). */
const famille = (code: string | null | undefined) => (code ? libelleFamille(code) : "");
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
      lignes.push({
        type: "ajoute",
        cle: `ajout-${i}`,
        risque: texte(l.risque),
        eu,
        ee,
        // Écrits à l'acceptation : le dirigeant les lit avant de décider.
        lieu: texte(l.lieu),
        frequence: texte(l.frequence),
        famille: famille(l.famille),
      });
      return;
    }
    const m = modifiees.get(avant.id);
    if (!m) {
      lignes.push({ type: "inchange", cle: avant.id, numero, risque: texte(l.risque), eu, ee });
      return;
    }
    // Une famille absente de la proposition (d'avant le 2026-11-21) n'est
    // pas proposée : la ligne garde celle du plan, et rien ne change.
    const familleApres = l.famille === undefined ? avant.famille : l.famille;
    lignes.push({
      type: "modifie",
      cle: avant.id,
      numero,
      risque: texte(l.risque),
      eu,
      ee,
      lieu: texte(l.lieu),
      frequence: texte(l.frequence),
      famille: famille(familleApres),
      changements: {
        // UN ÉCART NE SE CACHE PAS : une famille changée se lit au bandeau,
        // comme le reste, avant que le dirigeant ne décide.
        famille: changement(famille(avant.famille), famille(familleApres)),
        risque: changement(avant.risque, l.risque),
        eu: changement(avant.mesureEntrepriseUtilisatrice, l.mesureEntrepriseUtilisatrice),
        ee: changement(avant.mesureEntrepriseExterieure, l.mesureEntrepriseExterieure),
        lieu: changement(avant.lieu, l.lieu),
        frequence: changement(avant.frequence, l.frequence),
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
