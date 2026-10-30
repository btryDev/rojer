"use server";

import { revalidatePath } from "next/cache";
import { requireEtablissement } from "@/lib/auth/scope";
import {
  clePhotoEtablissement,
  getStorage,
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_ECHEC_ENREGISTREMENT,
  stockageEnService,
} from "@/lib/storage";
import { validerFichier } from "@/lib/rapports/validator";
import { libererFichiers } from "@/lib/suppression/fichiers";
import { REGLE_PHOTO } from "./photo-regle";

/**
 * La photo du lieu, affichée dans le hero du tableau de bord à la place de
 * l'illustration (2026-10-25, décision de la propriétaire).
 *
 * Même patron que la pièce d'un point corrigé (`actions/plan.ts`) : le fichier
 * est validé (type réel, nom, taille — `validerFichier`), écrit AVANT la base,
 * et libéré si la base refuse ; l'ancienne photo n'est libérée qu'une fois la
 * nouvelle enregistrée. L'appartenance est établie par `requireEtablissement`
 * et reportée dans le `where` de chaque écriture.
 *
 * Le navigateur ré-encode l'image avant l'envoi (`CartePhotoLieu`) : bornée à
 * 1600 px, en JPEG, sans métadonnées EXIF — donc sans la position GPS qu'un
 * téléphone y inscrit. La règle du serveur (`REGLE_PHOTO`, 2 Mo) tient même
 * si ce ré-encodage est contourné.
 */

/** Ce que rend un geste sur la photo : jamais une exception, qui ferait
 *  tomber la page entière depuis la transition qui l'appelle. */
export type ResultatPhoto = { status: "ok" } | { status: "error"; message: string };

export async function deposerPhotoEtablissement(
  etablissementId: string,
  formData: FormData,
): Promise<ResultatPhoto> {
  const { db, user, etablissement } = await requireEtablissement(etablissementId);
  const fichier = formData.get("photo");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { status: "error", message: "Aucune photo sélectionnée." };
  }
  if (!stockageEnService()) return { status: "error", message: MESSAGE_DEPOT_NON_CONFIGURE };

  const val = await validerFichier(fichier, REGLE_PHOTO);
  if (!val.ok) return { status: "error", message: val.erreur };

  const cle = clePhotoEtablissement(etablissement.id, fichier.name);
  try {
    await getStorage().put(cle, Buffer.from(await fichier.arrayBuffer()), val.mime);
  } catch (e) {
    console.error(`[etablissements/photo] écriture impossible (${cle})`, e);
    return { status: "error", message: MESSAGE_ECHEC_ENREGISTREMENT };
  }

  // Borné à la photo lue : de deux dépôts simultanés, le second ne trouve
  // plus la même et libère la sienne, au lieu d'écraser la clé du premier
  // et de la laisser orpheline dans le stockage.
  const ancienne = etablissement.photoCle;
  let enregistree = false;
  try {
    const { count } = await db.etablissement.updateMany({
      where: { id: etablissement.id, entreprise: { userId: user.id }, photoCle: ancienne },
      data: { photoCle: cle, photoMime: val.mime, photoDeposeeLe: new Date() },
    });
    enregistree = count > 0;
  } catch (err) {
    console.error("[etablissements/photo] enregistrement impossible", err);
  }
  if (!enregistree) {
    await libererFichiers([cle], "etablissements/photo");
    return { status: "error", message: MESSAGE_ECHEC_ENREGISTREMENT };
  }
  if (ancienne) await libererFichiers([ancienne], "etablissements/photo-remplacee");

  revalidatePath(`/etablissements/${etablissement.id}`);
  return { status: "ok" };
}

export async function retirerPhotoEtablissement(
  etablissementId: string,
): Promise<ResultatPhoto> {
  const { db, user, etablissement } = await requireEtablissement(etablissementId);
  if (!etablissement.photoCle) return { status: "ok" };
  // Borné à la clé lue : un dépôt concurrent qui l'aurait déjà remplacée
  // n'est pas effacé par ce retrait.
  try {
    const { count } = await db.etablissement.updateMany({
      where: {
        id: etablissement.id,
        entreprise: { userId: user.id },
        photoCle: etablissement.photoCle,
      },
      data: { photoCle: null, photoMime: null, photoDeposeeLe: null },
    });
    if (count > 0) await libererFichiers([etablissement.photoCle], "etablissements/photo-retiree");
  } catch (err) {
    console.error("[etablissements/photo] retrait impossible", err);
    return { status: "error", message: MESSAGE_ECHEC_ENREGISTREMENT };
  }
  revalidatePath(`/etablissements/${etablissement.id}`);
  return { status: "ok" };
}
