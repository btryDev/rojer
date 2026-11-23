import "server-only";
/**
 * Abstraction d'envoi d'email transactionnel.
 *
 * Driver par défaut en dev : `console` — logue le contenu du mail dans les
 * logs serveur (utile pour le développement et les démos locales sans avoir
 * à configurer un vrai provider).
 *
 * En production : `EMAIL_DRIVER=mailpace` (add-on Clever Cloud, 2026-10-30),
 * clé dans `MAILPACE_API_KEY`, expéditeur dans `SIGNATURE_MAIL_FROM` (un
 * domaine vérifié chez Mailpace). Voir `mailpace.ts`.
 */
import { creerPiloteMailpace, ErreurEnvoiMail } from "./mailpace";

/**
 * Une pièce jointe (2026-11-19 : le PDF du plan de prévention signé). La
 * forme est celle de l'API Mailpace (`attachments`), au nom de champ près :
 * contenu en base64, type MIME. Mailpace n'accepte qu'une liste
 * d'extensions (pdf en est) et un nom à UN seul point ; 30 Mo par message.
 * https://docs.mailpace.com/reference/send
 */
export type PieceJointe = {
  name: string;
  /** Le fichier, encodé en base64. */
  content: string;
  contentType: string;
};

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: PieceJointe[];
  /**
   * L'adresse où part une réponse (en-tête `Reply-To`), une seule — par
   * exemple celle du visiteur qui écrit depuis le formulaire de contact.
   */
  replyTo?: string;
};

/** « Plan.pdf (12 Ko) » — pour un journal ou la boîte de développement. */
export function resumePieceJointe(p: PieceJointe): string {
  // Taille du fichier d'origine : 3 octets pour 4 caractères de base64.
  const octets = Math.floor((p.content.replace(/=+$/, "").length * 3) / 4);
  return `${p.name} (${Math.max(1, Math.round(octets / 1024))} Ko)`;
}

export interface EmailDriver {
  send(payload: EmailPayload): Promise<void>;
}

class ConsoleEmailDriver implements EmailDriver {
  async send(payload: EmailPayload): Promise<void> {
    console.log("\n" + "─".repeat(72));
    console.log(`✉  [email:console] À : ${payload.to}`);
    console.log(`   Sujet : ${payload.subject}`);
    if (payload.replyTo) console.log(`   Répondre à : ${payload.replyTo}`);
    console.log(`   ${"─".repeat(66)}`);
    console.log(payload.text);
    for (const p of payload.attachments ?? []) {
      console.log(`   Pièce jointe : ${resumePieceJointe(p)}`);
    }
    // L'expéditeur qui sortirait en production, pour le voir dès le dev.
    console.log(`   (From : ${mailFrom()})`);
    console.log("─".repeat(72) + "\n");

    // Le même message est gardé pour `/dev/boite-mail`, qui évite d'aller le
    // relire dans le terminal.
    //
    // L'import est dynamique ET sous une constante de compilation, à dessein.
    // Next remplace `process.env.NODE_ENV` avant le bundler : dans un build de
    // production, la condition vaut `false`, la branche est éliminée, et le
    // module `dev-outbox` n'est pas émis du tout — vérifié sur la sortie de
    // `next build`, aucun chunk ne le porte. Ce n'est donc pas une condition
    // évaluée à l'exécution que l'on pourrait retourner, c'est du code qui
    // n'existe plus.
    //
    // Les deux autres barrières restent, et elles sont indépendantes :
    // `dev-outbox` lève à son chargement sous `NODE_ENV=production`, et
    // `getEmailDriver` ci-dessous refuse de construire ce driver en
    // production.
    if (process.env.NODE_ENV !== "production") {
      const { capturerMail } = await import("./dev-outbox");
      capturerMail({ ...payload, piecesJointes: (payload.attachments ?? []).map(resumePieceJointe) });
    }
  }
}

let _driver: EmailDriver | null = null;

/**
 * Le pilote choisi : `EMAIL_DRIVER` sans espaces, `console` s'il est absent ou
 * vide. UN seul lecteur, comme `src/env.ts` le valide (une valeur vide y est
 * absente) : les deux couches ne peuvent pas lire deux pilotes différents.
 */
function nomDuDriver(): string {
  return process.env.EMAIL_DRIVER?.trim() || "console";
}

function cleMailpace(): string | undefined {
  return process.env.MAILPACE_API_KEY?.trim() || undefined;
}

/** Ce qu'une erreur dit d'elle-même, pour un journal : son message, rien d'autre. */
export function motifErreur(e: unknown): string {
  return e instanceof Error ? e.message : "erreur inconnue";
}

