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
import { CORRESPONDANCE, IDENTITES_SCALAIRES, type Classement } from "./correspondance";

/**
 * La portée d'un client borné : un compte (ADR-051, ADR-054), et la personne
 * qui agit — un membre du compte, ou `null` pour un accès sans session (jeton
 * de prestataire, MCP, webhook) : une relation vers `User` n'y peut alors
 * désigner personne.
 */
/** Les identifiants gelés d'un compte (ADR-053 § 14). */
export type Geles = Readonly<{ etablissements: readonly string[]; prestataires: readonly string[] }>;

export type Portee = {
  type: "compte";
  compteId: string;
  userId: string | null;
  /**
   * Un membre en lecture seule (ADR-054 § 4) : toute écriture est refusée,
   * ici, quelle que soit l'action qui l'oublierait. Absent ou faux ailleurs.
   */
  lectureSeule?: boolean;
  /** Le gel du compte (ADR-053 § 14), posé par la session seule. */
  geles?: Geles;
  /**
   * La portée « établissement » (chantier 3 du renforcement, 2026-11-09) :
   * un accès sans session (jeton de prestataire, signature publique, MCP)
   * ne voit que SON établissement. S'ajoute à la borne du compte, ne la
   * remplace pas. L'entreprise parente se lit en champs simples seulement
   * (aucune relation ne redescend vers les autres établissements) ; les
   * autres racines du compte sont refusées ; l'établissement et
   * l'entreprise ne s'écrivent pas.
   */
  etablissementId?: string;
};

/** Refus du client borné : opération ou modèle qu'il ne sait pas borner. */
export class ErreurPortee extends Error {
  constructor(message: string) {
    super(`Isolation des comptes : ${message}`);
    this.name = "ErreurPortee";
  }
}

/**
 * Les seules écritures permises en lecture seule, nommées une à une : la
 * demande d'assistance (joindre l'assistance reste ouvert à tous, ADR-050).
 */
export const ECRITURES_DE_LA_LECTURE_SEULE: ReadonlySet<string> = new Set(["DemandeAssistance.create"]);

/**
 * Des champs simples, sans écriture imbriquée : l'exception de la lecture
 * seule ne porte que sur la ligne nommée, jamais sur ce qu'elle créerait
 * ailleurs (seconde lecture du 2026-11-03).
 */
function champsSimples(data: unknown): boolean {
  return (
    estObjet(data) && Object.values(data).every((v) => v === null || typeof v !== "object" || v instanceof Date)
  );
}

/** Refus d'une écriture à un membre en lecture seule (ADR-054 § 4). */
export class ErreurLectureSeule extends ErreurPortee {
  constructor(operation: string) {
    super(`${operation} : votre accès est en lecture seule`);
    this.name = "ErreurLectureSeule";
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
  /** Pour une relation vers l'identité : le champ de la portée qu'elle désigne. */
  porteePar?: "userId" | "compteId";
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
        const c = classement(f.type);
        const porteePar = "identite" in c ? c.porteePar : undefined;
        return { nom: f.name, cible: f.type, genre, porteePar, liste: f.isList, cle: de[0] };
      }),
  ]),
);

// Chaque clé d'identité scalaire est une colonne du modèle, et la clé d'aucune
// relation : une relation la borne déjà, l'entrée serait un doublon trompeur.
for (const [nom, cles] of Object.entries(IDENTITES_SCALAIRES)) {
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === nom);
  for (const cle of cles ?? []) {
    const champ = m?.fields.find((f) => f.name === cle);
    if (!champ || champ.kind !== "scalar")
      throw new ErreurPortee(`${nom}.${cle} : clé d'identité scalaire introuvable`);
    if (m!.fields.some((f) => f.relationFromFields?.includes(cle)))
      throw new ErreurPortee(`${nom}.${cle} : clé d'une relation, à retirer d'IDENTITES_SCALAIRES`);
  }
}

/** Une clé d'identité scalaire écrite : l'utilisateur du compte, ou `null`. */
function identitesScalaires(nom: string, data: Objet, portee: Portee): void {
  for (const cle of IDENTITES_SCALAIRES[nom as Prisma.ModelName] ?? []) {
    if (!(cle in data) || data[cle] === undefined) continue;
    const v = valeurScalaire(data[cle]);
    if (v !== null && v !== portee.userId) throw new ErreurPortee(`${nom}.${cle} : une autre personne que celle qui agit`);
    data[cle] = v;
  }
}

export function relations(nom: string): Relation[] {
  const r = RELATIONS.get(nom);
  if (!r) throw new ErreurPortee(`modèle inconnu : ${nom}`);
  return r;
}

