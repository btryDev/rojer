// La lecture du formulaire du parcours d'accueil, telle que la server action
// la fait (`actions.ts`). Extraite le 2026-10-17 (revue du filtre à l'accueil,
// C4) pour que le test de cohérence client / serveur passe par les mêmes
// champs que le vrai parcours : les champs cachés de `WizardShell`, puis
// cette lecture, puis `onboardingSchema`. Module pur.

import { typesErpAutresPostes } from "@/lib/etablissements/types-erp-affiches";

export function saisieOnboardingDepuisFormData(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const typesErpAutres = typesErpAutresPostes(formData);
  return {
    raisonSociale: raw.raisonSociale,
    siret: raw.siret,
    adresse: raw.adresse,
    codeNaf: raw.codeNaf,
    effectifSurSite: raw.effectifSurSite,
    effectifEntreprise: raw.effectifEntreprise,
    estEtablissementTravail: raw.estEtablissementTravail === "true",
    // Sans réponse, `undefined` : le schéma refuse, au lieu de lire « non »
    // (2026-09-27, A2).
    estERP: ouiNon(raw.estERP),
    estIGH: ouiNon(raw.estIGH),
    estHabitation: ouiNon(raw.estHabitation),
    typeErp: raw.typeErp || undefined,
    // Plusieurs valeurs possibles (ADR-045) : `getAll`, pas `raw`.
    ...(typesErpAutres === undefined ? {} : { typesErpAutres }),
    categorieErp: raw.categorieErp || undefined,
    // Vide = « je ne sais pas encore », et le vide ne se coerce pas en `false` :
    // le schéma le rend `undefined`, et l'écriture ci-dessous est alors omise.
    comporteLocauxSommeilPublic: raw.comporteLocauxSommeilPublic,
    // Filtre à l'accueil (2026-10-17) : lue pour refuser, jamais écrite.
    accueilEnfants: raw.accueilEnfants || undefined,
    personnesPresentesHabituellement: raw.personnesPresentesHabituellement,
    manipuleMatieresR422722: raw.manipuleMatieresR422722,
  };
}

/** « true » / « false » postés ; tout le reste — le vide compris — n'est pas une réponse. */
function ouiNon(v: FormDataEntryValue | undefined): boolean | undefined {
  return v === "true" ? true : v === "false" ? false : undefined;
}
