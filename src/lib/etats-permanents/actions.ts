"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { obligationParId } from "@/lib/referentiels/conformite";
import { modeDeclarationApplique } from "./regle";
import {
  determineObligationsApplicables,
  projeterEtablissement,
} from "@/lib/matching";

/**
 * Déclarer, et défaire.
 *
 * **Aucun appel au générateur de calendrier**, contrairement à toutes les
 * autres mutations du produit — et c'est délibéré. La règle « toute mutation
 * relance `genererCalendrier` » existe parce qu'un titre déclaré ou un
 * équipement ajouté **change les échéances**. Une déclaration d'état permanent
 * n'en change aucune : par construction, ces obligations n'engendrent aucune
 * ligne de `Verification` (`estSansRendezVous`). Relancer le générateur ici
 * coûterait une passe complète pour un plan vide, et surtout laisserait croire
 * qu'une déclaration touche au calendrier — ce qu'elle ne doit pas faire.
 *
 * C'est la traduction en code de la contrainte de l'ADR-027 : une déclaration
 * n'allume rien ailleurs.
 */

export type DeclarationActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

/**
 * Vérifie que l'obligation existe ET qu'elle relève bien de cet écran, **pour
 * cet établissement-là**.
 *
 * Sans ce contrôle, un formulaire trafiqué pourrait déclarer « en place » une
 * échéance récurrente ou une obligation événementielle — c'est-à-dire écrire en
 * base une affirmation que l'écran n'a jamais proposée, et que rien ensuite ne
 * viendrait contredire. Le garde-fou est ici et non dans le composant : une
 * validation qui vit dans le rendu n'est pas une validation.
 *
 * ## Pourquoi la garde a dû devenir asynchrone
 *
 * Sa première version appelait `modeDeclaration(o)` sur la seule obligation du
 * référentiel, sans l'établissement. Elle ignorait donc les **surcharges de
 * prescription** : une obligation `etat_permanent` à qui un arrêté préfectoral
 * donne un rythme quitte cet écran pour le calendrier, mais un POST forgé
 * passait la garde et écrivait une ligne que l'écran n'affichera jamais.
 *
 * Aucun franchissement de compte — `assertEtablissementOwnership` tient ce
 * plan-là. Mais c'était **la double surface que le commentaire de ce module
 * prétend empêcher**, atteignable par requête directe. Une garde qui protège
 * d'un formulaire trafiqué et cède à une requête forgée ne garde rien : les
 * deux sont le même geste.
 *
 * Le coût est une passe de matching par déclaration. C'est une action
 * utilisateur, pas une boucle de rendu, et la garde ne peut pas être juste sans
 * connaître le dossier.
 */
async function obligationDeclarable(
  etablissementId: string,
  obligationId: string,
): Promise<boolean> {
  if (!obligationParId(obligationId)) return false;

  const etablissement = await prisma.etablissement.findUnique({
    where: { id: etablissementId },
    include: { entreprise: { select: { effectif: true } } },
  });
  if (!etablissement) return false;

  const equipements = await prisma.equipement.findMany({
    where: { etablissementId, actif: true },
    select: { id: true, libelle: true, categorie: true, caracteristiques: true },
  });

  const applicables = determineObligationsApplicables(
    projeterEtablissement(etablissement),
    equipements.map((eq) => ({
      id: eq.id,
      libelle: eq.libelle,
      categorie: eq.categorie,
      caracteristiques: (eq.caracteristiques ?? null) as Record<
        string,
        unknown
      > | null,
    })),
  );

  const app = applicables.find((a) => a.obligation.id === obligationId);
  // Non applicable à ce dossier : la déclarer n'aurait aucun sens, et l'écran
  // ne l'a jamais montrée. C'est un second cas que l'ancienne garde laissait
  // passer, celui-là sans même invoquer une surcharge.
  if (!app) return false;

  return modeDeclarationApplique(app) !== null;
}

/**
 * La borne de la note libre.
 *
 * 500 signes, comme `TitreSalarie.note` — la même nature de champ mérite la
 * même limite, et deux bornes différentes pour deux notes libres du même
 * produit finiraient par diverger sans raison.
 *
 * Le champ était trimé et jamais borné, sur une colonne `text`. L'interface ne
 * l'envoie ni ne l'affiche aujourd'hui, donc rien n'était exploitable par un
 * usage normal — mais une requête forgée pouvait y stocker des mégaoctets, et
 * une colonne sans borne finit toujours par en trouver un.
 *
 * REJETÉE ET NON TRONQUÉE. Couper à 500 stockerait une phrase que le dirigeant
 * n'a pas écrite, sur un écran où il affirme quelque chose sur sa propre
 * conformité. Mieux vaut refuser et le dire.
 */
const NOTE_MAX = 500;

export async function declarerEnPlace(
  etablissementId: string,
  obligationId: string,
  note?: string | null,
): Promise<DeclarationActionState> {
  await assertEtablissementOwnership(etablissementId);

  if (!(await obligationDeclarable(etablissementId, obligationId))) {
    return {
      status: "error",
      message:
        "Cette obligation ne se déclare pas ici : elle a une échéance, ou elle revient à chaque fois qu'un fait se produit.",
    };
  }

  const propre = note?.trim() ? note.trim() : null;
  if (propre && propre.length > NOTE_MAX) {
    return {
      status: "error",
      message: `Le repère ne peut pas dépasser ${NOTE_MAX} caractères.`,
    };
  }

  await prisma.declarationEtatPermanent.upsert({
    where: { etablissementId_obligationId: { etablissementId, obligationId } },
    // Redéclarer redate. C'est le sens de la ligne : l'employeur affirme
    // qu'aujourd'hui l'état est là. Une seconde déclaration n'empile pas un
    // historique — un historique de déclarations ressemblerait à une trace, et
    // une trace ressemble à une preuve.
    update: { declareLe: new Date(), note: propre },
    create: { etablissementId, obligationId, note: propre },
  });

  revalidatePath(`/etablissements/${etablissementId}/etats-permanents`);
  return { status: "success" };
}

export async function retirerDeclaration(
  etablissementId: string,
  obligationId: string,
): Promise<DeclarationActionState> {
  await assertEtablissementOwnership(etablissementId);

  // `deleteMany` et non `delete` : décocher une ligne jamais déclarée ne doit
  // pas lever. L'écran est optimiste, deux clics rapides peuvent arriver dans
  // l'ordre inverse, et un `P2025` affiché au dirigeant ne lui apprendrait
  // rien.
  await prisma.declarationEtatPermanent.deleteMany({
    where: { etablissementId, obligationId },
  });

  revalidatePath(`/etablissements/${etablissementId}/etats-permanents`);
  return { status: "success" };
}
