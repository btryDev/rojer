import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";
import {
  porteursComptesPar,
  type LigneSondee,
} from "@/lib/perimetre/porteurs-comptes";
import type { PorteurObligation } from "@/lib/referentiels/conformite";

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
  const user = await requireUser();
  const rows = await prisma.batiment.findMany({
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
 * est porté ici aussi, pour la raison écrite plus bas dans
 * `listerBatimentsAvecCharge`. Un établissement d'un autre compte lève donc
 * l'erreur d'invariant plutôt que de rendre son bâtiment — c'est le bon
 * refus : bruyant, et sans rien divulguer de l'autre dossier.
 */
export async function batimentParDefaut(etablissementId: string) {
  const user = await requireUser();
  const b = await prisma.batiment.findFirst({
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
  const user = await requireUser();
  const b = await prisma.batiment.findFirst({
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

/**
 * Les bâtiments avec leur charge de travail — ce que le hero du tableau de
 * bord affiche sur chaque carte-bâtiment.
 *
 * Requête distincte de `listerBatimentsDeLEtablissement` à dessein : celle-ci
 * lit toutes les occurrences de vérification de l'établissement, ce que les
 * autres appelants (sélecteur, formulaires) n'ont aucune raison de payer.
 *
 * Les compteurs passent par `repartirVerifications`, donc par les prédicats
 * canoniques de `@/lib/dates/retard` (ADR-011). Recompter « en retard » à la
 * main ici aurait fabriqué une septième définition du retard — exactement ce
 * que ce module a été écrit pour empêcher : le hero et le calendrier
 * annonceraient deux chiffres différents sur la même donnée.
 *
 * L'horloge est injectée : le rendu reste déterministe et testable.
 */
export type BatimentCharge = BatimentListe & {
  /** Occurrences dont l'échéance est passée sans réalisation. */
  nbEnRetard: number;
};

export async function listerBatimentsAvecCharge(
  etablissementId: string,
  now: Date,
): Promise<BatimentCharge[]> {
  const [user, batiments] = await Promise.all([
    requireUser(),
    listerBatimentsDeLEtablissement(etablissementId),
  ]);

  const verifs = await prisma.verification.findMany({
    where: {
      etablissementId,
      // Le prédicat d'appartenance est porté même si `listerBatimentsDeLEtablissement`
      // vient de le vérifier : sans RLS (ADR-005, Prisma en rôle postgres),
      // l'isolation est une convention applicative, et une lecture qui ne la
      // porte pas devient une fuite le jour où quelqu'un rend `verifs`.
      etablissement: { entreprise: { userId: user.id } },
    },
    select: {
      statut: true,
      datePrevue: true,
      dateRealisee: true,
      // Marqueur d'archivage (ADR-012) : une ligne dont l'obligation ne
      // s'applique plus ne pèse pas sur la charge d'un bâtiment.
      libelleObligation: true,
      equipement: { select: { batimentId: true, actif: true } },
    },
  });

  return grouperChargeParBatiment(batiments, verifs, now);
}

/**
 * Ce que la charge par zone retient, et ce qu'elle jette — **en TypeScript, et
 * en un seul endroit**.
 *
 * La restriction vivait auparavant dans le `where` de la lecture ci-dessus, sous
 * la forme `equipement: { actif: true }`, c'est-à-dire une jointure interne. Elle
 * y était juste et elle y reste juste — une échéance portée par l'établissement
 * (ADR-022) n'est dans aucune zone : la compter dans chacune gonflerait autant de
 * pastilles qu'il y a de volumes, la compter dans une seule serait arbitraire.
 *
 * Ce qui a changé, c'est **où** elle est écrite, et pour une raison précise :
 * une exclusion posée en SQL n'est pas sondable. La plaque des zones affirme au
 * dirigeant ce qu'elle compte, et cette affirmation doit pouvoir se rapprocher
 * mécaniquement de ce qui se passe (`perimetre/porteurs-comptes.ts`) — ce qui
 * suppose une fonction qu'on puisse appeler avec une ligne de chaque porteur. Le
 * `where` gardait deux gardes qui disaient la même chose sans qu'aucun test ne
 * puisse le vérifier ; il n'en reste qu'une, et c'est celle-ci.
 *
 * Le coût est de lire quelques lignes de plus — celles d'établissement et de
 * salarié, jetées ici plutôt qu'en base. Sur un dossier, c'est quelques dizaines
 * de lignes.
 */
export function grouperChargeParBatiment<
  B extends { id: string },
  V extends {
    statut: string;
    datePrevue: Date;
    dateRealisee: Date | null;
    libelleObligation: string;
    equipement: { batimentId: string; actif: boolean } | null;
  },
>(batiments: B[], verifs: readonly V[], now: Date): (B & { nbEnRetard: number })[] {
  const parBatiment = new Map<string, V[]>();
  for (const v of verifs) {
    // Sans équipement, pas de zone : c'est ici, et nulle part ailleurs, que
    // les échéances de l'établissement et des salariés sortent du compte.
    // Un appareil retiré (ADR-012) sort par la même porte.
    if (!v.equipement || !v.equipement.actif) continue;
    const cle = v.equipement.batimentId;
    const liste = parBatiment.get(cle);
    if (liste) liste.push(v);
    else parBatiment.set(cle, [v]);
  }

  return batiments.map((b) => {
    // `derniereRealisation: null` est un choix : seul `enRetard` est lu
    // ci-dessous, et il ne dépend pas de ce qui a été fait (ADR-034). Lire les
    // rapports coûterait une requête pour un compte qu'on jette.
    const etat = repartirVerifications(
      (parBatiment.get(b.id) ?? []).map((v) => ({
        ...v,
        derniereRealisation: null,
      })),
      now,
    );
    // Seul le retard est rendu : la pastille d'un volume ne dit qu'une
    // chose. `nbSous30j` était calculé, typé et sérialisé jusqu'au client
    // sans qu'aucun écran ne le lise — un compteur en sommeil finit par
    // diverger de celui qui compte vraiment.
    return { ...b, nbEnRetard: etat.enRetard.length };
  });
}

/**
 * Ce que la plaque des zones compte vraiment, **mesuré** en faisant tourner son
 * agrégation sur une ligne par porteur.
 *
 * La sonde d'équipement est rattachée à une zone fictive et déclarée active ;
 * les deux autres n'ont pas d'équipement, donc pas de zone. Ce que
 * `grouperChargeParBatiment` en fait décide de la phrase affichée sous la
 * plaque — et le jour où elle en fera autre chose, la phrase suivra.
 */
export function porteursDeLaPlaqueZones(
  now: Date = new Date(),
): Set<PorteurObligation> {
  const ZONE = "sonde-zone";
  return porteursComptesPar(
    (lignes: LigneSondee[]) =>
      grouperChargeParBatiment(
        [{ id: ZONE }],
        lignes.map((l) => ({
          ...l,
          equipement: l.equipementId
            ? { batimentId: ZONE, actif: true }
            : null,
        })),
        now,
      ).reduce((n, b) => n + b.nbEnRetard, 0),
    now,
  );
}
