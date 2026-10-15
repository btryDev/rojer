import { cleJourCivil, depuisCleJourCivil, estJourCivilReel } from "@/lib/dates";
import { z } from "zod";
import { RESULTATS } from "./resultats";

/**
 * Validation du formulaire d'upload d'un rapport de vérification.
 *
 * On valide ici les métadonnées **hors fichier**. Le fichier lui-même
 * (taille + MIME) est validé séparément dans `validator.ts` car la
 * sérialisation par FormData perd les types.
 *
 * Les résultats, leurs libellés et la table résultat → statut vivent dans
 * `resultats.ts` depuis le 2026-10-14 (audit Next.js, M8) : ils sont lus
 * jusque dans des composants clients (pilule de statut, badge, formulaire),
 * et les prendre ici embarquait zod dans le paquet de `/login`.
 */

const DATE_FMT = /^\d{4}-\d{2}-\d{2}$/;

export const rapportMetadataSchema = z.object({
  dateRapport: z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .refine(estJourCivilReel, "Cette date n'existe pas")
    .transform((v) => depuisCleJourCivil(v))
    .refine((d) => !Number.isNaN(d.getTime()), "Date invalide")
    // PAS DE CONTRÔLE DANS LE FUTUR, et depuis l'ADR-034 la faute de frappe
    // ne se corrige plus d'elle-même : la ligne roule sur la date du rapport,
    // et un rapport plus récent — « 2062 » au lieu de « 2026 » — rend tout
    // dépôt suivant antidaté, donc sans effet. La ligne resterait figée en
    // 2063 jusqu'à ce que quelqu'un pense à supprimer la pièce. Avant, le
    // dépôt suivant réécrivait la date et effaçait la coquille.
    //
    // Borne en JOUR CIVIL de Paris (ADR-011) : un contrôle fait aujourd'hui
    // est accepté toute la journée, y compris depuis un serveur en UTC.
    .refine(
      (d) => cleJourCivil(d) <= cleJourCivil(new Date()),
      "Un rapport ne peut pas être daté dans le futur : c'est la date à laquelle le contrôle a eu lieu.",
    ),
  organismeVerif: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(200).optional(),
  ),
  resultat: z.enum(RESULTATS),
  commentaires: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(2000).optional(),
  ),
});

export type RapportMetadata = z.infer<typeof rapportMetadataSchema>;
