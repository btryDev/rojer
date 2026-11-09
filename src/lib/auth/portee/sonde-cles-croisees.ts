// La sonde des clés croisées (plan d'isolation, lot 5 ; écrite le 2026-11-09).
//
// L'invariant dont dépend la sûreté des lectures imbriquées (ADR-051 § 2) :
// AUCUNE ligne d'un compte ne pointe vers une ligne d'un autre compte. Le client
// borné l'assure à chaque écriture ; la sonde le vérifie sur les DONNÉES, quel
// que soit le chemin par lequel elles sont arrivées — client brut (calendrier,
// Better Auth, Stripe, jetons, scripts), migration de reprise, saisie à la main.
//
// Générée, jamais écrite à la main : le compte d'une ligne se lit en remontant
// `CORRESPONDANCE` jusqu'à sa racine, et chaque clé étrangère entre deux
// modèles d'un compte vient du schéma (`Prisma.dmmf`). Un modèle ou une
// relation ajoutés demain y entrent d'eux-mêmes. Les identifiants sans
// relation au schéma sont classés à la main (`CLES_SANS_RELATION`,
// `PAS_UNE_CLE_DE_COMPTE`), et un test fait tomber tout identifiant neuf qui
// n'y est pas.
//
// Hors de la sonde : les modèles hors compte et l'identité (`User`, `Compte`).
// Un auteur (`…UserId`) peut avoir quitté le compte qu'il a servi : ce n'est
// pas un invariant.

import { Prisma } from "@prisma/client";
import { CLES_STOCKEES } from "@/lib/suppression/cles-stockees";
import { CORRESPONDANCE, type Classement } from "./correspondance";

type Modele = (typeof Prisma.dmmf.datamodel.models)[number];
type Champ = Modele["fields"][number];

const MODELES = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const classement = (nom: string): Classement => (CORRESPONDANCE as Record<string, Classement>)[nom];
/** Un modèle d'un compte : une racine, ou rattaché à un parent. */
const duCompte = (nom: string) => {
  const c = classement(nom);
  return c !== undefined && ("racine" in c || "parent" in c);
};

const table = (m: Modele) => `"${m.dbName ?? m.name}"`;
const colonne = (m: Modele, champ: string) => {
  const f = m.fields.find((x) => x.name === champ);
  if (!f) throw new Error(`sonde : ${m.name}.${champ} absent du schéma`);
  return `"${f.dbName ?? f.name}"`;
};
const modele = (nom: string): Modele => {
  const m = MODELES.get(nom);
  if (!m) throw new Error(`sonde : modèle ${nom} absent du schéma`);
  return m;
};

/** La jointure d'une relation qui porte la clé (`relationFromFields`) vers sa cible. */
function jointure(m: Modele, f: Champ, de: string, vers: string): string {
  const cible = modele(f.type);
  const egalites = (f.relationFromFields ?? []).map(
    (cle, i) => `${vers}.${colonne(cible, f.relationToFields![i])} = ${de}.${colonne(m, cle)}`,
  );
  return `JOIN ${table(cible)} ${vers} ON ${egalites.join(" AND ")}`;
}

/** La colonne identifiante d'un modèle (`@id`, qui n'est pas toujours `id` : `FichierStocke.cle`). */
const identifiant = (m: Modele) => {
  const f = m.fields.find((x) => x.isId);
  if (!f) throw new Error(`sonde : ${m.name} sans @id simple`);
  return `"${f.dbName ?? f.name}"`;
};

/** Ce que la sonde compare : le compte d'une ligne, ou l'établissement d'une ligne qui en a un. */
export type Niveau = "compte" | "etablissement";

/**
 * L'expression qui porte le compte (ou l'établissement) d'une ligne de `nom`
 * aliasée `alias`, et les jointures pour y arriver ; `null` si la ligne n'a
 * pas d'établissement. Les alias sont préfixés (`prefixe`) pour que deux
 * chemins tiennent dans une même requête.
 */
