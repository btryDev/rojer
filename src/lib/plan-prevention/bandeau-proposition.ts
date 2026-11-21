import { ecartsDeLaProposition, type PlanComparable, type Proposition } from "./proposition";
import { libelleFamille } from "./familles-risque";

/**
 * Ce que la proposition de l'entreprise extérieure changerait au plan, si le
 * dirigeant l'acceptait. Module pur, sur `ecartsDeLaProposition`, qui reste
 * le seul juge d'un écart.
 *
 * ~~(2026-11-19, lot 4, maquette V2 « Bandeau ») Le plan tel qu'il
 * deviendrait : les champs de la fiche, puis les risques dans l'ordre proposé
 * — inchangés, modifiés, ajoutés —, puis ceux qui disparaîtraient, avec leurs
 * comptes.~~ [2026-11-21, maquette « Bloc Suivi » validée : un tableau, une
 * ligne par écart (`lignesDEcart`). Les risques inchangés et les comptes
 * n'avaient plus de lecteur ; un risque se désigne par son nom, pas par un
 * rang qui diverge de l'onglet « Le plan » dès qu'un risque est ajouté ou
 * supprimé plus haut.]
 */

export type Changement = { avant: string; apres: string } | null;

export type LigneBandeau =
  | { type: "fiche"; cle: string; libelle: string; avant: string; apres: string }
  | {
      type: "modifie";
      cle: string;
      /** Le nom du risque au plan aujourd'hui : ce que l'onglet « Le plan » montre. */
      nom: string;
      /** Ce qui change, champ par champ ; `null` : inchangé. */
      changements: {
        risque: Changement;
        eu: Changement;
        ee: Changement;
        lieu: Changement;
        frequence: Changement;
        famille: Changement;
      };
    }
  | {
      type: "ajoute";
      cle: string;
      risque: string;
      eu: string;
      ee: string;
      /** Écrits à l'acceptation : le dirigeant les lit avant de décider. */
      lieu: string;
      frequence: string;
      /** Le libellé de la famille ; vide : sans famille. */
      famille: string;
    }
  | { type: "supprime"; cle: string; risque: string };

const texte = (v: string | null | undefined) => (v ?? "").trim();
/** Le libellé d'une famille (`null` : sans famille, vide). */
const famille = (code: string | null | undefined) => (code ? libelleFamille(code) : "");
const changement = (avant: string | null | undefined, apres: string | null | undefined): Changement =>
  texte(avant) === texte(apres) ? null : { avant: texte(avant), apres: texte(apres) };

export function bandeauDeLaProposition(plan: PlanComparable, p: Proposition): LigneBandeau[] {
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
    const avant = l.id ? parId.get(l.id) : undefined;
    if (!avant) {
      lignes.push({
        type: "ajoute",
        cle: `ajout-${i}`,
        risque: texte(l.risque),
        eu: texte(l.mesureEntrepriseUtilisatrice),
        ee: texte(l.mesureEntrepriseExterieure),
        lieu: texte(l.lieu),
        frequence: texte(l.frequence),
        famille: famille(l.famille),
      });
      return;
    }
    if (!modifiees.has(avant.id)) return;
    // Une famille absente de la proposition (d'avant le 2026-11-21) n'est
    // pas proposée : la ligne garde celle du plan, et rien ne change.
    const familleApres = l.famille === undefined ? avant.famille : l.famille;
    lignes.push({
      type: "modifie",
      cle: avant.id,
      nom: texte(avant.risque),
      changements: {
        // UN ÉCART NE SE CACHE PAS : une famille changée se lit au tableau,
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
  return lignes;
}

/**
 * Le tableau de la carte « À décider » (2026-11-21, maquette « Bloc Suivi »
 * validée) : une ligne par écart — « Ce qui change », « Aujourd'hui »,
 * « Proposé ». Un champ de la fiche ; chaque champ changé d'un risque,
 * désigné par son nom ; un risque ajouté, avec ce qu'il porte (`details`) ;
 * un risque supprimé.
 */
export type LigneEcart = {
  cle: string;
  quoi: string;
  /** Vide : rien aujourd'hui (risque ajouté). */
  avant: string;
  /** « Supprimé » pour un risque qui disparaîtrait. */
  apres: string;
  /** Sous « Proposé », pour un risque ajouté : ses champs remplis. */
  details: string[];
  genre: "modifie" | "ajoute" | "supprime";
};

const CHAMPS_RISQUE = [
  ["risque", "intitulé"],
  ["famille", "famille"],
  ["lieu", "lieu"],
  ["frequence", "fréquence"],
  ["eu", "votre mesure"],
  ["ee", "sa mesure"],
] as const;

const guillemets = (nom: string) => `« ${nom} »`;

export function lignesDEcart(lignes: readonly LigneBandeau[]): LigneEcart[] {
  const out: LigneEcart[] = [];
  for (const l of lignes) {
    if (l.type === "fiche") {
      out.push({ cle: l.cle, quoi: l.libelle, avant: l.avant, apres: l.apres, details: [], genre: "modifie" });
    } else if (l.type === "modifie") {
      for (const [champ, libelle] of CHAMPS_RISQUE) {
        const c = l.changements[champ];
        if (c) {
          out.push({
            cle: `${l.cle}-${champ}`,
            quoi: `${guillemets(l.nom)} · ${libelle}`,
            avant: c.avant,
            apres: c.apres,
            details: [],
            genre: "modifie",
          });
        }
      }
    } else if (l.type === "ajoute") {
      const details = [
        l.famille && `Famille : ${l.famille}`,
        l.lieu && `Lieu : ${l.lieu}`,
        l.frequence && `Fréquence : ${l.frequence}`,
        l.eu && `Votre mesure : ${l.eu}`,
        l.ee && `Sa mesure : ${l.ee}`,
      ].filter((x): x is string => Boolean(x));
      out.push({ cle: l.cle, quoi: "Risque ajouté", avant: "", apres: l.risque, details, genre: "ajoute" });
    } else {
      out.push({ cle: l.cle, quoi: guillemets(l.risque), avant: l.risque, apres: "Supprimé", details: [], genre: "supprime" });
    }
  }
  return out;
}
