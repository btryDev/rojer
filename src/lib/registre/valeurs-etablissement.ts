// Les réponses que les fiches « établissement » du registre lisent sur les
// colonnes d'`Etablissement` et d'`Entreprise` (forme `etablissement`).
//
// Sorti de `queries.ts` le 2026-10-17 (contrôle visuel du lot 3) : la
// lecture est pure, et elle se teste sans base.

import { cleJourCivil } from "@/lib/dates";
import { LABEL_CATEGORIE_ERP_COURT } from "@/lib/etablissements/labels";
import type { CATEGORIES_ERP } from "@/lib/etablissements/schema";
import { typesErpDe } from "@/lib/etablissements/types-erp-affiches";

export type EtablissementLu = {
  adresse: string | null;
  natureActivite: string | null;
  typeErp: string | null;
  typesErpAutres: readonly string[];
  categorieErp: (typeof CATEGORIES_ERP)[number] | null;
  effectifPublicAdmis: number | null;
  dateAutorisationOuverture: Date | null;
  dateCertificatConformite: Date | null;
  entreprise: { raisonSociale: string | null; adresse: string | null };
};

/**
 * Par `source` de champ : la valeur à afficher, et — pour un champ qui peut en
 * porter plusieurs — leur NOMBRE. C'est ce nombre, et non la présence d'une
 * virgule dans la valeur, qui décide du pluriel du libellé (revue de c6).
 */
export function valeursParSource(etab: EtablissementLu): {
  valeurs: Record<string, string | null>;
  nombres: Record<string, number>;
} {
  // Une date sort en clé de jour civil (ADR-011) : `cleJourCivil` et non
  // `toISOString()`, sinon une date s'afficherait la veille.
  const jour = (d: Date | null) => (d ? cleJourCivil(d) : null);
  const types = typesErpDe(etab);
  return {
    valeurs: {
      "Etablissement.adresse": etab.adresse,
      "Etablissement.natureActivite": etab.natureActivite,
      // ADR-045 : tous les types déclarés, le premier en tête.
      "Etablissement.typeErp": types.join(", ") || null,
      // « 3ᵉ catégorie », pas « N3 », le code de l'enum (contrôle visuel du
      // lot 3, 2026-10-17 ; le défaut précédait le lot).
      "Etablissement.categorieErp": etab.categorieErp ? LABEL_CATEGORIE_ERP_COURT[etab.categorieErp] : null,
      "Etablissement.effectifPublicAdmis":
        etab.effectifPublicAdmis === null ? null : String(etab.effectifPublicAdmis),
      "Etablissement.dateAutorisationOuverture": jour(etab.dateAutorisationOuverture),
      "Etablissement.dateCertificatConformite": jour(etab.dateCertificatConformite),
      "Entreprise.raisonSociale": etab.entreprise.raisonSociale,
      "Entreprise.adresse": etab.entreprise.adresse,
    },
    nombres: { "Etablissement.typeErp": types.length },
  };
}
