// La borne au compte, en fonctions pures (ADR-051 § 2) : ce que le client
// borné ajoute aux arguments d'une opération Prisma. Aucune requête n'est émise
// ici — la doc Prisma prévient qu'une requête lancée par une extension pendant
// une transaction part sur une autre connexion et ignore la transaction ; la
// vérification passe donc par la requête elle-même (une clé étrangère devient
// un `connect` qui porte la borne et échoue s'il ne trouve rien).
//
// Prisma ne transmet aux extensions que l'opération de tête (« The `query`
// extension type does not support nested read and write operations ») : les
// écritures imbriquées sont parcourues ici, et celles qu'on ne sait pas borner
// sont refusées plutôt que laissées passer.

import { Prisma } from "@prisma/client";
import { CORRESPONDANCE, estHorsCompte, estRacine } from "./correspondance";

export type Portee =
  | { type: "compte"; userId: string }
  | { type: "etablissement"; etablissementId: string };

/** Refus du client borné : opération ou modèle qu'il ne sait pas borner. */
export class ErreurPortee extends Error {
  constructor(message: string) {
    super(`Isolation des comptes : ${message}`);
    this.name = "ErreurPortee";
  }
}

type Champ = Prisma.DMMF.Field;
type Objet = Record<string, unknown>;

const MODELES = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));

function modele(nom: string) {
  const m = MODELES.get(nom);
  if (!m) throw new ErreurPortee(`modèle inconnu : ${nom}`);
  return m;
}

function relations(nom: string): Champ[] {
  return modele(nom).fields.filter((f) => f.kind === "object");
}

function relation(nom: string, champ: string): Champ {
  const r = relations(nom).find((f) => f.name === champ);
  if (!r) throw new ErreurPortee(`relation inconnue : ${nom}.${champ}`);
  return r;
}

function classement(nom: string) {
  const c = CORRESPONDANCE[nom];
  if (!c) throw new ErreurPortee(`modèle non classé : ${nom}`);
  return c;
}

/** Vrai si une ligne de ce modèle appartient à un compte. */
export function estDuCompte(nom: string): boolean {
  return !estHorsCompte(classement(nom));
}

/** Le filtre `where` qui borne un modèle à la portée. */
export function borne(nom: string, portee: Portee): Objet {
  const c = classement(nom);
  if (estHorsCompte(c)) throw new ErreurPortee(`modèle hors compte : ${nom} (${c.horsCompte})`);

  if (portee.type === "compte") {
    if (estRacine(c)) return { [c.racine]: portee.userId };
    return { [c.parent]: borne(relation(nom, c.parent).type, portee) };
  }

  const id = portee.etablissementId;
  if (nom === "Etablissement") return { id };
  if (nom === "Entreprise") return { etablissements: { some: { id } } };
  if (nom === "DemandeAssistance") return { etablissementId: id };
  if (estRacine(c)) throw new ErreurPortee(`racine sans portée d'établissement : ${nom}`);
  return { [c.parent]: borne(relation(nom, c.parent).type, portee) };
}

/** Ajoute la borne à un `where` sans toucher à ses champs uniques. */
export function avecBorne(where: unknown, b: Objet): Objet {
  const w: Objet = { ...((where as Objet | undefined) ?? {}) };
  const et = w.AND === undefined ? [] : Array.isArray(w.AND) ? w.AND : [w.AND];
  w.AND = [...et, b];
  return w;
}

const PAR_WHERE = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "delete",
  "deleteMany",
]);

function lister(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [v];
}

function commeAvant<T>(origine: unknown, liste: T[]): T | T[] {
  return Array.isArray(origine) ? liste : liste[0];
}

/** Vérifie et pose la racine (`userId`) d'une création ou d'une mise à jour. */
function racineDe(nom: string, data: Objet, portee: Portee, creation: boolean): void {
  const c = classement(nom);
  if (!estRacine(c)) return;
  if (portee.type !== "compte") {
    if (creation && nom !== "DemandeAssistance")
      throw new ErreurPortee(`création de ${nom} hors d'une portée de compte`);
    return;
  }
  const v = data[c.racine];
  if (v !== undefined && v !== portee.userId)
    throw new ErreurPortee(`${nom}.${c.racine} différent du compte`);
  if (creation) data[c.racine] = portee.userId;
}