/** Les mêmes relations, indexées par nom : `relation()` est appelée pour chaque clé de chaque requête. */
const PAR_NOM = new Map([...RELATIONS].map(([m, rs]) => [m, new Map(rs.map((r) => [r.nom, r]))]));

function relation(nom: string, champ: string): Relation | undefined {
  relations(nom);
  return PAR_NOM.get(nom)!.get(champ);
}

/** Les relations d'un modèle vers une ligne d'un compte, par leur clé. */
export function clesDuCompte(nom: string): { cle: string; cible: string }[] {
  return relations(nom).flatMap((r) =>
    r.genre === "compte" && r.cle ? [{ cle: r.cle, cible: r.cible }] : [],
  );
}

/**
 * Toutes les clés qu'une écriture voit bornées : relations vers une ligne d'un
 * compte ou vers l'identité, et identités scalaires. Ce que la matrice
 * d'isolation éprouve, une à une.
 */
export function clesBornees(nom: string): { cle: string; identite: boolean }[] {
  return [
    ...relations(nom).flatMap((r) => (r.cle && r.genre !== "hors" ? [{ cle: r.cle, identite: r.genre === "identite" }] : [])),
    ...(IDENTITES_SCALAIRES[nom as Prisma.ModelName] ?? []).map((cle) => ({ cle, identite: true })),
  ];
}

/** Les clés qu'un `createMany` refuse d'emblée : vers un modèle hors compte ou l'identité, sauf la racine (pas de `connect` en lot). */
export function clesRefuseesAuLot(nom: string): string[] {
  return relations(nom).flatMap((r) => (r.cle && r.genre !== "compte" && !estLaRacine(nom, r.cle) ? [r.cle] : []));
}

/** Le délégué Prisma d'un modèle (`PermisFeu` → `client.permisFeu`). */
export function delegueDe<T>(client: unknown, nom: string): T {
  return (client as Record<string, T>)[nom.charAt(0).toLowerCase() + nom.slice(1)];
}

// --- La borne ----------------------------------------------------------------

/** Le filtre `where` qui borne un modèle à la portée. */
export function borne(nom: string, portee: Portee): Objet {
  const c = classement(nom);
  const etab = portee.etablissementId;
  // Sous la portée d'un établissement, toute table qui y est rattachée remonte
  // ici par la récursion : le filtre de l'établissement s'y pose une fois.
  if (etab !== undefined && nom === "Etablissement") return { id: etab, entreprise: { compteId: portee.compteId } };
  if (etab !== undefined && nom === "Entreprise") return { compteId: portee.compteId, etablissements: { some: { id: etab } } };
  if ("racine" in c) {
    if (etab !== undefined) throw new ErreurPortee(`${nom} : hors de la portée d'un établissement`);
    return { [c.racine]: portee.compteId };
  }
  if ("parent" in c) return { [c.parent]: borne(relation(nom, c.parent)!.cible, portee) };
  throw new ErreurPortee(`modèle hors compte : ${nom}`);
}

