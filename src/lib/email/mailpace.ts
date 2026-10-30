import "server-only";
import { randomUUID } from "node:crypto";
import { fetchAvecDelai } from "@/lib/reseau/delai";
import type { EmailDriver, EmailPayload } from "./index";

/**
 * Pilote d'envoi par l'API HTTPS de Mailpace (add-on Clever Cloud, décision de
 * la propriétaire du 2026-10-30 ; plan de bascule, 0.8).
 *
 * Ce que la documentation de Mailpace impose ou permet, et ce qu'on en fait :
 * - `POST https://app.mailpace.com/api/v1/send`, JSON, clé du serveur dans
 *   l'en-tête `MailPace-Server-Token` — https://docs.mailpace.com/reference/send
 * - La clé est liée à UN domaine vérifié (DKIM obligatoire) : un `from` d'un
 *   autre domaine rend 403. L'expéditeur vient donc de la configuration
 *   (`mailFrom`), jamais de l'appelant.
 * - `Idempotency-Key` : une réponse réussie est rejouée pour la même clé
 *   pendant 24 h — https://docs.mailpace.com/guide/idempotency/ . Une clé par
 *   message, gardée entre les deux essais : réessayer ne peut pas envoyer
 *   deux fois.
 * - 429 (« sending too quickly ») et 5xx se réessaient ; 4xx non (adresse,
 *   clé, domaine : un second essai rendrait la même erreur) —
 *   https://docs.mailpace.com/reference/responses
 * - `to` accepte une LISTE séparée par des virgules (jusqu'à 50) : une adresse
 *   saisie « a@x.fr, b@y.fr » enverrait un lien ou un code à un tiers. Le
 *   pilote n'accepte qu'une adresse.
 *
 * Ce qui ne sort jamais du pilote : la clé, le contenu du message, l'adresse
 * du destinataire. Une erreur ne porte que le statut HTTP et le motif court de
 * Mailpace (« Invalid API Token », « Domain DKIM DNS not verified »…), qui ne
 * répète pas l'adresse.
 */

export const URL_ENVOI_MAILPACE = "https://app.mailpace.com/api/v1/send";

/** Délai d'un essai, réponse comprise (audit Next.js, M9). */
export const DELAI_ENVOI_MS = 10_000;
/** Deux essais au plus : l'action qui attend l'envoi reste courte. */
export const ESSAIS_ENVOI_MAX = 2;
const PAUSE_AVANT_REESSAI_MS = 1_000;

/** L'envoi n'est pas parti. `statut` : le code HTTP, `null` sans réponse. */
export class ErreurEnvoiMail extends Error {
  constructor(
    readonly statut: number | null,
    message: string,
  ) {
    super(message);
    this.name = "ErreurEnvoiMail";
  }
}

/** Une adresse, une seule : ni liste, ni nom, ni saut de ligne. */
function exigerAdresseUnique(to: string): void {
  if (/[,;<>\s]/.test(to) || !/^[^@]+@[^@]+\.[^@]+$/.test(to)) {
    throw new ErreurEnvoiMail(null, "Destinataire refusé : une seule adresse e-mail est attendue.");
  }
}

function reessayable(statut: number): boolean {
  return statut === 429 || statut >= 500;
}

/** Le motif court que Mailpace donne, sans jamais recopier le corps entier. */
async function motifDeMailpace(reponse: Response): Promise<string> {
  try {
    const corps = (await reponse.json()) as {
      error?: unknown;
      errors?: Record<string, unknown>;
    };
    if (typeof corps.error === "string") return corps.error.slice(0, 200);
    if (corps.errors && typeof corps.errors === "object") {
      return Object.entries(corps.errors)
        .map(([champ, msgs]) => `${champ} : ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
        .join(" ; ")
        .slice(0, 200);
    }
  } catch {
    // Pas de JSON (un 500 sans corps) : le statut suffit.
  }
  return "";
}

export function creerPiloteMailpace(options: {
  cle: string;
  expediteur: string;
  /** Pour les tests : le `fetch` à utiliser, et l'attente entre deux essais. */
  fetch?: typeof fetch;
  attendre?: (ms: number) => Promise<void>;
}): EmailDriver {
  const appeler = fetchAvecDelai(DELAI_ENVOI_MS, options.fetch);
  const attendre =
    options.attendre ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  return {
    async send(payload: EmailPayload): Promise<void> {
      exigerAdresseUnique(payload.to);
      const corps = JSON.stringify({
        from: options.expediteur,
        to: payload.to,
        subject: payload.subject,
        textbody: payload.text,
        ...(payload.html ? { htmlbody: payload.html } : {}),
      });
      const entetes = {
        Accept: "application/json",
        "Content-Type": "application/json",
        "MailPace-Server-Token": options.cle,
        // La même clé pour les deux essais : c'est ce qui rend le second sûr.
        "Idempotency-Key": randomUUID(),
      };

      let erreur = new ErreurEnvoiMail(null, "Envoi non tenté.");
      for (let essai = 1; essai <= ESSAIS_ENVOI_MAX; essai++) {
        let reponse: Response;
        try {
          reponse = await appeler(URL_ENVOI_MAILPACE, {
            method: "POST",
            headers: entetes,
            body: corps,
          });
        } catch {
          erreur = new ErreurEnvoiMail(null, "Mailpace injoignable (réseau ou délai dépassé).");
          if (essai < ESSAIS_ENVOI_MAX) {
            await attendre(PAUSE_AVANT_REESSAI_MS);
            continue;
          }
          throw erreur;
        }
        if (reponse.ok) return;
        const motif = await motifDeMailpace(reponse);
        erreur = new ErreurEnvoiMail(
          reponse.status,
          `Mailpace a refusé l'envoi (HTTP ${reponse.status}${motif ? ` : ${motif}` : ""}).`,
        );
        if (essai < ESSAIS_ENVOI_MAX && reessayable(reponse.status)) {
          await attendre(PAUSE_AVANT_REESSAI_MS);
          continue;
        }
        throw erreur;
      }
      throw erreur;
    },
  };
}
