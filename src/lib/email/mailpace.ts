import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
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
 * - 429 (« sending too quickly »), 409 et 5xx se réessaient ; les autres 4xx
 *   non (adresse, clé, domaine : un second essai rendrait la même erreur) —
 *   https://docs.mailpace.com/reference/responses . Le 409 : un premier essai
 *   coupé par notre délai peut être encore en cours chez Mailpace, et la doc
 *   d'idempotence dit qu'une requête concurrente en conflit « can safely
 *   retry » ; si le premier a abouti entre-temps, Mailpace rend sa réponse.
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

/**
 * Délai d'un essai, réponse comprise (audit Next.js, M9). Deux essais et la
 * pause font au pire ~17 s, que l'action qui demande l'envoi attend.
 */
export const DELAI_ENVOI_MS = 8_000;
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

/**
 * Une adresse, une seule : ni liste, ni nom, ni saut de ligne. La même règle
 * que les formulaires (`z.string().email()`, `access-tokens/emission.ts`) ;
 * la redire ici protège le pilote d'un appelant qui ne valide pas.
 */
const ADRESSE_UNIQUE = z.string().email();
function exigerAdresseUnique(to: string): void {
  if (!ADRESSE_UNIQUE.safeParse(to).success) {
    throw new ErreurEnvoiMail(null, "Destinataire refusé : une seule adresse e-mail est attendue.");
  }
}

function reessayable(statut: number): boolean {
  return statut === 409 || statut === 429 || statut >= 500;
}

/** Ce que Mailpace écrit, sans aucune adresse e-mail qu'il aurait recopiée. */
function sansAdresse(texte: string): string {
  return texte.replace(/\S+@\S+/g, "[adresse]");
}

/** Le motif court que Mailpace donne, sans jamais recopier le corps entier. */
async function motifDeMailpace(reponse: Response): Promise<string> {
  try {
    const corps = (await reponse.json()) as {
      error?: unknown;
      errors?: Record<string, unknown>;
    };
    if (typeof corps.error === "string") return sansAdresse(corps.error).slice(0, 200);
    if (corps.errors && typeof corps.errors === "object") {
      return Object.entries(corps.errors)
        .map(([champ, msgs]) => `${champ} : ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
        .map(sansAdresse)
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

      for (let essai = 1; ; essai++) {
        const dernier = essai === ESSAIS_ENVOI_MAX;
        let reponse: Response;
        try {
          reponse = await appeler(URL_ENVOI_MAILPACE, {
            method: "POST",
            headers: entetes,
            body: corps,
          });
        } catch {
          if (dernier) {
            throw new ErreurEnvoiMail(null, "Mailpace injoignable (réseau ou délai dépassé).");
          }
          await attendre(PAUSE_AVANT_REESSAI_MS);
          continue;
        }
        if (reponse.ok) return;
        if (dernier || !reessayable(reponse.status)) {
          const motif = await motifDeMailpace(reponse);
          throw new ErreurEnvoiMail(
            reponse.status,
            `Mailpace a refusé l'envoi (HTTP ${reponse.status}${motif ? ` : ${motif}` : ""}).`,
          );
        }
        await attendre(PAUSE_AVANT_REESSAI_MS);
      }
    },
  };
}
