"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NOM_BATIMENT_PRINCIPAL } from "@/lib/batiments/schema";
import { requireUser } from "@/lib/auth/require-user";
import { poserEtablissementActif } from "@/lib/etablissements/etablissement-actif";
import { sirenDuSiret } from "@/lib/etablissements/siret";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { onboardingSchema } from "./schema";
import { MESSAGE_REFUS_EFFECTIF_ENTREPRISE } from "@/lib/entreprises/schema";
import { MESSAGE_EFFECTIF_REPRIS } from "./rattachement";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";
import { typesErpAutresCoherents } from "@/lib/etablissements/schema";
import { saisieOnboardingDepuisFormData } from "./saisie";

/**
 * Server action de finalisation du parcours d'onboarding.
 *
 * Crée un établissement — le premier du compte ou un suivant — et, si son
 * SIREN est nouveau pour le compte, son entreprise, dans une transaction
 * unique. Redirige ensuite vers la déclaration des équipements
 * (`?bienvenue=1` déclenche le bandeau de continuité) : le calendrier des
 * obligations d'établissement est déjà généré, les équipements y ajoutent
 * les leurs, le dashboard vient après.
 *
 * Le SIRET et le NAF vont à l'établissement. La raison sociale, l'effectif et l'adresse
 * (le siège, par défaut celle de l'établissement) vont à l'entreprise quand elle naît ;
 * quand elle existe, elle garde les siens et le formulaire ne les lit pas.
 */
export type OnboardingActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; etablissementId: string };

/** L'entreprise reprise dépasse la borne du produit (ADR-031). */
class RefusEffectifEntreprise extends Error {}

/**
 * Rejoue une fois une création heurtée par une transaction concurrente sur la
 * même entreprise : P2002, deux parcours ont créé le même SIREN au même
 * instant ; P2003, l'entreprise a été supprimée avec son dernier établissement pendant
 * qu'on y rattachait celui-ci (`supprimerEntrepriseSiVide`). Au second passage,
 * l'`upsert` trouve l'entreprise, ou la recrée.
 */
async function avecUneReprise<T>(creer: () => Promise<T>): Promise<T> {
  try {
    return await creer();
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2002" || e.code === "P2003")
    ) {
      return creer();
    }
    throw e;
  }
}

export async function finaliserOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireUser();

  // ~~Un compte = une entreprise : l'onboarding ne se joue qu'une fois.~~
  // [2026-10-26 : chaque établissement passe par ce parcours.]
  // On lit les champs un à un — permet de convertir checkboxes (HTML
  // ne soumet "on" que si la case est cochée) en vrais booléens.
  // La lecture du formulaire, partagée avec le test de cohérence du filtre
  // (`saisie.ts`, 2026-10-17) : ce que le serveur lit est ce que les champs
  // cachés du parcours postent.
  const input = saisieOnboardingDepuisFormData(formData);

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const d = parsed.data;

  const siren = sirenDuSiret(d.siret);

  let result;
  try {
    result = await avecUneReprise(() => prisma.$transaction(async (tx) => {
      // L'entreprise du SIREN, dans CE compte — jamais ailleurs : la clé porte
      // `userId`, un SIREN suivi par un autre compte n'est ni lu ni touché.
      // `upsert` sur l'unicité `(userId, siren)` : deux parcours finis au même
      // instant pour le même SIREN se rejoignent au lieu de se heurter. Quand
      // elle existe, rien n'y est écrit (`update: {}`) : sa raison sociale et
      // son effectif sont les siens, que le parcours affiche sans les lire.
      const entreprise = await tx.entreprise.upsert({
        where: { userId_siren: { userId: user.id, siren } },
        update: {},
        create: {
          userId: user.id,
          siren,
          raisonSociale: d.raisonSociale,
          // L'effectif de l'ENTREPRISE, apprentis non compris, demandé pour
          // lui-même (C37, 2026-09-26). Il était recopié de l'effectif de l'établissement,
          // « salariés + apprentis » : les seuils du CSE et du règlement
          // intérieur, qui se comptent sur l'entreprise sans les apprentis
          // (L. 2311-2 → L. 1111-2, L. 1111-3), lisaient un autre nombre.
          effectif: d.effectifEntreprise,
          adresse: d.adresse,
        },
        select: { id: true, raisonSociale: true, effectif: true },
      });

      // La borne de l'ADR-031 se lit sur l'effectif QUI S'APPLIQUE : celui de
      // l'entreprise reprise, et non le nombre posté, que le serveur ignore dans
      // ce cas. Le parcours l'affiche déjà et bloque ; une requête forgée ne
      // passe pas pour autant. Lever annule la transaction.
      if (entreprise.effectif > EFFECTIF_MAX) throw new RefusEffectifEntreprise();

      const etablissement = await tx.etablissement.create({
        data: {
          entrepriseId: entreprise.id,
          // Le nom d'usage saisi, sinon la raison sociale de l'entreprise.
          raisonDisplay: d.nomUsage ?? entreprise.raisonSociale,
          siret: d.siret,
          adresse: d.adresse,
          codeNaf: d.codeNaf,
          effectifSurSite: d.effectifSurSite,
          // ~~`personnesPresentesHabituellement` et `manipuleMatieresR422722`
          // n'est plus demandé à l'onboarding (2026-09-01)~~ [2026-09-27 : les
          // matières ~~et les chiffons~~ y reviennent, en trois états — écrits
          // seulement s'ils ont une réponse, ci-dessous ; 2026-10-12 : les
          // chiffons rayés, critère et question retirés le 2026-10-08 (C66)] : question de
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
          ...(d.manipuleMatieresR422722 === undefined
            ? {}
            : { manipuleMatieresR422722: d.manipuleMatieresR422722 }),
          estEtablissementTravail: d.estEtablissementTravail,
          estERP: d.estERP,
          estIGH: d.estIGH,
          estHabitation: d.estHabitation,
          typeErp: d.typeErp,
          typesErpAutres: typesErpAutresCoherents(d),
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
    }));
  } catch (err) {
    if (err instanceof RefusEffectifEntreprise) {
      // Le champ est en lecture seule dans ce cas : le message dit où agir.
      return {
        status: "error",
        message: "Formulaire invalide",
        fieldErrors: {
          effectifEntreprise: [
            `${MESSAGE_REFUS_EFFECTIF_ENTREPRISE} ${MESSAGE_EFFECTIF_REPRIS}`,
          ],
        },
      };
    }
    throw err;
  }

  // LE CALENDRIER NAÎT AVEC L'ÉTABLISSEMENT. Il n'était généré qu'à la
  // première déclaration d'équipement ou à l'ouverture de la page Calendrier :
  // un bureau sans appareil doit pourtant ses obligations d'établissement
  // (ADR-022), et son tableau de bord annonçait « Votre calendrier est vide »
  // en attendant (revue du 2026-09-14). Le recalage n'échoue jamais : raté, il
  // laisse le calendrier marqué périmé, que le premier affichage reprend.
  await regenererApresMutation(result.id, "onboarding");

  // On vient de le créer et on y atterrit : c'est lui, l'établissement actif.
  // Sans ce trait, un second établissement se créerait puis l'accueil
  // renverrait au premier.
  await poserEtablissementActif(result.id);

  revalidatePath("/");
  revalidatePath(`/entreprises/${result.entrepriseId}`);
  redirect(`/etablissements/${result.id}/equipements?bienvenue=1`);
}

