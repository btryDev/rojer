// Les e-mails du rendez-vous annuel (ADR-063 § 6). Module pur.
// - À la boîte de Rojer, à chaque réservation, déplacement, annulation, ou
//   quand ce qui est à aborder change : on y répond, et pour une visio la
//   réponse porte le lien (à la main).
// - À la personne, une confirmation, avec l'invitation pour son agenda.

import type { ModeRendezVous } from "@prisma/client";
import { htmlMailAssistance, mailCompte } from "@/lib/email/gabarit";
import { surUneLigne } from "@/lib/validation/texte";
import { LABEL_MODE, commentSeParler, jusquAQuand, majuscule, quandLeRendezVous } from "./rendez-vous-libelles";

/**
 * `annule_hors_pro` : annulé par la tâche du jour, la formule Pro ayant pris
 * fin (ADR-063 § 7) ; `annule_suppression` : annulé avec son compte (ADR-058).
 */
export type Evenement = "reserve" | "deplace" | "complete" | "annule" | "annule_hors_pro" | "annule_suppression";

export type RendezVousPourCourriel = {
  evenement: Evenement;
  debut: Date;
  fin: Date;
  /** Le créneau d'avant, pour un déplacement. */
  avant?: { debut: Date; fin: Date };
  mode: ModeRendezVous;
  telephone: string | null;
  sujet: string | null;
  personne: { nom: string | null; email: string };
  compteId: string;
};

const TITRE: Record<Evenement, string> = {
  reserve: "Rendez-vous réservé",
  deplace: "Rendez-vous déplacé",
  complete: "Rendez-vous à préparer",
  annule: "Rendez-vous annulé",
  annule_hors_pro: "Rendez-vous annulé",
  annule_suppression: "Rendez-vous annulé",
};

/** La phrase d'ouverture, de qui a réservé. */
const CHAPEAU: Record<Evenement, (qui: string) => string> = {
  reserve: (qui) => `${qui} réserve son rendez-vous annuel.`,
  deplace: (qui) => `${qui} déplace son rendez-vous annuel.`,
  complete: (qui) => `${qui} complète ce qui est à aborder au rendez-vous annuel.`,
  annule: (qui) => `${qui} annule son rendez-vous annuel.`,
  annule_hors_pro: (qui) => `Le compte de ${qui} n'a plus la formule Pro : le rendez-vous annuel est annulé.`,
  annule_suppression: (qui) => `Le compte de ${qui} est supprimé : le rendez-vous annuel est annulé.`,
};

const estAnnule = (e: Evenement) => e === "annule" || e === "annule_hors_pro" || e === "annule_suppression";

/** L'e-mail à la boîte de Rojer : qui, quand, comment joindre, ce qui est à aborder. */
export function courrielEquipeRendezVous(r: RendezVousPourCourriel): { subject: string; text: string; html: string } {
  const quand = quandLeRendezVous(r.debut, r.fin);
  const nom = r.personne.nom ? surUneLigne(r.personne.nom) : null;
  const telephone = r.telephone ? surUneLigne(r.telephone) : null;
  const joindre =
    r.mode === "telephone"
      ? [{ libelle: "Téléphone", valeur: telephone ?? "non donné" }]
      : [
          { libelle: "Visio", valeur: `envoyer le lien à ${r.personne.email}` },
          ...(telephone ? [{ libelle: "Téléphone de secours", valeur: telephone }] : []),
        ];
  const encadre = [
    { libelle: "Quand", valeur: quand },
    ...(r.avant ? [{ libelle: "Avant", valeur: quandLeRendezVous(r.avant.debut, r.avant.fin) }] : []),
    { libelle: "Mode", valeur: LABEL_MODE[r.mode] },
    ...(estAnnule(r.evenement) ? [] : joindre),
    { libelle: "De", valeur: nom ? `${nom} <${r.personne.email}>` : r.personne.email },
    { libelle: "Compte", valeur: r.compteId },
  ];
  const message = estAnnule(r.evenement)
    ? "Le créneau est rendu : il redevient libre."
    : r.sujet?.trim() || "Rien de précisé sur ce qui est à aborder.";
  return {
    subject: `[Rendez-vous Rojer] ${TITRE[r.evenement]} — ${quand}`,
    html: htmlMailAssistance({
      titre: TITRE[r.evenement],
      chapeau: CHAPEAU[r.evenement](nom ?? r.personne.email),
      encadre,
      message,
      repondreA: r.personne.email,
    }),
    text: [
      TITRE[r.evenement],
      ...encadre.map((l) => `${l.libelle} : ${l.valeur}`),
      "",
      message,
      "",
      "—",
      `Envoyé depuis l'Assistance de Rojer. Répondre à ce message écrit à ${r.personne.email}.`,
    ].join("\n"),
  };
}

/** La confirmation à la personne, avec le lien vers l'onglet du rendez-vous. */
export function courrielPersonneRendezVous(
  r: Pick<RendezVousPourCourriel, "evenement" | "debut" | "fin" | "mode" | "telephone">,
  lien: string,
): { subject: string; text: string; html?: string } {
  const quand = quandLeRendezVous(r.debut, r.fin);
  // La date en gras, seule sur sa ligne, sous la phrase qui l'annonce
  // (2026-11-24, décision de la propriétaire).
  const paragraphes =
    r.evenement === "annule_hors_pro"
      ? [
          "Votre formule Pro a pris fin : votre rendez-vous annuel est annulé.",
          "Le rendez-vous annuel vient avec la formule Pro. Pensez à retirer l'événement de votre agenda.",
        ]
      : r.evenement === "annule"
        ? [
            "Votre rendez-vous annuel est annulé.",
            "Le fichier joint le retire de votre agenda. Vous pouvez en réserver un autre depuis l'Assistance.",
          ]
        : [
            `Votre rendez-vous annuel est ${r.evenement === "deplace" ? "déplacé" : "réservé"} :`,
            commentSeParler(r.mode, r.telephone),
            `Vous pouvez le déplacer ou l'annuler jusqu'au ${jusquAQuand(r.debut)}, depuis l'Assistance. L'invitation pour votre agenda est jointe.`,
          ];
  const titre = r.evenement === "deplace" ? "Rendez-vous déplacé" : estAnnule(r.evenement) ? "Rendez-vous annulé" : "Rendez-vous réservé";
  return {
    subject: `${titre} — ${quand}`,
    ...mailCompte({
      titre,
      paragraphes,
      enAvant: majuscule(quand),
      // Annulé, il n'y a plus de rendez-vous à voir (relecture du 2026-11-25).
      bouton: {
        libelle:
          r.evenement === "annule_hors_pro" ? "Ouvrir Rojer" : r.evenement === "annule" ? "Ouvrir l'Assistance" : "Voir mon rendez-vous",
        url: lien,
      },
      apres: [],
    }),
  };
}