/**
 * Réécrit le `data` d'une création ou d'une mise à jour : chaque clé
 * étrangère vers une ligne d'un compte devient un `connect` borné, et les
 * écritures imbriquées sont parcourues.
 */
export function reecrireDonnees(
  nom: string,
  data: unknown,
  portee: Portee,
  creation: boolean,
): Objet {
  if (data === null || typeof data !== "object" || Array.isArray(data))
    throw new ErreurPortee(`données inattendues pour ${nom}`);
  const d: Objet = { ...(data as Objet) };
  if (creation && portee.type === "etablissement" && (nom === "Entreprise" || nom === "Etablissement"))
    throw new ErreurPortee(`création de ${nom} dans une portée d'établissement`);
  racineDe(nom, d, portee, creation);

  for (const r of relations(nom)) {
    if (!estDuCompte(r.type)) continue;
    const cle = r.relationFromFields?.length === 1 ? r.relationFromFields[0] : undefined;
    const vers = r.relationToFields?.[0] ?? "id";

    if (cle !== undefined && cle in d) {
      const v = d[cle];
      delete d[cle];
      if (r.name in d) throw new ErreurPortee(`${nom} : ${cle} et ${r.name} donnés ensemble`);
      if (v === null) {
        if (!creation) d[r.name] = { disconnect: true };
      } else if (v !== undefined) {
        d[r.name] = { connect: avecBorne({ [vers]: v }, borne(r.type, portee)) };
      }
      continue; // déjà borné : ne pas repasser par l'imbriqué
    }

    const imbrique = d[r.name];
    if (imbrique === undefined) continue;
    if (imbrique === null || typeof imbrique !== "object")
      throw new ErreurPortee(`${nom}.${r.name} : écriture imbriquée inattendue`);
    d[r.name] = reecrireImbrique(nom, r, imbrique as Objet, portee);
  }
  return d;
}

function reecrireImbrique(nom: string, r: Champ, n: Objet, portee: Portee): Objet {
  const sortie: Objet = {};
  const b = () => borne(r.type, portee);
  for (const [op, val] of Object.entries(n)) {
    switch (op) {
      case "connect":
      case "set":
        sortie[op] = commeAvant(val, lister(val).map((w) => avecBorne(w, b())));
        break;
      case "disconnect":
        sortie[op] =
          val === true || val === false
            ? val
            : commeAvant(val, lister(val).map((w) => avecBorne(w, b())));
        break;
      case "create":
        sortie[op] = commeAvant(val, lister(val).map((c) => reecrireDonnees(r.type, c, portee, true)));
        break;
      case "connectOrCreate":
        sortie[op] = commeAvant(
          val,
          lister(val).map((x) => {
            const { where, create } = x as Objet;
            return {
              where: avecBorne(where, b()),
              create: reecrireDonnees(r.type, create, portee, true),
            };
          }),
        );
        break;
      case "createMany": {
        // Lignes filles : elles héritent du parent, mais une clé secondaire
        // ne peut pas y devenir un `connect` — refusée si présente.
        const { data } = val as Objet;
        for (const ligne of lister(data)) refuserClesSecondaires(r.type, ligne as Objet, `${nom}.${r.name}.createMany`);
        sortie[op] = val;
        break;
      }
      default:
        throw new ErreurPortee(`écriture imbriquée non bornée : ${nom}.${r.name}.${op}`);
    }
  }
  return sortie;
}

// --- Parents vus par une lecture bornée ------------------------------------
//
// Prisma recopie les arguments en profondeur avant l'extension : aucun
// marqueur (symbole, identité d'objet) ne survit, constaté le 2026-10-30. Ce
// qui survit, ce sont les valeurs. Une lecture bornée `select: { id: true }`
// prouve que les identifiants rendus sont dans la portée : le client les
// retient, et un `createMany` n'est accepté que si chacune de ses clés
// étrangères vers une ligne d'un compte en fait partie. Une ligne ne change
// pas de compte (le client borné refuse de la déplacer), le relevé reste donc
// vrai ; une ligne supprimée depuis fait échouer la clé étrangère en base.

const VUS = new Map<string, Set<string>>();
const MAX_PORTEES = 500;
const MAX_PAR_PORTEE = 50_000;

