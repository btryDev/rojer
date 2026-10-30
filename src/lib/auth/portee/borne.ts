// La borne au compte, en fonctions pures (ADR-051 § 2) : ce que le client
// borné fait des arguments d'une opération Prisma. Aucune requête n'est émise
// ici — une requête lancée par une extension pendant une transaction part sur
// une autre connexion et ignore la transaction (doc Prisma) ; la vérification
// passe par la requête elle-même : une clé étrangère devient un `connect` qui
// porte la borne et échoue s'il ne trouve rien.
//
// Prisma ne transmet aux extensions que l'opération de tête : les écritures
// imbriquées et les `include`/`select` sont parcourus ici. Seules les formes
// que le dépôt emploie sont servies ; les autres sont refusées.

import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";
import { CORRESPONDANCE, type Classement } from "./correspondance";

/** La portée d'un client borné : un compte (ADR-051, « Accès sans session »). */
export type Portee = { type: "compte"; userId: string };

/** Refus du client borné : opération ou modèle qu'il ne sait pas borner. */
export class ErreurPortee extends Error {
  constructor(message: string) {
    super(`Isolation des comptes : ${message}`);
    this.name = "ErreurPortee";
  }
}

type Objet = Record<string, unknown>;

// --- Table des relations, calculée une fois au chargement --------------------

/** Ce qu'est la cible d'une relation, vue du client borné. */
type Genre = "compte" | "identite" | "hors";

type Relation = {
  nom: string;
  cible: string;
  genre: Genre;
  liste: boolean;
  /** La clé étrangère portée par CE modèle, s'il en porte une. */
  cle?: string;
};

function genreDe(c: Classement): Genre {
  if ("identite" in c) return "identite";
  if ("horsCompte" in c) return "hors";
  return "compte";
}

function classement(nom: string): Classement {
  const c = (CORRESPONDANCE as Record<string, Classement>)[nom];
  if (!c) throw new ErreurPortee(`modèle non classé : ${nom}`);
  return c;
}

const RELATIONS = new Map<string, Relation[]>(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name,
    m.fields
      .filter((f) => f.kind === "object")
      .map((f) => {
        const genre = genreDe(classement(f.type));
        const de = f.relationFromFields ?? [];
        // Une clé composée, ou une clé qui ne vise pas `id`, ne se réécrit pas
        // en `connect` borné : refusée au chargement plutôt que laissée passer
        // sans borne. Le schéma n'en porte aucune.
        if (de.length > 1 || (de.length === 1 && (f.relationToFields?.[0] ?? "id") !== "id"))
          throw new ErreurPortee(`${m.name}.${f.name} : clé étrangère non simple, non bornable`);
        return { nom: f.name, cible: f.type, genre, liste: f.isList, cle: de[0] };
      }),
  ]),
);

function relations(nom: string): Relation[] {
  const r = RELATIONS.get(nom);
  if (!r) throw new ErreurPortee(`modèle inconnu : ${nom}`);
  return r;
}

function relation(nom: string, champ: string): Relation | undefined {
  return relations(nom).find((r) => r.nom === champ);
}

/** Vrai si une ligne de ce modèle appartient à un compte. */
export function estDuCompte(nom: string): boolean {
  return genreDe(classement(nom)) === "compte";
}

/** Les relations d'un modèle vers une ligne d'un compte, par leur clé. */
export function clesDuCompte(nom: string): { cle: string; cible: string }[] {
  return relations(nom).flatMap((r) =>
    r.genre === "compte" && r.cle ? [{ cle: r.cle, cible: r.cible }] : [],
  );
}

// --- La borne ----------------------------------------------------------------

/** Le filtre `where` qui borne un modèle à la portée. */
export function borne(nom: string, portee: Portee): Objet {
  const c = classement(nom);
  if ("racine" in c) return { [c.racine]: portee.userId };
  if ("parent" in c) return { [c.parent]: borne(relation(nom, c.parent)!.cible, portee) };
  throw new ErreurPortee(`modèle hors compte : ${nom}`);
}