function chemin(nom: string, alias: string, prefixe: string, niveau: Niveau): { jointures: string[]; valeur: string } | null {
  const c = classement(nom);
  const m = modele(nom);
  if (niveau === "etablissement" && nom === "Etablissement") return { jointures: [], valeur: `${alias}.${identifiant(m)}` };
  if ("racine" in c) {
    if (niveau === "etablissement") return null;
    // Une racine sans compte (`Entreprise.compteId` est encore nullable) vaut
    // pour elle seule : deux lignes rattachées à deux entreprises orphelines
    // distinctes sont croisées, alors que NULL contre NULL ne serait pas
    // « distinct » (seconde lecture de #253). Seulement là où la colonne est
    // nullable : ailleurs, la colonne suffit (revue medium de #253).
    const racine = `${alias}.${colonne(m, c.racine)}`;
    const nullable = !m.fields.find((x) => x.name === c.racine)!.isRequired;
    return {
      jointures: [],
      valeur: nullable ? `COALESCE(${racine}::text, '${nom}:' || ${alias}.${identifiant(m)})` : `${racine}::text`,
    };
  }
  if (!("parent" in c)) throw new Error(`sonde : ${nom} n'est pas un modèle de compte`);
  const f = m.fields.find((x) => x.name === c.parent)!;
  const suivant = `${prefixe}${alias.length}`;
  const suite = chemin(f.type, suivant, prefixe + "_", niveau);
  return suite && { jointures: [jointure(m, f, alias, suivant), ...suite.jointures], valeur: suite.valeur };
}

/**
 * Les identifiants qu'aucune relation du schéma ne porte, mais qui désignent
 * une ligne d'un compte : polymorphes (`objetType`) ou laissés sans clé
 * étrangère. Chacun est sondé comme une clé.
 */
export const CLES_SANS_RELATION: readonly {
  modele: string;
  cle: string;
  cibles: Readonly<Record<string, string>> | string;
  parType?: string;
}[] = [
  // Le rapport qui a levé l'action (ADR-048) : sans clé étrangère, la ligne
  // survit à la suppression du rapport.
  { modele: "Action", cle: "leveeRapportId", cibles: "RapportVerification" },
  // L'objet signé, polymorphe (ADR-008) ; le jeton d'une signature désigne le même.
  ...(["Signature", "AccessToken"] as const).map((modele) => ({
    modele,
    cle: "objetId",
    parType: "objetType",
    cibles: {
      rapport_verification: "RapportVerification",
      permis_feu: "PermisFeu",
      plan_prevention: "PlanPrevention",
      registre_accessibilite: "RegistreAccessibilite",
      duerp_version: "DuerpVersion",
    },
  })),
  // Module retiré (ADR-018), table encore là : ses identifiants restent sondés.
  { modele: "Intervention", cle: "uniteTravailId", cibles: "UniteTravail" },
  { modele: "Intervention", cle: "prestataireId", cibles: "Prestataire" },
];

/**
 * Les identifiants (`…Id`) d'un modèle de compte qui ne désignent PAS une
 * ligne d'un compte, et pourquoi. Un identifiant neuf qui n'est ni ici ni dans
 * `CLES_SANS_RELATION` fait tomber `sonde-cles-croisees.test.ts`.
 */
