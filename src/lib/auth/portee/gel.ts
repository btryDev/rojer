import "server-only";
// Le gel (ADR-053 § 14) : ce qui dépasse la formule d'un compte qui a payé —
// les établissements et prestataires au-delà du plafond, les plus récents —
// reste lisible et exportable, mais ne se modifie plus et ne sert plus de
// source à une création. Le refus vit ici, dans le client borné, la seule
// couche que traversent toutes les écritures de la session (ADR-051) ; il
// précède l'écriture, jamais un filtre silencieux.
//
// Ouvert : la lecture, et la SUPPRESSION (règle 9 ; supprimer est le moyen de
// dégeler). Hors de portée, et voulus : les écritures du client brut
// (régénération du calendrier) et des accès sans session (signature d'un
// tiers, dépôt d'un rapport par jeton), dont la portée ne porte pas le gel
// (`quotas-gel-garde.test.ts`, liste fermée).

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { CORRESPONDANCE } from "./correspondance";

/** Les identifiants gelés d'un compte. */
export type Geles = Readonly<{ etablissements: readonly string[]; prestataires: readonly string[] }>;

/** Où un refus renvoie : la page qui dit pourquoi, et ce qui lève le gel. */
export const PAGE_DU_GEL = "/compte/abonnement?saisie=gelee";

/** Les opérations refusées sur un élément gelé (ni la lecture, ni la suppression). */
export const ECRITURES_GELEES: ReadonlySet<string> = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
]);

type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === "object" && v !== null && !Array.isArray(v);
const lister = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);

const MODELES = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const RACINES = [
  ["Etablissement", "etablissements"],
  ["Prestataire", "prestataires"],
] as const;

/** La cible d'une relation (`Risque.unite` → `UniteTravail`). */
const cibleDe = (nom: string, champ: string) => MODELES.get(nom)?.fields.find((f) => f.name === champ)?.type;

/** Les champs de relation qui mènent de `nom` à `racine` (vide : c'est elle), ou `null`. */
function chemin(nom: string, racine: string): string[] | null {
  if (nom === racine) return [];
  const c = CORRESPONDANCE[nom as keyof typeof CORRESPONDANCE] as { parent?: string } | undefined;
  if (!c?.parent) return null;
  const suite = chemin(cibleDe(nom, c.parent)!, racine);
  return suite ? [c.parent, ...suite] : null;
}

/** Le filtre des lignes gelées d'un modèle, ou `null` s'il n'en a aucune à craindre. */
export function filtreGele(nom: string, geles: Geles): Objet | null {
  const ou = RACINES.flatMap(([racine, cle]) => {
    const ids = geles[cle];
    const c = ids.length > 0 ? chemin(nom, racine) : null;
    return c ? [c.reduceRight<Objet>((f, champ) => ({ [champ]: f }), { id: { in: [...ids] } })] : [];
  });
  return ou.length > 0 ? { OR: ou } : null;
}

type Delegue = { count(a: object): Promise<number>; findUnique(a: object): Promise<{ id: string } | null> };
const delegue = (base: PrismaClient, nom: string) =>
  (base as unknown as Record<string, Delegue>)[nom.charAt(0).toLowerCase() + nom.slice(1)];

/** Vrai si l'une des lignes `id` du modèle est gelée. */
async function estGele(base: PrismaClient, nom: string, ids: string[], geles: Geles): Promise<boolean> {
  const f = filtreGele(nom, geles);
  if (!f || ids.length === 0) return false;
  return (await delegue(base, nom).count({ where: { AND: [{ id: { in: ids } }, f] } })) > 0;
}

/**
 * Les lignes qu'une écriture DÉSIGNE (une clé, un `connect`), et les données
 * des créations imbriquées, à suivre : tout ce qui ferait d'un élément gelé
 * la source d'une création ou d'une modification.
 */
function designees(nom: string, data: unknown, sortie: Map<string, Set<string>>): void {
  for (const ligne of lister(data)) {
    if (!estObjet(ligne)) continue;
    for (const f of MODELES.get(nom)?.fields ?? []) {
      if (f.kind !== "object") continue;
      const ajouter = (id: unknown) => {
        if (typeof id === "string") sortie.set(f.type, (sortie.get(f.type) ?? new Set()).add(id));
      };
      const cle = f.relationFromFields?.[0];
      if (cle) ajouter(ligne[cle]);
      const n = ligne[f.name];
      if (!estObjet(n)) continue;
      for (const c of lister(n.connect)) if (estObjet(c)) ajouter(c.id);
      for (const c of lister(n.connectOrCreate)) if (estObjet(c)) designees(f.type, c.create, sortie);
      designees(f.type, n.create, sortie);
      if (estObjet(n.createMany)) designees(f.type, n.createMany.data, sortie);
      // Une ligne liée modifiée par son parent : désignée par son `where`.
      for (const u of [...lister(n.upsert), ...lister(n.update), ...lister(n.updateMany)]) {
        if (!estObjet(u)) continue;
        if (estObjet(u.where)) ajouter(u.where.id);
        designees(f.type, "data" in u ? u.data : "create" in u ? [u.create, u.update] : u, sortie);
      }
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
 * les identifiants gelés sont ceux du compte de la portée.
 */
export async function verifierGel(base: PrismaClient, nom: string, operation: string, args: unknown, geles: Geles): Promise<void> {
  if (!ECRITURES_GELEES.has(operation)) return;
  const a: Objet = estObjet(args) ? args : {};
  const f = filtreGele(nom, geles);
  // Les lignes modifiées.
  if (f && (operation === "update" || operation === "upsert")) {
    const ligne = await delegue(base, nom).findUnique({ where: a.where as object, select: { id: true } });
    if (ligne && (await estGele(base, nom, [ligne.id], geles))) refuser(nom, operation);
  }
  if (f && operation === "updateMany" && (await delegue(base, nom).count({ where: { AND: [a.where ?? {}, f] } })) > 0)
    refuser(nom, operation);
  // Les lignes désignées par ce qui s'écrit.
  const vues = new Map<string, Set<string>>();
  designees(nom, operation === "upsert" ? [a.create, a.update] : a.data, vues);
  for (const [cible, ids] of vues) if (await estGele(base, cible, [...ids], geles)) refuser(nom, operation);
}
