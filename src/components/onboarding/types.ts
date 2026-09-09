import type { Blocage } from "./validation";

/**
 * État du wizard d'onboarding — partagé entre toutes les étapes.
 * Reste structurellement aligné avec `onboardingSchema` côté serveur,
 * mais tolère les valeurs intermédiaires (string vide, undefined) tant
 * que l'étape correspondante n'a pas été validée.
 */
export type OnboardingState = {
  raisonSociale: string;
  siret: string;

  // Adresse structurée — validée champ par champ côté client, recomposée
  // en chaîne unique au submit pour alimenter Entreprise.adresse /
  // Etablissement.adresse (colonne `adresse` unique en base, ADR-001).
  adresseRue: string;
  adresseCodePostal: string;
  adresseVille: string;

  codeNaf: string;
  effectifSurSite: string; // saisie texte, convertie en number au submit

  estEtablissementTravail: boolean;
  estERP: boolean;
  estIGH: boolean;
  estHabitation: boolean;

  typeErp: string;
  categorieErp: string;

  // Locaux à sommeil pour le public — posée depuis le 2026-09-09, et seulement
  // aux quatre types de `TYPES_ERP_QUESTION_LOCAUX_SOMMEIL`. Trois valeurs :
  // "" (« je ne sais pas encore »), "oui", "non". La chaîne vide n'est pas un
  // trou de saisie, c'est une réponse : elle laisse la colonne à `null`.
  comporteLocauxSommeilPublic: string;
  // `classeIgh` et `familleHabitation` ont quitté l'état du wizard le
  // 2026-09-03 : les deux sous-questions qui les remplissaient ont été
  // retirées, aucune obligation du référentiel ne dépendant de l'une ni de
  // l'autre.
};

export const VALEURS_INITIALES: OnboardingState = {
  raisonSociale: "",
  siret: "",
  adresseRue: "",
  adresseCodePostal: "",
  adresseVille: "",
  codeNaf: "",
  effectifSurSite: "",
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: "",
  categorieErp: "",
  comporteLocauxSommeilPublic: "",
};

export type StepProps = {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  /** Erreurs par champ, renvoyées côté serveur après l'étape finale. */
  errors?: Record<string, string | undefined>;
  /**
   * Le refus d'avancer, quand il vise un champ de cette étape : l'étape le
   * rend **sous le champ concerné**. Le shell ne garde en bas de colonne
   * que les refus qui ne visent aucun champ — un message posé six cents
   * pixels sous le contrôle qu'il désigne se lit en regardant autre chose.
   */
  blocage?: Blocage | null;
};