export const PAS_UNE_CLE_DE_COMPTE: Readonly<Record<string, string>> = {
  "Duerp.referentielSecteurId": "référentiel sectoriel, en TypeScript (ADR-003)",
  "UniteTravail.referentielUniteId": "référentiel sectoriel, en TypeScript (ADR-003)",
  "Risque.referentielId": "référentiel sectoriel, en TypeScript (ADR-003)",
  "Action.referentielMesureId": "référentiel des mesures, en TypeScript (ADR-003)",
  "Verification.obligationId": "référentiel de conformité, en TypeScript (ADR-003)",
  "PrescriptionParticuliere.obligationId": "référentiel de conformité, en TypeScript (ADR-003)",
  "TitreSalarie.obligationId": "référentiel de conformité, en TypeScript (ADR-003)",
  "DeclarationEtatPermanent.obligationId": "référentiel de conformité, en TypeScript (ADR-003)",
  "PieceEtatPermanent.obligationId": "référentiel de conformité, en TypeScript (ADR-003)",
  "FicheRegistre.sectionId": "section du registre, en TypeScript",
  "Intervention.creeParUserId": "auteur : l'identité, hors de la sonde",
  "Abonnement.stripeCustomerId": "identifiant chez Stripe",
  "Abonnement.stripeSubscriptionId": "identifiant chez Stripe",
  "Abonnement.stripePriceId": "identifiant chez Stripe",
};

/** Une requête de la sonde : le lien qu'elle éprouve, et le SQL qui compte ses lignes croisées. */
export type RequeteSonde = { lien: string; sql: string };

/** La requête qui compte les lignes de `nom` dont la cible n'est pas du même compte (ou établissement) ; `null` sans objet. */
function requete(
  nom: string,
  jointureCible: (alias: string) => string,
  cible: string,
  niveau: Niveau,
  filtre?: string,
): string | null {
  const source = chemin(nom, "s", "s", niveau);
  const visee = chemin(cible, "c", "c", niveau);
  if (!source || !visee) return null;
  return [
    `SELECT count(*)::int AS n FROM ${table(modele(nom))} s`,
    ...source.jointures,
    jointureCible("c"),
    ...visee.jointures,
    `WHERE ${filtre ? `${filtre} AND ` : ""}${source.valeur} IS DISTINCT FROM ${visee.valeur}`,
  ].join(" ");
}

/** Un lien à sonder, avant d'en tirer la requête d'un niveau. */
type Lien = { lien: string; source: string; cible: string; jointure: (alias: string) => string; filtre?: string };

function liens(): Lien[] {
  const parRelation = Prisma.dmmf.datamodel.models.filter((m) => duCompte(m.name)).flatMap((m) => {
    const c = classement(m.name);
    return m.fields
      .filter((f) => f.kind === "object" && (f.relationFromFields?.length ?? 0) > 0 && duCompte(f.type))
      // Le parent DÉFINIT le compte de la ligne : rien à comparer.
      .filter((f) => !("parent" in c && c.parent === f.name))
      .map((f) => ({ lien: `${m.name}.${f.name} → ${f.type}`, source: m.name, cible: f.type, jointure: (p: string) => jointure(m, f, "s", p) }));
  });
  const sansRelation = CLES_SANS_RELATION.flatMap(({ modele: nom, cle, cibles, parType }) => {
    const m = modele(nom);
    const paires = typeof cibles === "string" ? [[undefined, cibles] as const] : Object.entries(cibles);
    return paires.map(([type, cible]) => ({
      lien: `${nom}.${cle}${type ? ` (${type})` : ""} → ${cible}`,
      source: nom,
      cible,
      jointure: (p: string) => `JOIN ${table(modele(cible))} ${p} ON ${p}.${identifiant(modele(cible))} = s.${colonne(m, cle)}`,
      filtre: type && parType ? `s.${colonne(m, parType)}::text = '${type}'` : undefined,
    }));
  });
  // Les clés de stockage (revue de #253) : le fichier qu'une ligne désigne est
  // tenu au compte de la ligne par le registre des dépôts (`FichierStocke`,
  // ADR-053 § 14). Une clé d'un autre compte servirait son fichier, et pèserait
  // sur son quota. Un fichier déposé avant ce registre n'y figure pas, et
  // échappe à la sonde.
  const fichiers = Object.entries(CLES_STOCKEES).flatMap(([nom, cols]) =>
    (cols as readonly string[]).map((col) => ({
      lien: `${nom}.${col} → FichierStocke`,
      source: nom,
      cible: "FichierStocke",
      jointure: (p: string) => `JOIN "FichierStocke" ${p} ON ${p}."cle" = s.${colonne(modele(nom), col)}`,
    })),
  );
  return [...parRelation, ...sansRelation, ...fichiers];
}

