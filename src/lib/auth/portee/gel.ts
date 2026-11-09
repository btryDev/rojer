import "server-only";
// Le gel (ADR-053 § 14) : refusé dans le client borné, AVANT l'écriture —
// jamais un filtre silencieux. Lecture et suppression ouvertes. Hors de
// portée : le client brut et les accès sans session (`quotas-gel-garde.test.ts`).

import { AsyncLocalStorage } from "node:async_hooks";
import { redirect } from "next/navigation";
import type { PrismaClient } from "@prisma/client";
import { avecBorne, borne, filtreVers, relations, type Geles, type Portee } from "./borne";

export type { Geles };

/** Où un refus renvoie : la page qui dit pourquoi, et ce qui lève le gel. */
export const PAGE_DU_GEL = "/compte/abonnement?saisie=gelee";

/**
 * La transaction interactive en cours (son client), posée par le client borné
 * (`client.ts`) : le gel y lit ce que l'écriture vise. Lue hors de la
 * transaction, une ligne créée dans la même transaction ne serait pas vue, et
 * la lecture prendrait une connexion de plus au pool (`connection_limit`,
 * `BASE_POOL` sur Clever Cloud, `scripts/demarrer-cc.sh`).
 * [2026-11-09 : ~~`connection_limit=1` en production~~ — c'était Vercel.]
 */
export const transactionEnCours = new AsyncLocalStorage<object>();

/**
 * Les gestes qu'un gel laisse ouverts, liste fermée (`quotas-gel-garde.test.ts`) :
 * supprimer, retirer un accès ou une page publique, demander de l'aide — les
 * mêmes que la saisie fermée laisse ouverts (ADR-053 § 3).
 */
const ouvertAuGel = new AsyncLocalStorage<true>();
/**
 * Ouvre au gel la suite de l'action en cours. À appeler APRÈS son premier
 * `await` (sa garde) : le contexte de l'appelant n'en hérite pas, seule la
 * suite de cette action.
 */
export function ouvrirAuGel(): void {
  ouvertAuGel.enterWith(true);
}

/** Les opérations refusées sur un élément gelé (ni la lecture, ni la suppression). */
const ECRITURES_GELEES: ReadonlySet<string> = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "upsert"]);

type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === "object" && v !== null && !Array.isArray(v);
const lister = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);

const RACINES = [
  ["Etablissement", "etablissements"],
  ["Prestataire", "prestataires"],
] as const;

/** Le filtre des lignes gelées d'un modèle, ou `null` s'il n'en a aucune à craindre. */
export function filtreGele(nom: string, geles: Geles): Objet | null {
  const ou = RACINES.flatMap(([racine, cle]) => {
    const f = geles[cle].length > 0 && filtreVers(nom, racine, { id: { in: [...geles[cle]] } });
    return f ? [f] : [];
  });
  return ou.length > 0 ? { OR: ou } : null;
}

type Delegue = { count(a: object): Promise<number>; findUnique(a: object): Promise<unknown> };
/** Le lecteur du gel : la transaction en cours, sinon le client brut. */
const delegue = (base: PrismaClient, nom: string) =>
  ((transactionEnCours.getStore() ?? base) as unknown as Record<string, Delegue>)[nom.charAt(0).toLowerCase() + nom.slice(1)];

/**
 * Les lignes qu'une écriture désigne : clé étrangère (nue ou en `{ set }`),
 * `connect` par n'importe quelle clé unique, et les créations imbriquées (les
 * autres formes imbriquées, la borne les refuse). `actuelle` : la ligne
 * qu'une mise à jour modifie, telle qu'en base — une clé qu'elle garde à
 * l'identique ne désigne rien de neuf (modifier un permis qui nomme déjà un
 * prestataire gelé reste possible ; en désigner un, non).
 */
function designees(nom: string, data: unknown, sortie: Map<string, Objet[]>, actuelle?: Objet | null): void {
  for (const ligne of lister(data)) {
    if (!estObjet(ligne)) continue;
    for (const r of relations(nom)) {
      const garde = (id: unknown) => actuelle != null && r.cle !== undefined && actuelle[r.cle] === id;
      const ajouter = (where: Objet) => sortie.set(r.cible, [...(sortie.get(r.cible) ?? []), where]);
      const v = r.cle ? ligne[r.cle] : undefined;
      const id = estObjet(v) ? v.set : v;
      if (typeof id === "string" && !garde(id)) ajouter({ id });
      const n = ligne[r.nom];
      if (!estObjet(n)) continue;
      for (const c of lister(n.connect)) if (estObjet(c) && !garde(c.id)) ajouter(c);
      // Une création imbriquée est une création : tout ce qu'elle désigne est relevé.
      designees(r.cible, n.create, sortie);
    }
  }
}

/** Refuse l'écriture : la page de l'abonnement dit pourquoi (redirection, comme `verifierSaisie`). */
function refuser(nom: string, operation: string): never {
  console.info(JSON.stringify({ type: "ecriture_gelee_refusee", modele: nom, operation }));
  redirect(PAGE_DU_GEL);
}

/**
 * Refuse, AVANT d'écrire, une écriture qui modifie une ligne gelée ou en
 * désigne une. `base` : le client brut, pour lire ce que l'écriture vise —
 * les identifiants gelés sont ceux du compte de la portée. La ligne qu'une
 * mise à jour modifie est lue bornée au compte (`borne(nom, portee)`) : son
 * `where` vient de l'appelant (audit rls_audit du 2026-11-09, ADR-051). Les
 * autres lectures portent déjà le filtre du gel, fait des identifiants du
 * compte.
 */
export async function verifierGel(
  base: PrismaClient,
  nom: string,
  operation: string,
  args: unknown,
  portee: Portee & { geles: Geles },
): Promise<void> {
  const geles = portee.geles;
  if (!ECRITURES_GELEES.has(operation) || ouvertAuGel.getStore()) return;
  const a: Objet = estObjet(args) ? args : {};
  const f = filtreGele(nom, geles);
  // La ligne modifiée (le `where` unique, borné au gel comme la borne le fait au compte).
  if (f && (operation === "update" || operation === "upsert"))
    if (await delegue(base, nom).findUnique({ where: avecBorne(a.where, f), select: { id: true } })) refuser(nom, operation);
  if (f && operation === "updateMany" && (await delegue(base, nom).count({ where: avecBorne(a.where, f) })) > 0)
    refuser(nom, operation);
  // Les lignes désignées par ce qui s'écrit ; pour une mise à jour, au regard
  // de la ligne en base, lue par la transaction en cours.
  const vues = new Map<string, Objet[]>();
  const misAJour = operation === "update" ? a.data : operation === "upsert" ? a.update : undefined;
  if (misAJour !== undefined) {
    const cles = relations(nom).flatMap((r) => (r.cle ? [[r.cle, true] as const] : []));
    const actuelle = cles.length
      ? ((await delegue(base, nom).findUnique({
          where: avecBorne(a.where, borne(nom, portee)),
          select: Object.fromEntries(cles),
        })) as Objet | null)
      : null;
    designees(nom, misAJour, vues, actuelle);
  }
  if (operation !== "update") designees(nom, operation === "upsert" ? a.create : a.data, vues);
  for (const [cible, wheres] of vues) {
    const fc = filtreGele(cible, geles);
    if (fc && (await delegue(base, cible).count({ where: avecBorne({ OR: wheres }, fc) })) > 0) refuser(nom, operation);
  }
}
