// L'e-mail qui porte une demande d'assistance vers la boîte de Rojer
// (ADR-050, amendée le 2026-11-24). La réponse se fait par e-mail : l'en-tête
// `Reply-To` est l'adresse de la personne qui demande. Module pur.

import type { CategorieAssistance } from "@prisma/client";
import { htmlMailAssistance } from "@/lib/email/gabarit";
import { surUneLigne } from "@/lib/validation/texte";
import { LABEL_CATEGORIE_ASSISTANCE } from "./libelles";

export type DemandePourCourriel = {
  categorie: CategorieAssistance;
  message: string;
  /** Ce que l'écran regardait, quand la demande part d'un encart. */
  contexte: string | null;
  /** Le chemin de la page d'où part la demande. */
  page: string;
  formule: string;
  personne: { nom: string | null; email: string };
  /** « Boulangerie Durand — Lyon 3e », ou `null` pour tout le compte. */
  etablissement: string | null;
  compteId: string;
  /** Le navigateur (`User-Agent`), pour reproduire un problème technique. Pas gardé en base. */
  navigateur: string | null;
};

/**
 * Les deux formes, comme les e-mails du compte : la mise en page
 * (`htmlMailAssistance`, 2026-11-24, décision de la propriétaire) et le
 * texte brut, que lisent les messageries sans HTML. Une seule liste de
 * champs, pour que les deux disent la même chose.
 */
export function courrielDAssistance(d: DemandePourCourriel): { subject: string; text: string; html: string } {
  const sujet = LABEL_CATEGORIE_ASSISTANCE[d.categorie];
  const ou = d.etablissement ? surUneLigne(d.etablissement) : "tout le compte";
  const nom = d.personne.nom ? surUneLigne(d.personne.nom) : null;
  const qui = nom ? `${nom} <${d.personne.email}>` : d.personne.email;
  const encadre = [
    { libelle: "Formule", valeur: d.formule },
    { libelle: "De", valeur: qui },
    { libelle: "Établissement", valeur: ou },
    ...(d.page ? [{ libelle: "Page", valeur: d.page }] : []),
    // Un champ caché, modifiable par le client : sur une ligne, pour ne pas
    // forger de fausses lignes « De : » dans le texte brut (revue de sécurité
    // du 2026-11-24).
    ...(d.contexte ? [{ libelle: "Écran", valeur: surUneLigne(d.contexte) }] : []),
    ...(d.navigateur ? [{ libelle: "Navigateur", valeur: surUneLigne(d.navigateur) }] : []),
    { libelle: "Compte", valeur: d.compteId },
  ];
  return {
    subject: `[Assistance Rojer · ${d.formule}] ${sujet} — ${ou}`,
    html: htmlMailAssistance({
      titre: sujet,
      chapeau: `${nom ?? d.personne.email} vous écrit depuis Rojer.`,
      encadre,
      message: d.message,
      repondreA: d.personne.email,
    }),
    text: [
      `Sujet : ${sujet}`,
      ...encadre.map((l) => `${l.libelle} : ${l.valeur}`),
      "",
      d.message,
      "",
      "—",
      `Envoyé depuis l'Assistance de Rojer. Répondre à ce message écrit à ${d.personne.email}.`,
    ].join("\n"),
  };
}
