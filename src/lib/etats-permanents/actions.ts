"use server";

import { ouvrirAuGel } from "@/lib/abonnements/gel-saisie";
import { abandonnerFichiers, deposerFichier } from "@/lib/abonnements/stockage";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { obligationDeclarable } from "./garde";
import { NOTE_DAE_PARTAGE, PRESENCE_PAR_LE_PARC } from "./par-le-parc";
import { preparerUnDepot, retirerLeFichierEnCours } from "./pieces";
import { annexeDeLaLigne } from "@/lib/registre/annexes";
import { clePieceEtatPermanent, stockageEnService } from "@/lib/storage";
import {
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_ECHEC_ENREGISTREMENT,
} from "@/lib/storage/erreurs";
import { validerFichier } from "@/lib/rapports/validator";
import { verifierSaisie } from "@/lib/abonnements/saisie";

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
  await verifierSaisie();
  const { db } = await assertEtablissementDuCompte(etablissementId);

  const { statut: declarable } = await obligationDeclarable(
    db,
    etablissementId,
    obligationId,
  );
  if (declarable === "etabli_par_les_titres") {
    return {
      status: "error",
      message:
        "Cette ligne ne se coche pas : elle se remplit d'après les formations et habilitations déclarées sur les fiches de votre équipe.",
    };
  }
  if (declarable === "etabli_par_le_parc") {
    return {
      status: "error",
      message:
        "Cette ligne ne se coche pas : elle se remplit d'après les appareils déclarés sur la page Équipements.",
    };
  }
  if (!declarable) {
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

  await db.declarationEtatPermanent.upsert({
    where: { etablissementId_obligationId: { etablissementId, obligationId } },
    // Redéclarer redate. C'est le sens de la ligne : l'employeur affirme
    // qu'aujourd'hui l'état est là. Une seconde déclaration n'empile pas un
    // historique — un historique de déclarations ressemblerait à une trace, et
    // une trace ressemble à une preuve.
    update: { declareLe: new Date(), note: propre },
    create: { etablissementId, obligationId, note: propre },
  });

  revalidatePath(`/etablissements/${etablissementId}/etats-permanents`);
  // ~~Les lignes nées d'un fait d'activité se déclarent sous leur question
  // (2026-10-21).~~ [2026-10-24, ADR-047 : les formations se déclarent dans
  // ~~Équipe › Formations~~ [2026-10-24 : section « Formations à organiser » d'Équipe], et leur nombre s'affiche ~~sur l'onglet d'Équipe~~ [2026-10-24 : sur la section].]
  revalidatePath(`/etablissements/${etablissementId}/equipe`, "layout");
  revalidatePath(`/etablissements/${etablissementId}/registre`, "layout");
  // Le DAE partagé se déclare depuis la page Équipements (ADR-057 § 4).
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  return { status: "success" };
}

