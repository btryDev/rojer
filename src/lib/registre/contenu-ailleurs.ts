// Ce qu'une fiche porte quand un autre écran la tient.
//
// L'inventaire des moyens de secours (parties 2.1 et 2.2), c'est le parc
// d'équipements ; les vérifications des moyens d'extinction et des
// installations (3.1 et 3.2), c'est le calendrier. Ces fiches n'ont pas de
// formulaire propre, et n'en auront jamais : ce serait une seconde saisie du
// même fait, qui divergerait de la première.
//
// Mais elles ne sont pas vides pour autant. L'écran d'une fiche affichait
// « cette fiche se tient depuis vos équipements » et un lien — on ouvrait
// une fiche de son propre registre pour y lire qu'elle était ailleurs.
// Trente et une fiches sur quarante-neuf : trente et un culs-de-sac, alors
// que le dirigeant venait justement voir ce qu'elle contient.
//
// Savoir quelle partie se lit dans quelle table est une connaissance du
// registre, pas de l'écran. Elle vit donc ici, avec le reste — la route
// appelle une fonction et ne connaît ni Prisma ni la carte des parties.
//
// Ce module ne rend que de la donnée : ni React, ni classe CSS. Les chemins
// en sont — un href canonique est un fait, sa décoration de provenance est
// une affaire de navigation, donc d'appelant.

import type { StatutVerification } from "@prisma/client";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { listerVerifications } from "@/lib/calendrier/queries";
import { formaterDateCourteFr } from "@/lib/dates";
import { estEcheanceContractuelle } from "@/lib/prescriptions/sources";
import type { SectionRegistre } from "./sections";

/**
 * Ce que la fonction pure attend, réduit au strict nécessaire.
 *
 * Les types sont posés en structure et non repris de Prisma : le PDF compose
 * quarante-neuf fiches d'un coup et doit pouvoir lire le parc **une seule
 * fois** pour les servir toutes. Sans ce découplage, il faudrait une requête
 * par fiche — soit soixante-deux lectures pour un document.
 */
export type EquipementTenu = {
  id: string;
  libelle: string;
  categorie: string;
  localisation: string | null;
  batiment?: { nom: string } | null;
};

export type VerificationTenue = {
  id: string;
  libelleObligation: string;
  datePrevue: Date | null;
  dateRealisee: Date | null;
  /** Le dernier rapport réalisé (ADR-034) — c'est lui qui dit « faite le »,
   *  la ligne ne portant plus que l'échéance ouverte. */
  derniereRealisation: Date | null;
  statut: StatutVerification;
  /** `null` = l'échéance porte sur l'établissement, pas sur un appareil
   *  (ADR-022). Une telle ligne n'a pas de catégorie, donc pas de fiche de
   *  registre à laquelle se rattacher : voir le filtre plus bas. */
  equipement: { libelle: string; categorie: string } | null;
  /**
   * L'acte dont la ligne est née, quand elle vient d'une prescription
   * particulière (ADR-014). `null` = elle vient du référentiel.
   *
   * La fonction est pure et ne lit pas la base : sans ce champ dans sa forme
   * d'entrée, le registre serait la seule des six surfaces à ne pas pouvoir
   * marquer une échéance contractuelle — et c'est le document qu'on présente
   * à la commission de sécurité.
   */
  prescription?: { source: string } | null;
};

/** Une ligne de ce que la fiche porte, telle qu'elle se lira. */
export type LigneTenue = {
  id: string;
  titre: string;
  /** La précision qui distingue deux lignes — un lieu, une date. */
  meta?: string;
  /** La fiche de l'objet. Canonique : l'appelant y ajoute sa provenance. */
  href?: string;
  /** Le statut d'une vérification, quand la ligne en est une. */
  statut?: StatutVerification;
  /** La ligne naît-elle d'un engagement contractuel (ADR-032) ? Le rendu en
   *  fait une mention à part, jamais un mot noyé dans `meta` — qui est
   *  tronqué. */
  contractuelle?: boolean;
};

export type ContenuAilleurs = {
  lignes: LigneTenue[];
  /** L'écran qui tient ces lignes, et où les modifier. */
  source: { libelle: string; href: string };
  /** Ce qu'on dit quand la fiche est due mais que rien ne la remplit encore. */
  vide: string;
};

/** Les parties dont le contenu est un inventaire d'équipements. */
const PARTIES_INVENTAIRE = new Set(["2.1", "2.2"]);
/** Les parties dont le contenu est une suite de vérifications. */
const PARTIES_VERIFICATIONS = new Set(["3.1", "3.2"]);

