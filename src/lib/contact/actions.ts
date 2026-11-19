"use server";

// L'envoi du formulaire de contact de la page publique (2026-11-19 : il
// remplace le lien `mailto:` provisoire). Ouvert à tout visiteur, sans
// session : le message part par e-mail vers la boîte de Rojer, l'adresse du
// visiteur en `Reply-To`. Rien n'est enregistré en base — hormis le compteur
// de limitation de débit, dont la clé est l'empreinte de l'IP.
//
// Aucun accusé de réception n'est envoyé au visiteur : le formulaire
// enverrait alors des e-mails de Rojer à n'importe quelle adresse saisie.

import { headers } from "next/headers";
import { CHAMP_PIEGE, CONTACT } from "@/components/landing/contact";
import { courrielDeContact, schemaMessageContact } from "@/lib/contact/message";
import { envoiEnService, motifErreur, sendMail } from "@/lib/email";
import { ipPourLimite } from "@/lib/securite/ip-client";
import {
  cleLimite,
  consommer,
  LIMITES,
  messageTropDeTentatives,
} from "@/lib/securite/limite-debit";

export type EtatContact =
  | { status: "saisie" }
  | { status: "envoye"; email: string }
  | { status: "erreur"; message: string };

const ENVOI_IMPOSSIBLE =
  "Votre message n'a pas pu partir. Réessayez un peu plus tard : ce que vous avez écrit est conservé.";

export async function envoyerMessageContact(
  _prev: EtatContact,
  formData: FormData,
): Promise<EtatContact> {
  const champ = (nom: string) => String(formData.get(nom) ?? "");

  const lu = schemaMessageContact.safeParse({
    sujet: champ("sujet"),
    nom: champ("nom"),
    email: champ("email"),
    structure: champ("structure"),
    message: champ("message"),
  });
  if (!lu.success) {
    return { status: "erreur", message: lu.error.issues[0]?.message ?? "Vérifiez les champs du formulaire." };
  }

  // Un robot a rempli le champ invisible : on lui répond comme à un visiteur,
  // sans rien envoyer — lui dire non lui apprendrait à l'éviter. Le journal
  // le note, sans rien du message : un vrai visiteur jeté se verrait.
  if (champ(CHAMP_PIEGE).trim() !== "") {
    console.warn("[contact] message jeté : champ piège rempli");
    return { status: "envoye", email: lu.data.email };
  }

  if (!envoiEnService()) return { status: "erreur", message: ENVOI_IMPOSSIBLE };

  // L'IP d'abord, le compteur du site seulement si elle passe : `consommer`
  // use toutes les clés qu'on lui donne, et une seule adresse refusée en
  // boucle userait sinon le quota de tous. Sans IP lisible, un seau commun.
  const ip = ipPourLimite(await headers()) ?? "inconnue";
  let verdict = await consommer([{ cle: cleLimite("contact", "ip", ip), limite: LIMITES.contactIp }]);
  if (verdict.ok) {
    verdict = await consommer([{ cle: cleLimite("contact", "tous", "site"), limite: LIMITES.contactTous }]);
  }
  if (!verdict.ok) return { status: "erreur", message: messageTropDeTentatives(verdict.reessayerDansSecondes) };

  try {
    await sendMail({ to: CONTACT, replyTo: lu.data.email, ...courrielDeContact(lu.data) });
  } catch (e) {
    console.error("[contact] message non envoyé :", motifErreur(e));
    return { status: "erreur", message: ENVOI_IMPOSSIBLE };
  }
  return { status: "envoye", email: lu.data.email };
}
