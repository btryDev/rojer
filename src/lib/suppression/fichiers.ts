/**
 * Les fichiers stockés qu'une suppression emporte, et leur libération.
 *
 * LE DÉFAUT QUI FAIT CE MODULE (2026-09-27, décision de la propriétaire :
 * « A et correction du défaut »). Une suppression en base — établissement,
 * entreprise — effaçait les lignes en cascade et laissait leurs fichiers dans
 * le stockage : rapports de vérification, pièces des prestataires, pièces du
 * registre d'accessibilité, analyses de légionelles. Seul `supprimerRapport`
 * libérait le sien. Des pièces qu'on disait « supprimées définitivement »
 * restaient donc lisibles par qui détient la clé.
 *
 * LA RÈGLE, en trois temps, sur le patron de `supprimerRapport` :
 *   1. collecter les clés AVANT la suppression en base — après, les lignes qui
 *      les portaient n'existent plus ;
 *   2. supprimer en base ;
 *   3. libérer les fichiers. Un échec du stockage n'annule PAS l'effacement en
 *      base (il est déjà commité, et le défaire rendrait visibles des données
 *      qu'on a dit supprimées) : il est journalisé, clé par clé.
 *
 * `CLES_STOCKEES` énumère les colonnes du schéma qui portent une clé de
 * stockage ; `fichiers.test.ts` relit `schema.prisma` et fait échouer toute
 * colonne `…Cle` qui n'y figure pas. `DuerpVersion.pdfUrl` n'y est pas : aucun
 * code ne l'écrit (`controle-zip/route.ts` le dit), et une version figée rend
 * de toute façon l'établissement insupprimable (R. 4121-4).
 */

import type { Prisma } from "@prisma/client";
import { getStorage } from "@/lib/storage";

/** Modèle → colonnes qui portent une clé de stockage. */
export const CLES_STOCKEES = {
  RapportVerification: ["fichierCle"],
  Prestataire: ["attestationUrssafCle", "assuranceRcProCle", "kbisCle"],
  RegistreAccessibilite: [
    "attestationCle",
    "agendaAdapCle",
    "attestationFormationCle",
  ],
  AnalyseLegionelle: ["rapportCle"],
} as const;

type Client = Prisma.TransactionClient;

const nonNulles = (l: (string | null)[]) =>
  l.filter((c): c is string => typeof c === "string" && c.length > 0);

/**
 * Toutes les clés de stockage que la suppression de ces établissements
 * emporte — chaque modèle de `CLES_STOCKEES`, par son chemin jusqu'à
 * l'établissement.
 */
export async function clesDesEtablissements(
  tx: Client,
  etablissementIds: string[],
): Promise<string[]> {
  if (etablissementIds.length === 0) return [];
  const dans = { in: etablissementIds };
  const [rapports, prestataires, registres, analyses] = await Promise.all([
    tx.rapportVerification.findMany({
      where: { etablissementId: dans },
      select: { fichierCle: true },
    }),
    tx.prestataire.findMany({
      where: { etablissementId: dans },
      select: { attestationUrssafCle: true, assuranceRcProCle: true, kbisCle: true },
    }),
    tx.registreAccessibilite.findMany({
      where: { etablissementId: dans },
      select: { attestationCle: true, agendaAdapCle: true, attestationFormationCle: true },
    }),
    tx.analyseLegionelle.findMany({
      where: { carnet: { etablissementId: dans } },
      select: { rapportCle: true },
    }),
  ]);
  return nonNulles([
    ...rapports.map((r) => r.fichierCle),
    ...prestataires.flatMap((p) => [p.attestationUrssafCle, p.assuranceRcProCle, p.kbisCle]),
    ...registres.flatMap((r) => [r.attestationCle, r.agendaAdapCle, r.attestationFormationCle]),
    ...analyses.map((a) => a.rapportCle),
  ]);
}

/**
 * Libère les fichiers, APRÈS que la base a tranché. Ne lève jamais : un
 * échec est journalisé et compté, l'effacement en base reste acquis.
 */
export async function libererFichiers(
  cles: string[],
  contexte: string,
): Promise<{ liberes: number; echecs: number }> {
  let echecs = 0;
  const stockage = getStorage();
  for (const cle of new Set(cles)) {
    try {
      await stockage.delete(cle);
    } catch (err) {
      echecs += 1;
      console.error(`[${contexte}] fichier non libéré : ${cle}`, err);
    }
  }
  return { liberes: new Set(cles).size - echecs, echecs };
}
