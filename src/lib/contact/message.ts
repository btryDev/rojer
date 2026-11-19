import "server-only";
// La règle d'un message de contact valide, et l'e-mail qui en part. Côté
// serveur seulement : le formulaire (`BoutonContact`, client) ne lit que les
// constantes de `components/landing/contact.ts`, pour ne pas tirer zod dans
// le JavaScript de chaque page publique.

import { z } from "zod";
import {
  EMAIL_MAX,
  MESSAGE_MAX,
  NOM_MAX,
  STRUCTURE_MAX,
  SUJETS_CONTACT,
} from "@/components/landing/contact";
import { surUneLigne, texteSaisi } from "@/lib/validation/texte";

export const schemaMessageContact = z.object({
  sujet: z.enum(SUJETS_CONTACT, "Choisissez un sujet dans la liste."),
  nom: texteSaisi(NOM_MAX, `Le nom tient en ${NOM_MAX} caractères au plus.`)
    .overwrite(surUneLigne)
    .min(1, "Indiquez votre nom."),
  email: texteSaisi(EMAIL_MAX, "Cette adresse e-mail est trop longue.").pipe(
    z.email("Cette adresse e-mail n'est pas valide."),
  ),
  structure: texteSaisi(STRUCTURE_MAX, `Le nom de la structure tient en ${STRUCTURE_MAX} caractères au plus.`).overwrite(
    surUneLigne,
  ),
  message: texteSaisi(MESSAGE_MAX, `Le message tient en ${MESSAGE_MAX} caractères au plus.`).min(
    1,
    "Écrivez votre message.",
  ),
});

export type MessageContact = z.infer<typeof schemaMessageContact>;

/** L'e-mail qui part vers la boîte de Rojer. La réponse va au visiteur (`Reply-To`). */
export function courrielDeContact(m: MessageContact): { subject: string; text: string } {
  return {
    subject: `[Contact Rojer] ${m.sujet} — ${m.structure ? `${m.nom} (${m.structure})` : m.nom}`,
    text: [
      `Sujet : ${m.sujet}`,
      `Nom : ${m.nom}`,
      `E-mail : ${m.email}`,
      `Structure : ${m.structure || "—"}`,
      "",
      m.message,
      "",
      "—",
      "Envoyé depuis le formulaire de contact du site de Rojer. Répondre à ce message écrit à l'expéditeur.",
    ].join("\n"),
  };
}
