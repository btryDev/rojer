"use server";

import { requireCompteDOnboarding } from "@/lib/auth/compte";
import { MESSAGE_COMPTE_CHANGE } from "@/lib/auth/compte-attendu";
import { requireUser } from "@/lib/auth/require-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { poserEtablissementActif } from "@/lib/etablissements/etablissement-actif";
import { sirenDuSiret } from "@/lib/etablissements/siret";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import {
  compteEnEssai,
  MESSAGE_ENTREPRISE_DEJA_ESSAYEE,
  noterEssaiEntreprise,
  sirenEssayeAilleurs,
} from "@/lib/abonnements/essai-entreprise";
import { onboardingSchema } from "./schema";
import { MESSAGE_REFUS_EFFECTIF_ENTREPRISE } from "@/lib/entreprises/schema";
import { MESSAGE_EFFECTIF_REPRIS } from "./rattachement";
import { saisieOnboardingDepuisFormData } from "./saisie";
import { verifierSaisie } from "@/lib/abonnements/saisie";
import { RefusQuota } from "@/lib/abonnements/quotas";
import { RefusBorneEffectif } from "@/lib/entreprises/effectif";
import { creerEtablissementOnboarding, RefusEffectifEntreprise } from "./creation";

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

export async function finaliserOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  await verifierSaisie();
  // La session d'abord : sans elle, renvoi à la connexion avant toute lecture.
  await requireUser();

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

  // Le compte où ranger l'établissement : celui de la personne, ou un compte
  // neuf dont elle devient propriétaire (ADR-054 § 5). Créé avant la
  // transaction : si elle échoue, le parcours suivant le reprend.
  // Refusé si la page montrait un autre compte : elle est rendue de nouveau sur
  // le compte actif, et le parcours garde ses réponses.
  const lu = await requireCompteDOnboarding(formData, { page: "/onboarding", nomSiNouveau: d.raisonSociale });
  if (!lu) return { status: "error", message: MESSAGE_COMPTE_CHANGE };
  const { compte, db } = lu;

  const siren = sirenDuSiret(d.siret);

  // Un essai par entreprise (ADR-053 § 8) : pendant un essai, une entreprise
  // déjà essayée par un autre compte ne se CRÉE pas. Un site de plus d'une
  // entreprise que le compte suit déjà n'est pas concerné. Le message seul,
  // sans le champ : il ne s'agit pas de corriger le SIRET.
  const enEssai = await compteEnEssai(db, compte.compteId);
  if (
    enEssai &&
    !(await db.entreprise.findUnique({
      where: { compteId_siren: { compteId: compte.compteId, siren } },
      select: { id: true },
    })) &&
    (await sirenEssayeAilleurs(siren, compte.compteId))
  ) {
    return { status: "error", message: MESSAGE_ENTREPRISE_DEJA_ESSAYEE };
  }

  let result;
  try {
    result = await creerEtablissementOnboarding(db, compte, d);
  } catch (err) {
    if (err instanceof RefusQuota) return { status: "error", message: err.motif };
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
    if (err instanceof RefusBorneEffectif) {
      return {
        status: "error",
        message: "Formulaire invalide",
        // Sous l'effectif du site : c'est lui que l'on peut baisser ici.
        fieldErrors: { effectifSurSite: [`${err.message} ${MESSAGE_EFFECTIF_REPRIS}`] },
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

  // Le SIREN noté sous ce compte (un essai par entreprise). Un échec ne défait
  // pas la création : il laisse seulement ce SIREN essayable une fois de plus.
  if (enEssai)
    await noterEssaiEntreprise(siren, compte.compteId).catch((e: unknown) =>
      console.error(`essai : SIREN non noté — ${e instanceof Error ? e.name : "erreur"}`),
    );

  revalidatePath("/");
  revalidatePath(`/entreprises/${result.entrepriseId}`);
  redirect(`/etablissements/${result.id}/equipements?bienvenue=1`);
}