export async function retirerDeclaration(
  etablissementId: string,
  obligationId: string,
): Promise<DeclarationActionState> {
  await verifierSaisie();
  ouvrirAuGel(); // supprimer, retirer : ouvert sur un site gelé (ADR-053 § 14)
  const { db } = await assertEtablissementDuCompte(etablissementId);

  // `deleteMany` et non `delete` : décocher une ligne jamais déclarée ne doit
  // pas lever. L'écran est optimiste, deux clics rapides peuvent arriver dans
  // l'ordre inverse, et un `P2025` affiché au dirigeant ne lui apprendrait
  // rien.
  //
  // Le fichier en cours d'un écrit annexé au registre devient le précédent
  // (ADR-056 § 4) : « Pas encore » ne laisse pas au registre un fichier que le
  // dirigeant vient de dire absent. L'ancien précédent part, après la base.
  // Décidé sur le FICHIER, pas sur la table des annexes : une ligne sortie de
  // la table garde le fichier qu'on y avait déposé, et il doit pouvoir être
  // retiré (seconde relecture du 2026-11-05). Une ligne sans fichier garde la
  // seule suppression d'avant.
  const aUnFichierEnCours = await db.pieceEtatPermanent.findFirst({
    where: { etablissementId, obligationId, enCours: true },
    select: { id: true },
  });
  if (aUnFichierEnCours) {
    const aLiberer = await db.$transaction(async (tx) => {
      await tx.declarationEtatPermanent.deleteMany({
        where: { etablissementId, obligationId },
      });
      return retirerLeFichierEnCours(tx, etablissementId, obligationId, new Date());
    });
    await abandonnerFichiers(db, aLiberer, "etats-permanents/retrait");
  } else {
    await db.declarationEtatPermanent.deleteMany({
      where: { etablissementId, obligationId },
    });
  }

  revalidatePath(`/etablissements/${etablissementId}/etats-permanents`);
  // ~~Les lignes nées d'un fait d'activité se déclarent sous leur question
  // (2026-10-21).~~ [2026-10-24, ADR-047 : les formations se déclarent dans
  // ~~Équipe › Formations~~ [2026-10-24 : section « Formations à organiser » d'Équipe], et leur nombre s'affiche ~~sur l'onglet d'Équipe~~ [2026-10-24 : sur la section].]
  revalidatePath(`/etablissements/${etablissementId}/equipe`, "layout");
  revalidatePath(`/etablissements/${etablissementId}/registre`, "layout");
  // Le DAE partagé se déclare depuis la page Équipements (ADR-057 § 4).
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  return { status: "success" };
}

/**
 * Le défibrillateur PARTAGÉ avec un établissement voisin (CCH R. 157-3 ;
 * ADR-057 § 4, décision de la propriétaire du 2026-11-06), coché ou décoché
 * depuis la page Équipements. La seule déclaration qu'une ligne établie
 * d'après le parc admet encore — la table le dit (`declarationAdmise`). Le
 * repère est posé ici, jamais reçu du navigateur.
 */
export async function basculerDaePartage(
  etablissementId: string,
  partage: boolean,
): Promise<DeclarationActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const { statut } = await obligationDeclarable(db, etablissementId, DAE_DETENTION);
  if (
    statut !== "etabli_par_le_parc" ||
    PRESENCE_PAR_LE_PARC[DAE_DETENTION]?.declarationAdmise !== "partage"
  ) {
    return {
      status: "error",
      message: "Le défibrillateur ne s'applique pas à cet établissement.",
    };
  }
  if (partage) {
    await db.declarationEtatPermanent.upsert({
      where: {
        etablissementId_obligationId: { etablissementId, obligationId: DAE_DETENTION },
      },
      update: { declareLe: new Date(), note: NOTE_DAE_PARTAGE },
      create: { etablissementId, obligationId: DAE_DETENTION, note: NOTE_DAE_PARTAGE },
    });
  } else {
    await db.declarationEtatPermanent.deleteMany({
      where: { etablissementId, obligationId: DAE_DETENTION, note: NOTE_DAE_PARTAGE },
    });
  }
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  revalidatePath(`/etablissements/${etablissementId}/etats-permanents`);
  revalidatePath(`/etablissements/${etablissementId}/registre`, "layout");
  return { status: "success" };
}

/** L'obligation de détention du défibrillateur (CCH R. 157-2). */
const DAE_DETENTION = "dae-erp-detention";

/** La borne du nom d'un fichier, comme la base (`PieceEtatPermanent_bornes`). */
const NOM_FICHIER_MAX = 255;

/**
 * Déposer le fichier d'un écrit que le règlement fait annexer au registre
 * (ADR-056) : le schéma d'organisation de la sécurité, un contrat, une notice.
 *
 * DÉPOSER VAUT DÉCLARER (§ 3) : la déclaration « en place » est créée ou
 * redatée, sa note gardée. Rojer ne lit pas le fichier — la phrase sous les
 * réponses le dit toujours.
 *
 * L'ancien précédent part, le fichier en cours devient le précédent (§ 4,
 * `preparerUnDepot`).
 * Le fichier neuf est écrit AVANT la base et effacé si la base refuse ; les
 * anciens sont libérés APRÈS, comme partout (`suppression/fichiers.ts`).
 */
