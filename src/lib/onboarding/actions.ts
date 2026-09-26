"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { NOM_BATIMENT_PRINCIPAL } from "@/lib/batiments/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { onboardingSchema } from "./schema";

/**
 * Server action de finalisation du parcours d'onboarding.
 *
 * Crée Entreprise + premier Etablissement dans une transaction unique
 * depuis un seul formulaire (saisi une seule fois, sans duplication
 * ressentie). Redirige ensuite vers la déclaration des équipements
 * (`?bienvenue=1` déclenche le bandeau de continuité) : le calendrier des
 * obligations d'établissement est déjà généré, les équipements y ajoutent
 * les leurs, le dashboard vient après.
 *
 * Les champs communs (adresse, codeNaf, effectif) sont copiés dans les
 * deux entités — côté Entreprise c'est le siège, côté Etablissement
 * c'est le premier site. L'utilisateur pourra dissocier plus tard
 * s'il ajoute un 2e site avec une adresse différente.
 */
export type OnboardingActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; etablissementId: string };

export async function finaliserOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireUser();

  // Un compte = une entreprise (ADR-005, ADR-028) : l'onboarding crée
  // l'entreprise en même temps que son premier établissement, il ne peut donc
  // se jouer qu'une fois. Les établissements suivants naissent ailleurs —
  // `/etablissements/nouveau`, depuis le sélecteur — et c'est cette porte-là
  // qui porte les règles de périmètre.
  //
  // La phrase précédente disait « 1 user = 1 entreprise = 1 établissement » :
  // sa première moitié tient, la seconde est tombée avec l'ADR-028.
  const existant = await getOptionalUserEtablissement();
  if (existant) redirect(`/etablissements/${existant.id}`);
  // On lit les champs un à un — permet de convertir checkboxes (HTML
  // ne soumet "on" que si la case est cochée) en vrais booléens.
  const raw = Object.fromEntries(formData);
  const input = {
    raisonSociale: raw.raisonSociale,
    siret: raw.siret,
    adresse: raw.adresse,
    codeNaf: raw.codeNaf,
    effectifSurSite: raw.effectifSurSite,
    effectifEntreprise: raw.effectifEntreprise,
    estEtablissementTravail: raw.estEtablissementTravail === "true",
    estERP: raw.estERP === "true",
    estIGH: raw.estIGH === "true",
    estHabitation: raw.estHabitation === "true",
    typeErp: raw.typeErp || undefined,
    categorieErp: raw.categorieErp || undefined,
    // Vide = « je ne sais pas encore », et le vide ne se coerce pas en `false` :
    // le schéma le rend `undefined`, et l'écriture ci-dessous est alors omise.
    comporteLocauxSommeilPublic: raw.comporteLocauxSommeilPublic,
    personnesPresentesHabituellement: raw.personnesPresentesHabituellement,
  };

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const d = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const entreprise = await tx.entreprise.create({
      data: {
        userId: user.id,
        raisonSociale: d.raisonSociale,
        siret: d.siret,
        codeNaf: d.codeNaf,
        // L'effectif de l'ENTREPRISE, apprentis non compris, demandé pour
        // lui-même (C37, 2026-09-26). Il était recopié de l'effectif du site,
        // « salariés + apprentis » : les seuils du CSE et du règlement
        // intérieur, qui se comptent sur l'entreprise sans les apprentis
        // (L. 2311-2 → L. 1111-2, L. 1111-3), lisaient un autre nombre.
        effectif: d.effectifEntreprise,
        adresse: d.adresse,
      },
    });

    // Nom d'usage de l'établissement = raison sociale par défaut.
    // L'utilisateur pourra le renommer plus tard s'il ouvre un 2ᵉ site.
    const etablissement = await tx.etablissement.create({
      data: {
        entrepriseId: entreprise.id,
        raisonDisplay: d.raisonSociale,
        adresse: d.adresse,
        codeNaf: d.codeNaf,
        effectifSurSite: d.effectifSurSite,
        // ~~`personnesPresentesHabituellement` et~~ `manipuleMatieresR422722`
        // n'est plus demandé à l'onboarding (2026-09-01) : question de
        // technicien au tout début d'un parcours. La colonne reste à `null` —
        // on ne sait pas encore — et la fiche établissement la porte.
        //
        // LE NOMBRE DE PERSONNES EST REVENU LE 2026-09-20, borné : le schéma ne
        // l'accepte que des dossiers que `nombreDePersonnesADemander` désigne,
        // et l'exige d'eux. Pour tous les autres il reste `undefined` ici, donc
        // `null` en base, et le moteur conclut sans lui (catégorie d'ERP dès la
        // 3ᵉ, effectif, ou établissement de travail seul).
        ...(d.personnesPresentesHabituellement === undefined
          ? {}
          : {
              personnesPresentesHabituellement:
                d.personnesPresentesHabituellement,
            }),
        estEtablissementTravail: d.estEtablissementTravail,
        estERP: d.estERP,
        estIGH: d.estIGH,
        estHabitation: d.estHabitation,
        typeErp: d.typeErp,
        categorieErp: d.categorieErp,
        // Locaux à sommeil (2026-09-09). LE SPREAD CONDITIONNEL EST LE POINT :
        // sans lui, Prisma recevrait `comporteLocauxSommeilPublic: undefined`,
        // ce qui laisse bien `null` en base aujourd'hui — mais l'écrire ainsi
        // ne dirait pas POURQUOI. La question n'est posée qu'à types de la liste, et
        // pour tous les autres — comme pour qui a laissé « je ne sais pas
        // encore » — la colonne doit rester `null`, c'est-à-dire « personne n'a
        // répondu ». Écrire `false` à leur place inscrirait au dossier un fait
        // que nul n'a constaté : c'est ce que la migration `_locaux_sommeil`
        // interdit à un DEFAULT, et ce que « L'onboarding cesse de deviner »
        // (2026-09-01) interdit au parcours. La borne des types de la liste vit dans
        // le référentiel, sur les obligations ; elle ne vit pas dans la donnée.
        ...(d.comporteLocauxSommeilPublic === undefined
          ? {}
          : { comporteLocauxSommeilPublic: d.comporteLocauxSommeilPublic }),
        // `classeIgh` et `familleHabitation` ne sont plus écrites : les deux
        // questions ont été retirées du parcours le 2026-09-03. Les colonnes
        // restent en base et gardent leurs valeurs sur les dossiers anciens ;
        // un dossier neuf naît avec `null`, ce qui ne lui retire aucune
        // obligation — le moteur ne restreint rien par classe ni par famille.
        // ADR-019 : tout établissement naît avec son bâtiment principal.
        batiments: { create: { nom: NOM_BATIMENT_PRINCIPAL, ordre: 0 } },
      },
    });

    return etablissement;
  });

  // LE CALENDRIER NAÎT AVEC L'ÉTABLISSEMENT. Il n'était généré qu'à la
  // première déclaration d'équipement ou à l'ouverture de la page Calendrier :
  // un bureau sans appareil doit pourtant ses obligations d'établissement
  // (ADR-022), et son tableau de bord annonçait « Votre calendrier est vide »
  // en attendant (revue du 2026-09-14). Le recalage n'échoue jamais : raté, il
  // laisse le calendrier marqué périmé, que le premier affichage reprend.
  await regenererApresMutation(result.id, "onboarding");

  revalidatePath("/");
  revalidatePath(`/entreprises/${result.entrepriseId}`);
  redirect(`/etablissements/${result.id}/equipements?bienvenue=1`);
}