function clePortee(p: Portee): string {
  return p.type === "compte" ? `compte:${p.userId}` : `etablissement:${p.etablissementId}`;
}

/** Vrai si les arguments sont une lecture des seuls identifiants. */
export function estLectureDIdentifiants(operation: string, args: unknown): boolean {
  if (operation !== "findMany") return false;
  const select = (args as Objet | undefined)?.select as Objet | undefined;
  return !!select && Object.keys(select).length === 1 && select.id === true;
}

/** Retient les identifiants rendus par une lecture bornée. */
export function noterVus(nom: string, portee: Portee, resultat: unknown): void {
  if (!Array.isArray(resultat)) return;
  const cle = clePortee(portee);
  let vus = VUS.get(cle);
  if (!vus) {
    if (VUS.size >= MAX_PORTEES) VUS.delete(VUS.keys().next().value!);
    vus = new Set();
    VUS.set(cle, vus);
  }
  if (vus.size + resultat.length > MAX_PAR_PORTEE) vus.clear();
  for (const ligne of resultat) {
    const id = (ligne as Objet | null)?.id;
    if (typeof id === "string") vus.add(`${nom}:${id}`);
  }
}

/** Les clés étrangères d'un lot qui ne désignent pas une ligne vue dans la portée. */
function clesNonVues(nom: string, data: unknown, portee: Portee): string[] {
  const vus = VUS.get(clePortee(portee)) ?? new Set<string>();
  const manquantes: string[] = [];
  for (const ligne of lister(data)) {
    if (ligne === null || typeof ligne !== "object") throw new ErreurPortee(`${nom} : ligne inattendue`);
    const l = ligne as Objet;
    racineDe(nom, l, portee, true);
    for (const r of relations(nom)) {
      if (!estDuCompte(r.type) || r.relationFromFields?.length !== 1) continue;
      if ((r.relationToFields?.[0] ?? "id") !== "id")
        throw new ErreurPortee(`${nom}.${r.name} : clé vers un autre champ que id`);
      const v = l[r.relationFromFields[0]];
      if (v === undefined || v === null) continue;
      if (!vus.has(`${r.type}:${String(v)}`)) manquantes.push(`${r.type}:${String(v)}`);
    }
  }
  return manquantes;
}

/** Refuse une ligne qui porte une clé étrangère vers une ligne d'un compte. */
function refuserClesSecondaires(nom: string, ligne: Objet, ou: string): void {
  for (const r of relations(nom)) {
    if (!estDuCompte(r.type)) continue;
    for (const cle of r.relationFromFields ?? []) {
      if (ligne[cle] !== undefined && ligne[cle] !== null)
        throw new ErreurPortee(`${ou} : clé ${cle} non bornable, passer par une vérification nommée`);
    }
  }
}

/** Les arguments bornés d'une opération de modèle. Lève sur ce qu'elle ne sait pas borner. */
export function argumentsBornes(
  nom: string,
  operation: string,
  args: unknown,
  portee: Portee,
): Objet {
  const a: Objet = { ...((args as Objet | undefined) ?? {}) };
  const b = borne(nom, portee);

  if (PAR_WHERE.has(operation)) {
    a.where = avecBorne(a.where, b);
    return a;
  }
  switch (operation) {
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
    case "updateMany":
    case "updateManyAndReturn":
      // `updateMany` n'accepte pas de `connect` : une clé étrangère changée
      // ici ne se borne pas.
      a.where = avecBorne(a.where, b);
      refuserClesSecondaires(nom, (a.data ?? {}) as Objet, `${nom}.${operation}`);
      racineDe(nom, (a.data ?? {}) as Objet, portee, false);
      return a;
    case "createMany":
    case "createManyAndReturn": {
      const manquantes = clesNonVues(nom, a.data, portee);
      if (manquantes.length === 0) return a;
      throw new ErreurPortee(
        `${nom}.${operation} : parents non vérifiés (${manquantes.slice(0, 3).join(", ")}) — passer par creerEnLotVerifie, dans la transaction (ADR-051, constats du lot 1)`,
      );
    }
    default:
      throw new ErreurPortee(`opération inconnue : ${nom}.${operation}`);
  }
}