/**
 * Pourquoi aucun message ne partirait, ou `null` si l'envoi est en service.
 * UNE seule règle, lue par `getEmailDriver` (qui lève) et par `envoiEnService`
 * (qui répond avant qu'on écrive quoi que ce soit) : les deux ne peuvent pas
 * se contredire.
 */
function refusDuDriver(): string | null {
  const driver = nomDuDriver();
  if (driver === "mailpace") {
    // Sans clé, aucun envoi ne peut partir : on le sait AVANT d'écrire quoi
    // que ce soit, comme pour `console` en production.
    if (!cleMailpace()) {
      return "EMAIL_DRIVER vaut « mailpace » mais MAILPACE_API_KEY est absente : aucun mail ne partirait.";
    }
    return null;
  }
  if (driver === "console") {
    // Le driver `console` n'envoie rien : il imprime. En production, il ne
    // rend pas un service dégradé, il fait disparaître en silence des liens
    // de signature et des codes de confirmation que des destinataires
    // attendent. Un déploiement sans `EMAIL_DRIVER` avalait jusqu'ici chaque
    // message sans qu'aucune trace ne le dise. Il lève désormais au premier
    // envoi — c'est-à-dire au moment exact où le défaut a une conséquence.
    return process.env.NODE_ENV === "production"
      ? "EMAIL_DRIVER vaut « console » en production : aucun mail ne partirait, " +
          "et le lien de signature n'atteindrait jamais son destinataire. " +
          "Brancher un driver d'envoi réel avant de servir ce chemin."
      : null;
  }
  return `Driver email non supporté : ${driver}. Utiliser « console » ou « mailpace ».`;
}

/**
 * L'envoi d'un e-mail peut-il partir ? En production, aujourd'hui : non —
 * aucun driver réel n'est implémenté (relevé du 2026-09-26, C38). En
 * développement : oui, vers la console et `/dev/boite-mail`.
 *
 * À appeler AVANT toute écriture qui n'a de sens que si le message part : un
 * jeton d'accès créé puis jamais envoyé restait en base, et un code renouvelé
 * puis jamais envoyé rendait le précédent inutilisable.
 */
export function envoiEnService(): boolean {
  return refusDuDriver() === null;
}

export function getEmailDriver(): EmailDriver {
  if (_driver) return _driver;
  const refus = refusDuDriver();
  if (refus) throw new Error(refus);
  _driver =
    nomDuDriver() === "mailpace"
      ? creerPiloteMailpace({
          cle: cleMailpace()!,
          expediteur: mailFrom(),
        })
      : new ConsoleEmailDriver();
  return _driver;
}

/**
 * Les refus de Mailpace qui peuvent venir d'une pièce jointe (contenu,
 * extension, nom, taille). 401/403 (clé, domaine) et les réessayables n'en
 * sont pas : renvoyer sans la pièce rendrait la même erreur.
 */
const REFUS_DE_PIECE = new Set([400, 413, 415, 422]);

export async function sendMail(payload: EmailPayload): Promise<void> {
  const driver = getEmailDriver();
  if (!payload.attachments || payload.attachments.length === 0) return driver.send(payload);
  try {
    return await driver.send(payload);
  } catch (e) {
    // UNE PIÈCE REFUSÉE NE RETIENT PAS LE MESSAGE (2026-11-19). Le message
    // part sans elle, et le journal le dit — jamais le contenu ni l'adresse.
    if (!(e instanceof ErreurEnvoiMail) || e.statut === null || !REFUS_DE_PIECE.has(e.statut)) {
      throw e;
    }
    console.error(
      `[email] pièce jointe refusée (${payload.attachments.map((p) => p.name).join(", ")}), ` +
        `message renvoyé sans elle : ${e.message}`,
    );
    return driver.send({ ...payload, attachments: undefined });
  }
}

/**
 * L'expéditeur de tous les e-mails. Chez Mailpace, son domaine doit être
 * celui que la clé vérifie (DKIM) ; un autre domaine rend 403. Par défaut
 * l'adresse retenue par la propriétaire le 2026-10-30.
 */
export function mailFrom(): string {
  return process.env.SIGNATURE_MAIL_FROM?.trim() || "Rojer <no-reply@rojer.fr>";
}

// L'adresse publique (liens, QR codes, affiches) : la règle vit dans
// `lib/url-publique`, que le layout racine lit aussi sans charger l'e-mail.
export {
  MESSAGE_URL_PUBLIQUE_ABSENTE,
  publicAppUrl,
  refusUrlPublique,
} from "@/lib/url-publique";