/**
 * Ce que porte une fiche tenue ailleurs, ou `null` si aucune ne la tient.
 *
 * `null` aussi quand la section ne déclare aucune catégorie d'équipement :
 * sans elle on ne saurait pas quoi lister, et un extrait faux serait pire
 * qu'un renvoi honnête.
 */
export async function lireContenuTenuAilleurs(
  etablissementId: string,
  partieId: string,
  section: SectionRegistre,
): Promise<ContenuAilleurs | null> {
  // Un écran de fiche n'en rend qu'une : lire les deux listes ici coûte deux
  // requêtes, et la mémoïsation de la page fait le reste. Le PDF, lui, passe
  // par `contenuTenuAilleursDepuis` avec un parc déjà chargé.
  if (!section.categoriesEquipement?.length) return null;
  const [equipements, verifications] = await Promise.all([
    PARTIES_INVENTAIRE.has(partieId)
      ? listerEquipementsDeLEtablissement(etablissementId)
      : Promise.resolve([]),
    PARTIES_VERIFICATIONS.has(partieId)
      ? listerVerifications(etablissementId)
      : Promise.resolve([]),
  ]);
  return contenuTenuAilleursDepuis(
    etablissementId,
    partieId,
    section,
    equipements,
    verifications,
  );
}

/**
 * La même chose, sur un parc déjà chargé. **Pure** : c'est elle qui porte la
 * carte des parties, et c'est elle que le PDF appelle quarante-neuf fois.
 */
export function contenuTenuAilleursDepuis(
  etablissementId: string,
  partieId: string,
  section: SectionRegistre,
  equipements: readonly EquipementTenu[],
  verifications: readonly VerificationTenue[],
): ContenuAilleurs | null {
  const categories = section.categoriesEquipement;
  if (!categories || categories.length === 0) return null;
  const cats = new Set<string>(categories);
  const base = `/etablissements/${etablissementId}`;

  if (PARTIES_INVENTAIRE.has(partieId)) {
    return {
      lignes: equipements
        .filter((e) => cats.has(e.categorie))
        .map((e) => ({
          id: e.id,
          titre: e.libelle,
          meta: [e.batiment?.nom, e.localisation].filter(Boolean).join(" · "),
          href: `${base}/equipements/${e.id}`,
        })),
      source: { libelle: "vos équipements", href: `${base}/equipements` },
      vide: "Aucun équipement de cette catégorie n'est déclaré pour l'instant. La fiche figure à votre registre parce qu'elle vous est due — déclarez le matériel dans vos équipements et il apparaîtra ici.",
    };
  }

  if (PARTIES_VERIFICATIONS.has(partieId)) {
    return {
      lignes: verifications
        // Les fiches de registre sont rangées par catégorie d'équipement ;
        // une échéance portée par l'établissement (ADR-022) n'en a pas, et
        // n'a donc aucune fiche où atterrir. Elle n'est pas perdue pour
        // autant : elle reste au calendrier et dans le dossier de conformité.
        // Limite assumée — le jour où une fiche de registre couvrira une
        // obligation d'établissement, ce filtre devra changer de critère.
        .filter((v) => v.equipement !== null && cats.has(v.equipement.categorie))
        .map((v) => ({
          id: v.id,
          titre: v.libelleObligation,
          meta: [
            v.equipement?.libelle,
            // Le fait, lu sur le dernier rapport (ADR-034)…
            v.derniereRealisation
              ? `faite le ${formaterDateCourteFr(v.derniereRealisation)}`
              : null,
            // …puis l'échéance ouverte. La colonne gelée d'une ligne d'avant
            // garde l'ancienne phrase jusqu'à sa remise au modèle.
            v.dateRealisee
              ? `faite le ${formaterDateCourteFr(v.dateRealisee)}`
              : v.datePrevue
                ? `prochaine le ${formaterDateCourteFr(v.datePrevue)}`
                : "à planifier",
          ]
            .filter(Boolean)
            .join(" · "),
          href: `${base}/verifications/${v.id}`,
          statut: v.statut,
          contractuelle: estEcheanceContractuelle(v),
        })),
      source: { libelle: "votre calendrier", href: `${base}/calendrier` },
      vide: "Aucune vérification n'est encore programmée pour ce matériel. Elle apparaîtra ici dès que votre calendrier en portera une.",
    };
  }

  return null;
}