export async function deposerFichierEnPlace(
  etablissementId: string,
  obligationId: string,
  formData: FormData,
): Promise<DeclarationActionState> {
  await verifierSaisie();
  const { compte, db } = await assertEtablissementDuCompte(etablissementId);

  const garde = await obligationDeclarable(db, etablissementId, obligationId);
  if (garde.statut !== true || !annexeDeLaLigne(obligationId, garde.projete)) {
    return {
      status: "error",
      message: "Cette ligne ne reçoit pas de fichier : seuls les écrits que le règlement fait annexer au registre de sécurité en reçoivent.",
    };
  }

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { status: "error", message: "Choisissez un fichier à déposer." };
  }
  if (fichier.name.length > NOM_FICHIER_MAX) {
    return {
      status: "error",
      message: `Le nom du fichier ne peut pas dépasser ${NOM_FICHIER_MAX} caractères. Renommez-le, puis réessayez.`,
    };
  }
  if (!stockageEnService()) {
    return { status: "error", message: MESSAGE_DEPOT_NON_CONFIGURE };
  }
  const val = await validerFichier(fichier);
  if (!val.ok) return { status: "error", message: val.erreur };

  const cle = clePieceEtatPermanent(etablissementId, obligationId, fichier.name);
  try {
    // Le plafond de stockage de la formule (ADR-053 § 14), avant d'écrire.
    const refus = await deposerFichier(db, compte.compteId, cle, Buffer.from(await fichier.arrayBuffer()), val.mime, { etablissementId });
    if (refus) return { status: "error", message: refus };
  } catch (e) {
    // Une redirection (site gelé, rôle) n'est pas un échec : Next la reprend.
    unstable_rethrow(e);
    console.error(`[etats-permanents/depot] écriture du fichier impossible (${cle})`, e);
    return { status: "error", message: MESSAGE_ECHEC_ENREGISTREMENT };
  }

  const maintenant = new Date();
  let aLiberer: string[];
  try {
    aLiberer = await db.$transaction(async (tx) => {
      const anciens = await preparerUnDepot(tx, etablissementId, obligationId, maintenant);
      await tx.pieceEtatPermanent.create({
        data: {
          etablissementId,
          obligationId,
          fichierCle: cle,
          fichierNom: fichier.name,
          fichierMime: val.mime,
          fichierTaille: val.taille,
          deposeLe: maintenant,
        },
      });
      await tx.declarationEtatPermanent.upsert({
        where: { etablissementId_obligationId: { etablissementId, obligationId } },
        update: { declareLe: maintenant },
        create: { etablissementId, obligationId, declareLe: maintenant },
      });
      return anciens;
    });
  } catch (e) {
    // Deux dépôts simultanés sur la même ligne : l'index unique partiel
    // refuse le second, dont le fichier ne serait plus référencé.
    console.error(`[etats-permanents/depot] enregistrement refusé (${cle})`, e);
    await abandonnerFichiers(db, [cle], "etats-permanents/depot-refuse");
    // Le site gelé refuse l'écriture par une redirection (ADR-053 § 14) : le
    // fichier est rendu, puis la redirection repart, comme pour la photo.
    unstable_rethrow(e);
    return { status: "error", message: MESSAGE_ECHEC_ENREGISTREMENT };
  }
  await abandonnerFichiers(db, aLiberer, "etats-permanents/depot");

  revalidatePath(`/etablissements/${etablissementId}/etats-permanents`);
  // Déposer vaut déclarer : les mêmes surfaces que « Oui, c'est en place »
  // (relecture du 2026-11-05).
  revalidatePath(`/etablissements/${etablissementId}/equipe`, "layout");
  revalidatePath(`/etablissements/${etablissementId}/registre`, "layout");
  // Le DAE partagé se déclare depuis la page Équipements (ADR-057 § 4).
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  return { status: "success" };
}
