/**
 * Le contact de la page publique : l'adresse, les sujets que le formulaire
 * propose (pied de page, tarif « Sur mesure », mise en route accompagnée), et
 * la règle d'un message valide, lue par le formulaire et par l'action qui
 * l'envoie (`lib/contact/actions.ts`).
 *
 * L'adresse n'est pas affichée sur la page (décision de la propriétaire,
 * 2026-11-07) : elle ne sert que de destinataire au formulaire.
 *
 * ⚠︎ À confirmer avant la mise en ligne : c'est l'adresse du compte, pas
 * forcément celle qu'on veut exposer publiquement. La même adresse est le
 * point d'entrée RGPD (`docs/rgpd.md`) : si elle change, vérifier si celle-ci
 * suit.
 */
import { z } from "zod";

export const CONTACT = "contact@btry.fr";

export const SUJETS_CONTACT = [
  "Une question sur Rojer",
  "Mise en route accompagnée",
  "Rojer sur mesure",
  "Autre",
] as const;

export type SujetContact = (typeof SUJETS_CONTACT)[number];

/**
 * La longueur d'un message. [2026-11-19 : 1 000 tant que le message partait
 * dans un lien `mailto:` (au-delà, certaines messageries tronquaient) ; il
 * part désormais du serveur.]
 */
export const MESSAGE_MAX = 3000;
export const NOM_MAX = 120;
export const EMAIL_MAX = 200;
export const STRUCTURE_MAX = 160;

/**
 * Le champ piège : invisible pour une personne, rempli par les robots qui
 * remplissent tout. Un message qui le porte est jeté sans rien dire. Son nom
 * ne veut rien dire, à dessein : « site web », « url » ou « société », le
 * remplissage automatique du navigateur le remplirait pour un vrai visiteur.
 */
export const CHAMP_PIEGE = "rjx_tampon";

/**
 * Les fins de ligne ramenées à `\n`, puis les espaces de début et de fin
 * retirés : le navigateur compte un saut de ligne pour un caractère
 * (`maxLength`), l'envoi du formulaire en fait deux (`\r\n`) — sans cela, un
 * message que le champ accepte serait refusé au serveur.
 */
const texte = (max: number, trop: string) =>
  z
    .string()
    .transform((t) => t.replace(/\r\n?/g, "\n").trim())
    .pipe(z.string().max(max, trop));

export const schemaMessageContact = z.object({
  sujet: z.enum(SUJETS_CONTACT, "Choisissez un sujet dans la liste."),
  nom: texte(NOM_MAX, `Le nom tient en ${NOM_MAX} caractères au plus.`).pipe(
    z.string().min(1, "Indiquez votre nom."),
  ),
  email: texte(EMAIL_MAX, "Cette adresse e-mail est trop longue.").pipe(
    z.email("Cette adresse e-mail n'est pas valide."),
  ),
  structure: texte(STRUCTURE_MAX, `Le nom de la structure tient en ${STRUCTURE_MAX} caractères au plus.`),
  message: texte(MESSAGE_MAX, `Le message tient en ${MESSAGE_MAX} caractères au plus.`).pipe(
    z.string().min(1, "Écrivez votre message."),
  ),
});

export type MessageContact = z.infer<typeof schemaMessageContact>;

/** Une ligne, sans saut de ligne ni espaces répétés : pour un sujet d'e-mail. */
function surUneLigne(t: string): string {
  return t.replace(/\s+/g, " ").trim();
}

/** L'e-mail qui part vers la boîte de Rojer. La réponse va au visiteur (`Reply-To`). */
export function courrielDeContact(m: MessageContact): { subject: string; text: string } {
  const qui = surUneLigne(m.structure ? `${m.nom} (${m.structure})` : m.nom);
  return {
    subject: `[Contact Rojer] ${m.sujet} — ${qui}`,
    text: [
      `Sujet : ${m.sujet}`,
      `Nom : ${surUneLigne(m.nom)}`,
      `E-mail : ${m.email}`,
      `Structure : ${m.structure ? surUneLigne(m.structure) : "—"}`,
      "",
      m.message,
      "",
      "—",
      "Envoyé depuis le formulaire de contact du site de Rojer. Répondre à ce message écrit à l'expéditeur.",
    ].join("\n"),
  };
}
