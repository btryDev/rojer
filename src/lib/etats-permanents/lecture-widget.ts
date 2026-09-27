"use server";

import { requireUser } from "@/lib/auth/require-user";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { etatsPermanentsDuDossier } from "./queries";
import { lignesDuWidget, type LigneWidgetEtat } from "./widget";

/**
 * Les lignes du widget « Ce qui doit être en place », lues à la demande.
 *
 * POURQUOI UNE ACTION ET NON LE BUNDLE (contre-lecture du 2026-09-27). La
 * première écriture chargeait ces lignes dans le bundle du tableau de bord, à
 * chaque affichage — un passage complet du moteur et une lecture des
 * déclarations — alors que le widget n'est pas au board par défaut et que la
 * composition du board vit dans le navigateur, que le serveur ne voit pas. Le
 * widget monté les demande ; absent, rien n'est lu.
 *
 * Même lecture que l'écran : `etatsPermanentsDuDossier` → `listerEtatsPermanents`.
 */
export async function lignesEtatsPermanentsPourWidget(
  etablissementId: string,
): Promise<LigneWidgetEtat[]> {
  await assertEtablissementOwnership(etablissementId);
  const user = await requireUser();
  return lignesDuWidget(await etatsPermanentsDuDossier(etablissementId, user.id));
}
