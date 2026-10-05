"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDuerp } from "@/lib/auth/scope";
import { ecrireReponseFermee } from "@/lib/duerps/ecrire-reponse-fermee";
import { activitesDuSecteur } from "./reponses";

/**
 * Cloisonnement : `duerpId` vient du client. `requireDuerp` remonte jusqu'à
 * `Entreprise.userId` et répond 404 sinon (ADR-005) — sans lui, on écrivait
 * une déclaration de périmètre dans le dossier d'un autre.
 */

/**
 * Enregistre la réponse à une question d'activité hors couverture (ADR-020).
 *
 * Répondre « oui » ne bloque rien, n'ajoute aucun risque et n'en retire aucun :
 * ça enregistre un fait sur le périmètre du dossier, qui sera gravé dans la
 * prochaine version validée. Le mécanisme est déclaratif et fermé — la seule
 * source est ce que le dirigeant répond, jamais une déduction sur son nom,
 * son NAF ou ses équipements.
 *
 * `exercee` vaut `true`, `false` ou **`null`** — les trois états que l'ADR-020
 * distingue, dans les deux sens. Sans le troisième, un « non » cliqué par
 * erreur ne pouvait plus être retiré : la clé restait écrite, et le document
 * partait affirmer pour quarante ans que le dirigeant avait *déclaré ne pas
 * exercer* l'activité. Une affirmation que personne n'a faite est exactement
 * ce que ce module existe pour empêcher — elle ne devient pas acceptable
 * parce qu'elle vient d'un clic.
 *
 * L'activité est vérifiée contre le référentiel du secteur **retenu** : une
 * clé arbitraire postée depuis le client n'entre pas en base, sans quoi le
 * document pourrait citer une activité que personne n'a instruite.
 *
 * L'écriture concurrente — une seule clé, en un seul UPDATE — est celle de
 * `ecrireReponseFermee`, partagée avec les questions transverses (ADR-038) ;
 * ses raisons sont écrites là-bas.
 */
export async function repondreActivite(
  duerpId: string,
  activiteId: string,
  exercee: boolean | null,
): Promise<void> {
  const { duerp } = await requireDuerp(duerpId);

  const connue = activitesDuSecteur(duerp.referentielSecteurId).some(
    (a) => a.id === activiteId,
  );
  if (!connue) throw new Error(`Activité inconnue : ${activiteId}`);

  const lignes = await ecrireReponseFermee(
    prisma,
    "reponsesActivitesNonCouvertes",
    duerpId,
    activiteId,
    exercee,
  );

  // `requireDuerp` vient de garantir la ligne : zéro ligne touchée veut dire
  // qu'elle a disparu entre-temps. Se taire renverrait l'utilisateur à un
  // écran qui affiche sa réponse alors que rien n'est enregistré.
  if (lignes === 0) {
    throw new Error(`DUERP introuvable à l'écriture : ${duerpId}`);
  }

  revalidatePath(`/duerp/${duerpId}/activites`);
  revalidatePath(`/duerp/${duerpId}/synthese`);
}
