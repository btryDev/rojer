/**
 * Boîte mail de développement : les derniers messages que le driver `console`
 * a écrits dans les logs et qu'aucun serveur n'a emportés.
 *
 * ── Pourquoi ce module existe ────────────────────────────────────────────
 *
 * Un lien de signature et son code de confirmation partent par le même canal
 * — la boîte mail du signataire — mais ils ne partent qu'à lui. C'est cette
 * séparation qui distingue une signature électronique d'une case cochée par
 * le donneur d'ordre : le demandeur ne doit jamais tenir le code.
 *
 * Le raccourci qui vivait ici avant faisait exactement l'inverse : la server
 * action `emettreAccessToken` renvoyait le code en clair au navigateur du
 * demandeur, et un modal l'affichait pour permettre d'essayer le flux en
 * local. Le besoin était réel — sans SMTP, le mail ne va nulle part — mais le
 * chemin traversait la seule garantie du dispositif, et rien ne l'empêchait
 * de faire de même en production.
 *
 * Le besoin est donc replacé dans le canal auquel il appartient : le testeur
 * vient lire le message ici, comme le signataire le lirait dans sa boîte, et
 * y prend le lien et le code ensemble. La séparation est simulée au lieu
 * d'être court-circuitée.
 *
 * ── Ce qui rend ce chemin impossible en production ───────────────────────
 *
 * Trois choses, dont deux ne dépendent d'aucune condition écrite à la main :
 *
 * 1. La route `/dev/boite-mail` **n'est pas compilée** en production. Elle
 *    s'appelle `page.dev.tsx`, et `next.config.ts` n'ajoute `dev.tsx` à
 *    `pageExtensions` que hors production. Dans un build de production, ce
 *    fichier n'est pas une route : l'URL n'existe pas, il n'y a rien à
 *    atteindre ni à deviner.
 * 2. Ce module **lève au chargement** sous `NODE_ENV=production` (ci-dessous).
 *    C'est la barrière pour tout autre import qui viendrait à l'atteindre :
 *    elle casse bruyamment plutôt que de rendre discrètement.
 * 3. `getEmailDriver()` refuse le driver `console` en production, si bien
 *    qu'aucun message n'entre jamais ici sur un déploiement de production.
 *
 * ── Ce qui n'est PAS couvert, et il faut le lire ─────────────────────────
 *
 * Reste une configuration où cette page se rend : un déploiement atteignable
 * lancé avec `NODE_ENV` différent de `production`, en driver `console`, et
 * pointé sur des données réelles — une préproduction montée à la main, par
 * exemple. Aucun des trois gardes ci-dessus ne s'y oppose.
 *
 * Ce qu'on peut en dire honnêtement : dans cette configuration, **aucun mail
 * de l'application ne part vers personne**, puisque le driver `console`
 * n'écrit que dans un terminal. Ce n'est pas une préproduction qui fonctionne
 * avec une page de trop, c'est une installation de développement pointée sur
 * des données réelles. Le danger y est cette dernière chose, et ce module ne
 * peut rien contre elle.
 *
 * Deux précisions, pour qu'on ne se croie pas couvert par ce qu'on n'a pas :
 * les déploiements de prévisualisation Vercel sont bâtis avec
 * `NODE_ENV=production` et tombent donc sous le garde 1. Et cette page n'est
 * volontairement pas placée derrière `requireUser()` : la boîte contient les
 * messages destinés à tous les établissements, une authentification y
 * laisserait n'importe quel compte lire ceux des autres tout en donnant
 * l'apparence d'une protection.
 */

if (process.env.NODE_ENV === "production") {
  throw new Error(
    "src/lib/email/dev-outbox.ts a été chargé avec NODE_ENV=production. " +
      "Cette boîte mail contient des codes de confirmation en clair et n'a " +
      "aucune raison d'exister en production — retirer l'import fautif.",
  );
}

export type MailCapture = {
  id: string;
  recuLe: Date;
  to: string;
  subject: string;
  text: string;
};

/** Au-delà, les plus anciens sortent. On teste un flux, on n'archive rien. */
export const BOITE_CAPACITE = 50;

// Le tampon vit sur `globalThis` pour la même raison que le client Prisma :
// `next dev` recharge les modules à chaque édition, et une boîte remise à
// zéro au milieu d'un essai de signature ferait perdre le code en cours.
const globalForOutbox = globalThis as unknown as {
  devOutbox: MailCapture[] | undefined;
};

const messages: MailCapture[] = (globalForOutbox.devOutbox ??= []);

export function capturerMail(payload: {
  to: string;
  subject: string;
  text: string;
}): void {
  messages.push({
    id: `mail_${Date.now()}_${messages.length}`,
    recuLe: new Date(),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
  while (messages.length > BOITE_CAPACITE) messages.shift();
}

/** Du plus récent au plus ancien — l'essai en cours est en haut. */
export function lireBoite(): MailCapture[] {
  return [...messages].reverse();
}

export function viderBoite(): void {
  messages.length = 0;
}