/** Le filtre de `nom` jusqu'au modèle `vers`, qui y pose `feuille` ; `null` s'il n'y mène pas. */
export function filtreVers(nom: string, vers: string, feuille: Objet): Objet | null {
  if (nom === vers) return feuille;
  const c = classement(nom);
  if (!("parent" in c)) return null;
  const suite = filtreVers(relation(nom, c.parent)!.cible, vers, feuille);
  return suite && { [c.parent]: suite };
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

/** La clé de racine d'un modèle racine (`Entreprise.compteId`) — et elle seule. */
function estLaRacine(nom: string, cle: string): boolean {
  const c = classement(nom);
  return "racine" in c && c.racine === cle;
}

/** Vérifie et pose la racine (`compteId`) d'une création ou d'une mise à jour. */
function racineDe(nom: string, data: Objet, portee: Portee, creation: boolean): void {
  const c = classement(nom);
  if (!("racine" in c)) return;
  if (c.racine in data) {
    const v = valeurScalaire(data[c.racine]);
    if (v !== portee.compteId) throw new ErreurPortee(`${nom}.${c.racine} différent du compte`);
    data[c.racine] = v;
    return;
  }
  const parRelation = relations(nom).some((r) => r.cle === c.racine && data[r.nom] !== undefined);
  if (creation && !parRelation) data[c.racine] = portee.compteId;
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
  // Sous la portée d'un établissement, rien ne s'écrit au-dessus de lui — ni en
  // tête (`argumentsBornes`), ni imbriqué : un `create` sous une relation
  // ouvrirait un établissement, ou une racine du compte, hors de la portée
  // (revue de code de #264).
  if (portee.etablissementId !== undefined && auDessusDeLEtablissement(nom))
    throw new ErreurPortee(`${nom} : écriture hors de la portée d'un établissement`);
  const d: Objet = { ...data };
  racineDe(nom, d, portee, creation);
  identitesScalaires(nom, d, portee);

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
    // `Compte` ne désigne que le compte de la portée, `User` que la personne
    // qui agit (ADR-054 § 3) — et personne sans session.
    const attendu = portee[r.porteePar!];
    if (!attendu || !estObjet(where) || Object.keys(where).length !== 1 || where.id !== attendu)
      throw new ErreurPortee(`${r.nom} : une relation vers l'identité ne désigne que le compte ou la personne qui agit`);
    return { id: attendu };
  }
  // La condition d'un `connect` est un filtre comme un autre : elle ne remonte
  // pas vers un modèle hors compte ni vers l'identité (seconde lecture de #142).
  verifierFiltre(r.cible, where);
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
        // à cette relation (lignes d'un plan de prévention). Sa condition reste
        // un filtre : ni hors compte, ni identité.
        for (const w of lister(val)) verifierFiltre(r.cible, w);
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
function verifierLecture(nom: string, args: unknown, imbrique = false): void {
  if (!estObjet(args)) return;
  // `cursor` n'est employé nulle part, à aucun niveau : refusé plutôt que raisonné.
  if (imbrique && "cursor" in args) throw new ErreurPortee(`${nom} : cursor imbriqué non servi`);
  // Un filtre ou un tri traverse une relation comme un `include` : vers un
  // modèle hors compte ou l'identité, il en ferait un oracle (seconde
  // lecture du 2026-10-31).
  verifierFiltre(nom, args.where);
  verifierFiltre(nom, args.orderBy);
  for (const cleArg of ["include", "select"] as const) {
    const sel = args[cleArg];
    if (!estObjet(sel)) continue;
    for (const [champ, v] of Object.entries(sel)) {
      if (v === false || v === undefined) continue;
      if (champ === "_count") {
        if (v === true && relations(nom).some((r) => r.liste && r.genre !== "compte"))
          throw new ErreurPortee(`${nom}._count : relation hors compte`);
        verifierLecture(nom, v, true);
        continue;
      }
      const r = relation(nom, champ);
      if (!r) continue;
      if (r.genre !== "compte") throw new ErreurPortee(`${nom}.${champ} : lecture d'un modèle hors compte`);
      verifierLecture(r.cible, v, true);
    }
  }
}

/** Les opérateurs de relation d'un filtre : leur valeur filtre le modèle cible. */
const OPERATEURS_RELATION = new Set(["some", "every", "none", "is", "isNot"]);
const LOGIQUES = new Set(["AND", "OR", "NOT"]);

/** Refuse un `where` ou un `orderBy` qui traverse une relation hors du compte. */
function verifierFiltre(nom: string, f: unknown): void {
  if (Array.isArray(f)) {
    for (const x of f) verifierFiltre(nom, x);
    return;
  }
  if (!estObjet(f)) return;
  for (const [cle, v] of Object.entries(f)) {
    if (LOGIQUES.has(cle)) {
      verifierFiltre(nom, v);
      continue;
    }
    const r = relation(nom, cle);
    if (!r) continue;
    if (r.genre !== "compte") throw new ErreurPortee(`${nom}.${cle} : filtre ou tri vers un modèle hors compte`);
    const sous = estObjet(v) ? Object.keys(v) : [];
    if (sous.length > 0 && sous.every((k) => OPERATEURS_RELATION.has(k)))
      for (const k of sous) verifierFiltre(r.cible, (v as Objet)[k]);
    else verifierFiltre(r.cible, v);
  }
}

// --- Portée d'un établissement : rien ne remonte au-delà de l'entreprise ---------

/** Ce qui ne s'écrit pas sous la portée d'un établissement : lui-même, et toute racine du compte (l'entreprise comprise). */
function auDessusDeLEtablissement(nom: string): boolean {
  return nom === "Etablissement" || "racine" in classement(nom);
}

/** Les clés d'arguments que les deux parcours ci-dessous traversent sans changer de modèle. */
const TRAVERSES_ENTREPRISE = new Set(["select", "where", "orderBy"]);
const TRAVERSES_REMONTEE = new Set(["include", "select", "where", "orderBy", "_count"]);

/**
 * Sous la portée d'un établissement, l'entreprise parente se lit en champs
 * simples seulement : une relation qui en part (`etablissements`, ses
 * relations vers le compte) redescendrait vers les AUTRES établissements du
 * compte — la fuite qui avait fait retirer cette portée le 2026-10-30. Refusé
 * à toute profondeur, dans `include`, `select`, `where` et `orderBy`.
 */
function scalairesSeuls(nom: string, v: unknown, chemin: string): void {
  if (Array.isArray(v)) {
    for (const x of v) scalairesSeuls(nom, x, chemin);
    return;
  }
  if (!estObjet(v)) return;
  for (const [cle, x] of Object.entries(v)) {
    if (x === undefined || x === false) continue;
    if (LOGIQUES.has(cle) || OPERATEURS_RELATION.has(cle) || TRAVERSES_ENTREPRISE.has(cle)) {
      scalairesSeuls(nom, x, chemin);
      continue;
    }
    if (cle === "include" || cle === "_count" || relation(nom, cle))
      throw new ErreurPortee(`${chemin}.${cle} : hors de l'établissement de la portée`);
  }
}

/** Parcourt une lecture ou un filtre ; toute traversée vers l'entreprise n'y garde que des champs simples. */
function verifierRemontee(nom: string, args: unknown, chemin = nom): void {
  if (Array.isArray(args)) {
    for (const x of args) verifierRemontee(nom, x, chemin);
    return;
  }
  if (!estObjet(args)) return;
  if (nom === "Entreprise") return scalairesSeuls(nom, args, chemin);
  for (const [cle, v] of Object.entries(args)) {
    if (TRAVERSES_REMONTEE.has(cle) || LOGIQUES.has(cle) || OPERATEURS_RELATION.has(cle)) {
      verifierRemontee(nom, v, chemin);
      continue;
    }
    const r = relation(nom, cle);
    if (r) verifierRemontee(r.cible, v, `${chemin}.${cle}`);
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
/** Le relevé d'un lot porte la portée entière : compte, et établissement s'il y en a un. */
const clefDuLot = (p: Portee) => `${p.compteId}|${p.etablissementId ?? ""}`;

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
  const k = clefDuLot(portee);
  for (const ligne of resultat) {
    const id = (ligne as Objet | null)?.id;
    if (typeof id === "string") vus.add(`${k}|${nom}:${id}`);
  }
}

/** Les clés d'une ligne vers une ligne d'un compte qui n'ont pas été vues dans le lot. */
function clesNonVues(nom: string, ligne: Objet, portee: Portee): string[] {
  const vus = LOT.getStore() ?? new Set<string>();
  const k = clefDuLot(portee);
  return clesDuCompte(nom).flatMap(({ cle, cible: c }) => {
    const v = ligne[cle];
    if (v === undefined || v === null) return [];
    return vus.has(`${k}|${c}:${String(v)}`) ? [] : [`${c}:${String(v)}`];
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
  if (portee.etablissementId !== undefined) {
    verifierRemontee(nom, { where: a.where, include: a.include, select: a.select, orderBy: a.orderBy });
    // L'établissement et son entreprise ne s'écrivent pas sous cette portée :
    // un accès sans session n'en a pas besoin, et une création y ouvrirait
    // un établissement hors de la portée.
    if (!LECTURES.has(operation) && auDessusDeLEtablissement(nom))
      throw new ErreurPortee(`${nom}.${operation} : hors de la portée d'un établissement`);
  }

  if (LECTURES.has(operation)) {
    // `cursor` n'est employé nulle part : refusé plutôt que raisonné.
    if ("cursor" in a) throw new ErreurPortee(`${nom}.${operation} : cursor non servi`);
    a.where = avecBorne(a.where, b);
    return a;
  }
  // Tout ce qui n'est pas une lecture écrit, ou est refusé plus bas : en
  // lecture seule, rien ne passe (ADR-054 § 4).
  if (portee.lectureSeule && !(ECRITURES_DE_LA_LECTURE_SEULE.has(`${nom}.${operation}`) && champsSimples(a.data)))
    throw new ErreurLectureSeule(`${nom}.${operation}`);
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
      identitesScalaires(nom, data, portee);
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
        identitesScalaires(nom, ligne, portee);
        for (const cle of clesRefuseesAuLot(nom)) {
          if (ligne[cle] != null) throw new ErreurPortee(`${nom}.createMany : clé ${cle} vers un modèle hors compte`);
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

/**
 * Vrai si une lecture SQL brute (le client borné, `client.ts`) peut écrire : tout ce
 * qui n'est pas un `SELECT` (ou un `WITH`) sans instruction d'écriture. Le
 * verrou `FOR UPDATE` d'une lecture n'écrit pas. Sert au refus de la lecture
 * seule (ADR-054 § 4) ; ce n'est pas un analyseur, et il refuse dans le doute.
 */
export function sqlPeutEcrire(sql: string): boolean {
  const sansVerrou = sql.replace(/\bFOR\s+(?:NO\s+KEY\s+)?UPDATE\b/gi, "").replace(/\bFOR\s+(?:KEY\s+)?SHARE\b/gi, "");
  if (!/^\s*(?:SELECT|WITH)\b/i.test(sansVerrou)) return true;
  return /\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|COPY|CALL|DO)\b/i.test(sansVerrou);
}
