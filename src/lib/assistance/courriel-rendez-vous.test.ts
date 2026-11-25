import { describe, expect, it } from "vitest";
import { courrielEquipeRendezVous, courrielPersonneRendezVous, type RendezVousPourCourriel } from "./courriel-rendez-vous";

// Les e-mails du rendez-vous annuel (ADR-063 § 6).

const BASE: RendezVousPourCourriel = {
  evenement: "reserve",
  debut: new Date("2026-12-02T08:00:00Z"),
  fin: new Date("2026-12-02T09:00:00Z"),
  mode: "telephone",
  telephone: "06 12 34 56 78",
  sujet: "La commission <de> mars",
  personne: { nom: "Marie Durand", email: "m.durand@example.fr" },
  compteId: "c1",
};

describe("courrielEquipeRendezVous", () => {
  it("dit qui, quand, comment joindre, et ce qui est à aborder", () => {
    const m = courrielEquipeRendezVous(BASE);
    expect(m.subject).toBe("[Rendez-vous Rojer] Rendez-vous réservé — mercredi 2 décembre 2026, 9 h – 10 h");
    expect(m.text).toContain("Téléphone : 06 12 34 56 78");
    expect(m.text).toContain("De : Marie Durand <m.durand@example.fr>");
    expect(m.text).toContain("Compte : c1");
    expect(m.text).toContain("La commission <de> mars");
    // Le HTML échappe ce que la personne a écrit.
    expect(m.html).toContain("La commission &lt;de&gt; mars");
  });

  it("en visio : le lien part en réponse, à l'adresse de la personne ; le numéro de secours suit", () => {
    const m = courrielEquipeRendezVous({ ...BASE, mode: "visio" });
    expect(m.text).toContain("Visio : envoyer le lien à m.durand@example.fr");
    expect(m.text).toContain("Téléphone de secours : 06 12 34 56 78");
    expect(courrielEquipeRendezVous({ ...BASE, mode: "visio", telephone: null }).text).not.toContain("secours");
  });

  it("un déplacement dit le créneau d'avant", () => {
    const m = courrielEquipeRendezVous({
      ...BASE,
      evenement: "deplace",
      avant: { debut: new Date("2026-11-30T08:00:00Z"), fin: new Date("2026-11-30T09:00:00Z") },
    });
    expect(m.subject).toContain("Rendez-vous déplacé");
    expect(m.text).toContain("Avant : lundi 30 novembre 2026, 9 h – 10 h");
  });

  it("une annulation rend le créneau, sans coordonnées", () => {
    const m = courrielEquipeRendezVous({ ...BASE, evenement: "annule" });
    expect(m.subject).toContain("Rendez-vous annulé");
    expect(m.text).toContain("Le créneau est rendu");
    expect(m.text).not.toContain("Téléphone :");
  });

  it("ce qui est à aborder, complété, part de nouveau", () => {
    const m = courrielEquipeRendezVous({ ...BASE, evenement: "complete" });
    expect(m.subject).toContain("Rendez-vous à préparer");
    expect(m.text).toContain("La commission <de> mars");
  });
});

describe("courrielPersonneRendezVous", () => {
  it("confirme la date, le mode, jusqu'à quand le changer, et mène au rendez-vous", () => {
    const m = courrielPersonneRendezVous(BASE, "https://rojer.test/etablissements/e1/assistance?onglet=rendez-vous");
    expect(m.subject).toBe("Rendez-vous réservé — mercredi 2 décembre 2026, 9 h – 10 h");
    // La date seule sur sa ligne, sous la phrase qui l'annonce, et en gras dans le HTML.
    expect(m.text).toContain("Votre rendez-vous annuel est réservé :\nMercredi 2 décembre 2026, 9 h – 10 h\n");
    expect(m.html).toMatch(/font-weight:600;[^>]*>Mercredi 2 décembre 2026, 9 h – 10 h<\/p>/);
    expect(m.text).toContain("Par téléphone : nous vous appelons au 06 12 34 56 78.");
    expect(m.text).toContain("jusqu'au mardi 1er décembre à 9 h");
    expect(m.text).toContain("https://rojer.test/etablissements/e1/assistance?onglet=rendez-vous");
    expect(m.html).toBeDefined();
  });

  it("en visio, annonce le lien par e-mail", () => {
    const m = courrielPersonneRendezVous({ ...BASE, mode: "visio", telephone: null }, "https://rojer.test/x");
    expect(m.text).toContain("En visio : le lien arrive par e-mail avant le rendez-vous.");
  });

  it("la formule Pro finie : le rendez-vous annulé le dit", () => {
    const m = courrielPersonneRendezVous({ ...BASE, evenement: "annule_hors_pro" }, "https://rojer.test/x");
    expect(m.subject).toContain("Rendez-vous annulé");
    expect(m.text).toContain("Votre formule Pro a pris fin");
    // Plus de rendez-vous à voir : le bouton ne le promet pas.
    expect(m.text).not.toContain("Voir mon rendez-vous");
  });
});