/**
 * Toutes les requêtes, dans l'ordre du schéma. Au niveau du compte, d'abord :
 * l'invariant de l'isolation. Au niveau de l'établissement ensuite, pour les
 * lignes qui en ont un des deux côtés : une écriture par le client brut
 * (calendrier, ADR-054 § 4) qui rattacherait une ligne à l'appareil d'un autre
 * établissement du même compte ne se voit qu'ici (revue de #253).
 * Ce niveau suppose qu'aucune relation LÉGITIME ne relie deux établissements
 * d'un même compte : vrai sur le schéma du 2026-11-09. Le jour où un partage
 * entre établissements naît (un prestataire commun, par exemple), exempter ce
 * lien-là nommément, avec son motif — ne pas retirer le niveau (seconde
 * lecture de #253).
 */
export function requetesSonde(): RequeteSonde[] {
  const tous = liens();
  return (["compte", "etablissement"] as const).flatMap((niveau) =>
    tous.flatMap(({ lien, source, cible, jointure: j, filtre }) => {
      const sql = requete(source, j, cible, niveau, filtre);
      return sql ? [{ lien: niveau === "compte" ? lien : `${lien} (établissement)`, sql }] : [];
    }),
  );
}

/** Toutes les requêtes en une seule : une ligne par lien, avec son compte de lignes croisées. */
function requeteUnique(): string {
  return requetesSonde()
    .map(({ lien, sql }, i) => `${i === 0 ? "SELECT" : "UNION ALL SELECT"} '${lien.replace(/'/g, "''")}' AS lien, (${sql}) AS lignes_croisees`)
    .join("\n");
}

/** Un lien croisé trouvé : le lien et le nombre de lignes qui pointent vers un autre compte. */
export type LienCroise = { lien: string; lignes: number };

type Lecteur = { $queryRaw<T>(requete: Prisma.Sql): Promise<T> };

/**
 * Lance la sonde sur `client` (le client brut : elle lit à travers les
 * comptes, c'est son objet). Rend les liens croisés, vide si l'invariant tient.
 * Le SQL est fait d'identifiants tirés du schéma et de constantes, aucune
 * entrée : d'où `Prisma.raw`.
 */
export async function sondeClesCroisees(client: Lecteur): Promise<LienCroise[]> {
  // Une seule requête, comme la section de `sante-base.sql` : un aller-retour
  // au lieu d'un par lien (revue medium de #253). L'ordre des lignes d'un
  // UNION ALL n'est pas garanti : on retrie dans l'ordre des liens.
  const lignes = await client.$queryRaw<{ lien: string; lignes_croisees: number }[]>(Prisma.raw(requeteUnique()));
  const ordre = requetesSonde().map((r) => r.lien);
  return lignes
    .filter((l) => l.lignes_croisees > 0)
    .sort((a, b) => ordre.indexOf(a.lien) - ordre.indexOf(b.lien))
    .map((l) => ({ lien: l.lien, lignes: l.lignes_croisees }));
}

export const DEBUT_SECTION = "-- SONDE:DEBUT (générée par scripts/sonde-cles-croisees.ts — ne pas modifier à la main)";
export const FIN_SECTION = "-- SONDE:FIN";

/** La section de `scripts/sante-base.sql` : une ligne par lien, attendu 0 partout. */
export function sectionSanteBase(): string {
  return [
    DEBUT_SECTION,
    "\\echo '=== D bis. Clés croisées entre comptes, générée depuis le schéma (attendu : 0 partout)'",
    `${requeteUnique()};`,
    FIN_SECTION,
  ].join("\n");
}
