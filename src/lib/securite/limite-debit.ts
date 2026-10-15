import "server-only";
// Limitation de débit des points d'entrée publics (audit OWASP B3 / B14,
// audit Next.js M11, 2026-10-14).
//
// POURQUOI EN BASE. Sur Vercel, chaque instance a sa mémoire : un compteur en
// mémoire se remet à zéro à chaque démarrage à froid et se divise par le nombre
// d'instances. PostgreSQL est le seul état partagé que l'app possède déjà ; il
// le reste chez Clever Cloud. Aucun service tiers.
//
// CE QUI EST COMPTÉ. Des tentatives, pas des échecs : la réservation se fait
// AVANT l'action, par une seule écriture que la base sérialise sur la ligne de
// la clé (`INSERT … ON CONFLICT DO UPDATE … RETURNING`). Dix requêtes
// simultanées sur une limite de cinq en voient passer cinq. Compter après coup
// les seuls échecs laisserait passer une rafale entière avant le premier
// enregistrement.
//
// FENÊTRE FIXE. `compte` repart à 1 quand `fenetreFin` est passée, dans la
// même écriture. L'horloge est celle de la base (`now()`), commune à toutes
// les instances. Une rafale à cheval sur deux fenêtres peut obtenir deux fois
// la limite : c'est le prix d'une seule ligne par clé, et la borne reste
// connue.
//
// CLÉS. `<action>:<dimension>:<empreinte>` — l'empreinte SHA-256 de l'IP, de
// l'adresse e-mail en minuscules ou de la portée : rien en clair.
//
// PANNE. Si la base ne répond pas, la limite laisse passer et le journal le
// dit : la connexion et l'inscription ne passent pas par la base, les couper
// avec elle ferait d'une panne de PostgreSQL une panne de connexion. La
// vérification publique et le MCP, eux, lisent la base de toute façon.

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type Limite = {
  /** Nombre de tentatives admises par fenêtre. */
  max: number;
  /** Durée de la fenêtre, en secondes. */
  fenetreSecondes: number;
};

/**
 * Les limites de l'application, en un seul endroit.
 *
 * Elles bornent un abus, pas un usage : un dirigeant qui se trompe trois fois
 * de mot de passe ne doit jamais les voir. L'IP est plus large que le compte —
 * un bureau, un réseau mobile partagent une adresse.
 */
export const LIMITES = {
  /** Connexion : devinette de mot de passe sur un compte, ou en largeur. */
  connexionCompte: { max: 10, fenetreSecondes: 15 * 60 },
  connexionIp: { max: 30, fenetreSecondes: 15 * 60 },
  /** Inscription : création de comptes en série. */
  inscriptionIp: { max: 10, fenetreSecondes: 60 * 60 },
  /** Réinitialisation : envoi de courriels en série vers une adresse. */
  reinitialisationCompte: { max: 5, fenetreSecondes: 60 * 60 },
  reinitialisationIp: { max: 20, fenetreSecondes: 60 * 60 },
  /** Vérification publique : recalcule une empreinte (jusqu'à 20 Mo lus). */
  verificationIp: { max: 30, fenetreSecondes: 10 * 60 },
  /**
   * MCP : la limite par IP précède l'authentification (qui peut coûter un
   * appel au serveur Auth). Large, parce que les clients MCP hébergés
   * partagent leurs adresses de sortie entre utilisateurs. La limite par
   * portée suit l'authentification.
   */
  mcpIp: { max: 600, fenetreSecondes: 60 },
  mcpPortee: { max: 120, fenetreSecondes: 60 },
} as const satisfies Record<string, Limite>;

export type Verdict =
  | { ok: true }
  | { ok: false; reessayerDansSecondes: number };

export function empreinte(valeur: string): string {
  return createHash("sha256").update(valeur).digest("hex").slice(0, 32);
}

export function cleLimite(action: string, dimension: string, valeur: string): string {
  return `${action}:${dimension}:${empreinte(valeur)}`;
}

/** Une fois sur `MENAGE_UN_SUR`, l'appel efface les fenêtres closes depuis un jour. */
const MENAGE_UN_SUR = 100;

type Dependances = {
  /** Le tirage du ménage, injecté par les tests. */
  tirage?: () => number;
};

/**
 * Consomme une tentative sur chaque clé, et refuse si l'une dépasse sa limite.
 * Les clés sont toutes consommées, même quand la première refuse : sinon
 * l'attaquant qui sature l'IP n'userait plus le compteur du compte visé.
 */
export async function consommer(
  demandes: { cle: string; limite: Limite }[],
  deps: Dependances = {},
): Promise<Verdict> {
  const tirage = deps.tirage ?? Math.random;
  let attente = 0;
  try {
    for (const { cle, limite } of demandes) {
      const [ligne] = await prisma.$queryRaw<{ compte: number; reste: number }[]>`
        INSERT INTO "LimiteDebit" ("cle", "compte", "fenetreFin")
        VALUES (${cle}, 1, now() + make_interval(secs => ${limite.fenetreSecondes}))
        ON CONFLICT ("cle") DO UPDATE SET
          "compte" = CASE WHEN "LimiteDebit"."fenetreFin" <= now()
                          THEN 1 ELSE "LimiteDebit"."compte" + 1 END,
          "fenetreFin" = CASE WHEN "LimiteDebit"."fenetreFin" <= now()
                              THEN now() + make_interval(secs => ${limite.fenetreSecondes})
                              ELSE "LimiteDebit"."fenetreFin" END
        RETURNING "compte",
          GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("fenetreFin" - now()))))::int AS "reste"`;
      if (ligne && ligne.compte > limite.max) {
        attente = Math.max(attente, ligne.reste);
      }
    }
    if (tirage() * MENAGE_UN_SUR < 1) {
      await prisma.$executeRaw`
        DELETE FROM "LimiteDebit" WHERE "fenetreFin" < now() - interval '1 day'`;
    }
  } catch (erreur) {
    console.error(
      "[limite-debit] compteur injoignable, la requête passe :",
      erreur instanceof Error ? erreur.message : erreur,
    );
    return { ok: true };
  }
  return attente > 0 ? { ok: false, reessayerDansSecondes: attente } : { ok: true };
}

/** « dans 12 minutes », « dans 40 secondes » : ce que lit l'utilisateur refusé. */
export function delaiLisible(secondes: number): string {
  if (secondes < 60) return `${secondes} seconde${secondes > 1 ? "s" : ""}`;
  const minutes = Math.ceil(secondes / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

export function messageTropDeTentatives(secondes: number): string {
  return `Trop de tentatives en peu de temps. Par sécurité, réessayez dans ${delaiLisible(secondes)}.`;
}
