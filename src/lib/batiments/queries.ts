import { requireCompte } from "@/lib/auth/compte";
import "server-only";

/**
 * Lectures des bâtiments d'un établissement (ADR-019).
 *
 * Invariant : tout établissement a au moins un bâtiment — la migration en a
 * créé un par établissement existant, la création d'établissement en crée un
 * dans la même transaction, la suppression du dernier est refusée.
 */

export type BatimentListe = {
  id: string;
  nom: string;
  complementAdresse: string | null;
  ordre: number;
  nbEquipements: number;
};

export async function listerBatimentsDeLEtablissement(
  etablissementId: string,
): Promise<BatimentListe[]> {
  const { user, db } = await requireCompte();
  const rows = await db.batiment.findMany({
    where: { etablissementId, etablissement: { entreprise: { userId: user.id } } },
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      nom: true,
      complementAdresse: true,
      ordre: true,
      _count: { select: { equipements: { where: { actif: true } } } },
    },
  });
  return rows.map(({ _count, ...b }) => ({ ...b, nbEquipements: _count.equipements }));
}

/**
 * Le bâtiment d'ordre 0 — celui vers lequel vont les équipements créés par un
 * chemin qui ne demande pas de bâtiment à l'utilisateur (pré-remplissage
 * post-onboarding). À appeler dans un périmètre déjà vérifié.
 *
 * Lève si l'établissement n'a aucun bâtiment : c'est une violation
 * d'invariant, pas un cas à rattraper en silence.
 *
 * « Périmètre déjà vérifié » décrit l'usage, pas une dispense : le prédicat
 * est porté ici aussi — sans RLS (ADR-005, Prisma en rôle postgres),
 * l'isolation est une convention applicative, et une lecture qui ne la porte
 * pas devient une fuite le jour où un appelant nouveau ne vérifie pas
 * [2026-10-25 : la raison était écrite dans `listerBatimentsAvecCharge`,
 * retirée avec la plaque des zones du hero]. Un établissement d'un autre compte lève donc
 * l'erreur d'invariant plutôt que de rendre son bâtiment — c'est le bon
 * refus : bruyant, et sans rien divulguer de l'autre dossier.
 */
export async function batimentParDefaut(etablissementId: string) {
  const { user, db } = await requireCompte();
  const b = await db.batiment.findFirst({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
    },
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
    select: { id: true, nom: true },
  });
  if (!b) {
    throw new Error(
      `Établissement ${etablissementId} sans bâtiment : invariant ADR-019 rompu`,
    );
  }
  return b;
}

/**
 * Résout un `batimentId` optionnel venu d'un formulaire : vide = non
 * précisé (`null`), sinon le bâtiment doit appartenir à l'établissement —
 * la base ne le vérifie pas (clé simple), l'action le fait ici. `ok: false`
 * = id étranger ou inconnu.
 *
 * L'`etablissementId` vient lui aussi de l'appelant, et cette fonction est
 * ce qui **valide** un identifiant avant qu'il soit écrit : sans le prédicat,
 * un `etablissementId` non gardé lui ferait confirmer comme valide le
 * bâtiment d'un autre compte, et le permis de feu s'y rattacherait. Ses trois
 * appelants — `carnet-sanitaire`, `permis-feu`, `plan-prevention` — posent
 * bien `assertEtablissementOwnership` avant l'appel ; c'est justement ce qui
 * ne doit pas être la seule chose qui tienne.
 */
export async function resoudreBatimentOptionnel(
  etablissementId: string,
  batimentId: string | null | undefined,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (!batimentId) return { ok: true, id: null };
  const { user, db } = await requireCompte();
  const b = await db.batiment.findFirst({
    where: {
      id: batimentId,
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
    },
    select: { id: true },
  });
  return b ? { ok: true, id: b.id } : { ok: false };
}

// `estMultiBatiments` et la résolution du filtre d'URL vivent dans
// `./filtre` : ce sont des règles pures, elles n'ont rien à faire dans un
// module qui ouvre la base.
