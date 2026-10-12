"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDuerp } from "@/lib/auth/scope";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { ecrireReponseFermee } from "@/lib/duerps/ecrire-reponse-fermee";
import { faitDeLaQuestion } from "@/lib/etablissements/faits-activite";
import { ecrireFaitActivite } from "@/lib/etablissements/faits-activite-ecriture";
import { questionTransverseParId } from "./etat";
import { poserRisqueTransverse } from "./risque-transverse";

/**
 * Cloisonnement : `duerpId` vient du client. Sans garde, `validerTransverses`
 * marquait n'importe quel DUERP comme « transverses répondues » et le toggle
 * créait/supprimait des risques chez un autre client. `requireDuerp` remonte
 * jusqu'à `Entreprise.userId` et répond 404 sinon.
 */

/**
 * Enregistre la réponse d'un DUERP à une question transverse : oui, non, ou
 * `null` pour retirer la réponse (ADR-038). Remplace `toggleRisqueTransverse`,
 * qui ne savait qu'ajouter ou supprimer le risque — et donc ne savait pas dire
 * « non » autrement que par le silence.
 *
 * - « oui » crée le risque s'il manque, avec la cotation par défaut, et efface
 *   un « non » antérieur ;
 * - « non » supprime le risque s'il existe et écrit `false` ;
 * - `null` supprime le risque s'il existe et retire la clé : sans réponse.
 *
 * Deux régimes depuis l'ADR-041 (`transverses/etat.ts`) :
 * - une question qui pose un FAIT D'ACTIVITÉ (`etablissements/faits-activite.ts`)
 *   écrit la colonne de l'établissement, par son écrivain unique ;
 * - les autres gardent la règle de l'ADR-038 : le risque est la vérité du
 *   « oui », `Duerp.reponsesTransverses` porte le « non ».
 * Dans les deux cas, le risque et la réponse partent dans une même
 * transaction : une réponse à moitié écrite laisserait un « non » à côté d'un
 * risque, ou un risque supprimé sans son « non ».
 *
 * Supprimer le risque emporte sa cotation et ses actions (cascade) : c'était
 * déjà le cas du « Non » de `toggleRisqueTransverse`, rien ne change ici.
 */
export async function repondreQuestionTransverse(
  duerpId: string,
  questionId: string,
  reponse: boolean | null,
): Promise<void> {
  const { duerp } = await requireDuerp(duerpId);
  const question = questionTransverseParId(questionId);
  if (!question) throw new Error(`Question transverse inconnue : ${questionId}`);
  // Une question qui pose un FAIT D'ACTIVITÉ (ADR-041) : la réponse vit sur
  // l'établissement, et c'est son écrivain unique qui pose ou retire le
  // risque. Le « Non » donné ICI retire le risque même travaillé : l'écran a
  // demandé confirmation (`QuestionTransverseRow`).
  const fait = faitDeLaQuestion(question.id);
  if (fait) {
    // La clé de la question dans `Duerp.reponsesTransverses` n'est plus écrite
    // ni lue (`etat.ts` lit le fait) : la migration 20261008150000 a repris
    // les « non » qu'elle portait.
    await ecrireFaitActivite(duerp.etablissementId, fait.champ, reponse, "toujours");
    // Le fait ajoute ou retire des obligations : le calendrier suit.
    await regenererApresMutation(duerp.etablissementId, `transverses/${question.id}`);
  } else {
    await prisma.$transaction(async (tx) => {
      await poserRisqueTransverse(tx, duerpId, question, reponse === true, "toujours");
      // « oui » efface la clé : il se lit sur le risque, et un `false` resté là
      // contredirait le document le jour où le risque serait retiré ailleurs.
      const lignes = await ecrireReponseFermee(
        tx,
        "reponsesTransverses",
        duerpId,
        question.id,
        reponse === false ? false : null,
      );
      // `requireDuerp` vient de garantir la ligne : zéro veut dire qu'elle a
      // disparu entre-temps, et l'écran afficherait une réponse non enregistrée.
      if (lignes === 0) throw new Error(`DUERP introuvable à l'écriture : ${duerpId}`);
    });
  }

  revalidatePath(`/duerp/${duerpId}/transverses`);
  revalidatePath(`/duerp/${duerpId}/synthese`);
  // Les fiches salarié lisent ces réponses (« Formations liées aux risques du
  // poste ») ; le tableau de bord aussi (`dashboard/transmissions.ts`).
  revalidatePath(`/etablissements/${duerp.etablissementId}`, "layout");
}

export async function validerTransverses(duerpId: string): Promise<void> {
  await requireDuerp(duerpId);

  await prisma.duerp.update({
    where: { id: duerpId },
    data: { transversesRepondues: true },
  });
  revalidatePath(`/duerp/${duerpId}/transverses`);
  revalidatePath(`/duerp/${duerpId}/synthese`);
}