/** Ajoute la borne à un `where` sans toucher à ses champs uniques. */
export function avecBorne(where: unknown, b: Objet): Objet {
  const w: Objet = { ...((where as Objet | undefined) ?? {}) };
  const et = w.AND === undefined ? [] : Array.isArray(w.AND) ? w.AND : [w.AND];
  w.AND = [...et, b];
  return w;
}

function lister(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [v];
}

function commeAvant<T>(origine: unknown, liste: T[]): T | T[] {
  return Array.isArray(origine) ? liste : liste[0];
}

function estObjet(v: unknown): v is Objet {
  return v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

/** La valeur d'un champ scalaire écrit tel quel ou sous la forme `{ set: v }`. */
function valeurScalaire(v: unknown): unknown {
  if (!estObjet(v)) return v;
  if (Object.keys(v).length === 1 && "set" in v) return v.set;
  throw new ErreurPortee(`opération inattendue sur une clé : ${Object.keys(v).join(", ")}`);
}

/** Vérifie et pose la racine (`userId`) d'une création ou d'une mise à jour. */
/** La clé de racine d'un modèle racine (`Entreprise.userId`) — et elle seule. */
function estLaRacine(nom: string, cle: string): boolean {
  const c = classement(nom);
  return "racine" in c && c.racine === cle;
}

function racineDe(nom: string, data: Objet, portee: Portee, creation: boolean): void {
  const c = classement(nom);
  if (!("racine" in c)) return;
  if (c.racine in data) {
    const v = valeurScalaire(data[c.racine]);
    if (v !== portee.userId) throw new ErreurPortee(`${nom}.${c.racine} différent du compte`);
    data[c.racine] = v;
    return;
  }
  const parRelation = relations(nom).some((r) => r.cle === c.racine && data[r.nom] !== undefined);
  if (creation && !parRelation) data[c.racine] = portee.userId;
}

// --- Écritures ----------------------------------------------------------------

/**
 * Réécrit le `data` d'une création ou d'une mise à jour : une clé vers une
 * ligne d'un compte devient un `connect` borné ; une relation vers l'identité
 * (`User`, sur cc) ne désigne que le compte ; toute écriture vers un autre
 * modèle hors compte est refusée ; les écritures imbriquées sont parcourues.
 */
export function reecrireDonnees(nom: string, data: unknown, portee: Portee, creation: boolean): Objet {
  if (!estObjet(data)) throw new ErreurPortee(`données inattendues pour ${nom}`);
  const d: Objet = { ...data };
  racineDe(nom, d, portee, creation);

  for (const r of relations(nom)) {
    const parCle = r.cle !== undefined && r.cle in d;
    if (parCle && r.nom in d) throw new ErreurPortee(`${nom} : ${r.cle} et ${r.nom} donnés ensemble`);

    if (r.genre === "hors") {
      if (parCle || r.nom in d) throw new ErreurPortee(`${nom}.${r.nom} : écriture vers un modèle hors compte`);
      continue;
    }

    if (parCle) {
      const v = valeurScalaire(d[r.cle!]);
      delete d[r.cle!];
      if (v === null) {
        if (!creation) d[r.nom] = { disconnect: true };
      } else if (v !== undefined) {
        d[r.nom] = { connect: cible(r, { id: v }, portee) };
      }
      continue;
    }

    const n = d[r.nom];
    if (n === undefined) continue;
    if (!estObjet(n)) throw new ErreurPortee(`${nom}.${r.nom} : écriture imbriquée inattendue`);
    d[r.nom] = reecrireImbrique(nom, r, n, portee);
  }
  return d;
}

/** La cible d'un `connect` : bornée au compte, ou réduite au compte lui-même. */
function cible(r: Relation, where: unknown, portee: Portee): Objet {
  if (r.genre === "identite") {
    if (!estObjet(where) || Object.keys(where).length !== 1 || where.id !== portee.userId)
      throw new ErreurPortee(`${r.nom} : une relation vers l'identité ne désigne que le compte`);
    return { id: portee.userId };
  }
  return avecBorne(where, borne(r.cible, portee));
}

function reecrireImbrique(nom: string, r: Relation, n: Objet, portee: Portee): Objet {
  const sortie: Objet = {};
  for (const [op, val] of Object.entries(n)) {
    if (r.genre === "identite" && op !== "connect")
      throw new ErreurPortee(`${nom}.${r.nom}.${op} : seule la relation au compte est permise`);
    switch (op) {
      case "connect":
        sortie[op] = commeAvant(val, lister(val).map((w) => cible(r, w, portee)));
        break;
      case "disconnect":
        if (val !== true) throw new ErreurPortee(`${nom}.${r.nom}.disconnect : forme non servie`);
        sortie[op] = val;
        break;
      case "create":
        sortie[op] = commeAvant(val, lister(val).map((c) => reecrireDonnees(r.cible, c, portee, true)));
        break;
      case "deleteMany":
        // Lignes déjà rattachées au parent borné : Prisma limite la suppression
        // à cette relation (lignes d'un plan de prévention).
        sortie[op] = val;
        break;
      default:
        throw new ErreurPortee(`écriture imbriquée non servie : ${nom}.${r.nom}.${op}`);
    }
  }
  return sortie;
}

// --- Lectures imbriquées --------------------------------------------------------

/**
 * Refuse tout `include`/`select` qui traverse vers un modèle hors compte ou
 * vers l'identité : une ligne du compte peut y pointer (`Signature.user`, sur
 * cc), et la lecture imbriquée n'est pas bornée. À toute profondeur, `_count`
 * compris.
 */
function verifierLecture(nom: string, args: unknown): void {
  if (!estObjet(args)) return;
  for (const cleArg of ["include", "select"] as const) {
    const sel = args[cleArg];
    if (!estObjet(sel)) continue;
    for (const [champ, v] of Object.entries(sel)) {
      if (v === false || v === undefined) continue;
      if (champ === "_count") {
        if (v === true && relations(nom).some((r) => r.liste && r.genre !== "compte"))
          throw new ErreurPortee(`${nom}._count : relation hors compte`);
        verifierLecture(nom, v);
        continue;
      }
      const r = relation(nom, champ);
      if (!r) continue;
      if (r.genre !== "compte") throw new ErreurPortee(`${nom}.${champ} : lecture d'un modèle hors compte`);
      verifierLecture(r.cible, v);
    }
  }
}

// --- Lot vérifié (createMany) ----------------------------------------------------
//
// Prisma recopie les arguments en profondeur avant l'extension : aucun marqueur
// ne survit, seulement les valeurs. Une lecture bornée `select: { id: true }`
// prouve que les identifiants rendus sont dans la portée ; un `createMany`
// n'est accepté que si chacune de ses clés vers une ligne d'un compte en fait
// partie. Le relevé ne vit que le temps de `dansUnLot` (`creerEnLotVerifie`).

const LOT = new AsyncLocalStorage<Set<string>>();

/** Exécute `fn` dans un lot : les identifiants lus pendant l'appel y sont retenus. */
export function dansUnLot<T>(fn: () => Promise<T>): Promise<T> {
  return LOT.run(new Set(), fn);
}

/** Vrai si les arguments sont une lecture des seuls identifiants. */
export function estLectureDIdentifiants(operation: string, args: unknown): boolean {
  if (operation !== "findMany") return false;
  const select = estObjet(args) ? args.select : undefined;
  return estObjet(select) && Object.keys(select).length === 1 && select.id === true;
}

/** Retient, dans le lot en cours, les identifiants rendus par une lecture bornée. */
export function noterVus(nom: string, portee: Portee, resultat: unknown): void {
  const vus = LOT.getStore();
  if (!vus || !Array.isArray(resultat)) return;
  for (const ligne of resultat) {
    const id = (ligne as Objet | null)?.id;
    if (typeof id === "string") vus.add(`${portee.userId}|${nom}:${id}`);
  }
}

/** Les clés d'une ligne vers une ligne d'un compte qui n'ont pas été vues dans le lot. */
function clesNonVues(nom: string, ligne: Objet, portee: Portee): string[] {
  const vus = LOT.getStore() ?? new Set<string>();
  return clesDuCompte(nom).flatMap(({ cle, cible: c }) => {
    const v = ligne[cle];
    if (v === undefined || v === null) return [];
    return vus.has(`${portee.userId}|${c}:${String(v)}`) ? [] : [`${c}:${String(v)}`];
  });
}

// --- Point d'entrée -------------------------------------------------------------

const LECTURES = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

/** Les arguments bornés d'une opération de modèle. Lève sur ce qu'elle ne sait pas borner. */
export function argumentsBornes(nom: string, operation: string, args: unknown, portee: Portee): Objet {
  const a: Objet = estObjet(args) ? { ...args } : {};
  const b = borne(nom, portee);
  verifierLecture(nom, a);

  if (LECTURES.has(operation)) {
    // `cursor` n'est employé nulle part : refusé plutôt que raisonné.
    if ("cursor" in a) throw new ErreurPortee(`${nom}.${operation} : cursor non servi`);
    a.where = avecBorne(a.where, b);
    return a;
  }
  switch (operation) {
    case "delete":
    case "deleteMany":
      a.where = avecBorne(a.where, b);
      return a;
    case "create":
      a.data = reecrireDonnees(nom, a.data, portee, true);
      return a;
    case "update":
      a.where = avecBorne(a.where, b);
      a.data = reecrireDonnees(nom, a.data, portee, false);
      return a;
    case "upsert":
      a.where = avecBorne(a.where, b);
      a.create = reecrireDonnees(nom, a.create, portee, true);
      a.update = reecrireDonnees(nom, a.update, portee, false);
      return a;
    case "updateMany": {
      // `updateMany` n'accepte pas de `connect` : une clé vers une ligne d'un
      // compte, ou vers un modèle hors compte, ne s'y borne pas.
      const data: Objet = estObjet(a.data) ? { ...a.data } : {};
      racineDe(nom, data, portee, false);
      for (const r of relations(nom)) {
        // La racine est vérifiée par `racineDe` ; toute autre clé est refusée,
        // y compris une seconde clé d'un modèle racine.
        if (r.cle && r.cle in data && !estLaRacine(nom, r.cle))
          throw new ErreurPortee(`${nom}.updateMany : clé ${r.cle} non bornable ici`);
      }
      a.where = avecBorne(a.where, b);
      a.data = data;
      return a;
    }
    case "createMany": {
      const lignes = lister(a.data).map((l) => {
        if (!estObjet(l)) throw new ErreurPortee(`${nom}.createMany : ligne inattendue`);
        const ligne = { ...l };
        racineDe(nom, ligne, portee, true);
        for (const r of relations(nom)) {
          if (r.cle && r.genre !== "compte" && ligne[r.cle] != null && !estLaRacine(nom, r.cle))
            throw new ErreurPortee(`${nom}.createMany : clé ${r.cle} vers un modèle hors compte`);
        }
        return ligne;
      });
      const manquantes = lignes.flatMap((l) => clesNonVues(nom, l, portee));
      if (manquantes.length > 0)
        throw new ErreurPortee(
          `${nom}.createMany : parents non vérifiés (${manquantes.slice(0, 3).join(", ")}) — passer par creerEnLotVerifie`,
        );
      a.data = commeAvant(a.data, lignes);
      return a;
    }
    default:
      throw new ErreurPortee(`opération non servie : ${nom}.${operation}`);
  }
}
