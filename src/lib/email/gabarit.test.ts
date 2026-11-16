import { describe, expect, it } from "vitest";
import { htmlMailCompte, mailCompte, texteMailCompte, type MailCompte } from "./gabarit";

const MESSAGE: MailCompte = {
  titre: "Activez votre compte Rojer",
  paragraphes: ["Confirmez votre adresse pour activer votre compte."],
  bouton: { libelle: "Activer mon compte", url: "https://rojer.fr/auth/verification?token=a&b=c" },
  validite: "24 heures",
  apres: ["Si vous n'avez pas créé de compte, ignorez ce message."],
};

describe("e-mails de compte : la mise en page (2026-11-16)", () => {
  it("le texte brut garde la forme d'avant : bonjour, phrases, lien, suite", () => {
    expect(texteMailCompte(MESSAGE)).toBe(
      [
        "Bonjour,",
        "",
        "Confirmez votre adresse pour activer votre compte.",
        "",
        "Ouvrez ce lien (valable 24 heures) :",
        "https://rojer.fr/auth/verification?token=a&b=c",
        "",
        "Si vous n'avez pas créé de compte, ignorez ce message.",
      ].join("\n"),
    );
  });

  it("le HTML porte le titre, le bouton vers le lien et la validité, sans le lien en clair", () => {
    const html = htmlMailCompte(MESSAGE);
    expect(html).toContain("Activez votre compte Rojer");
    expect(html).toContain('href="https://rojer.fr/auth/verification?token=a&amp;b=c"');
    expect(html).toContain(">Activer mon compte</a>");
    expect(html.match(/rojer\.fr\/auth\/verification/g)).toHaveLength(1);
    expect(html).toContain("Le lien est valable 24 heures.");
    expect(html).toContain("ignorez ce message.");
  });

  it("toute valeur est échappée : un nom ne fait pas de balise", () => {
    const html = htmlMailCompte({
      ...MESSAGE,
      paragraphes: ['<a href="https://piege.example">Cliquez</a> vous invite'],
    });
    expect(html).not.toContain("piege.example\">");
    expect(html).toContain("&lt;a href=&quot;https://piege.example&quot;&gt;");
  });

  it("seul un lien http(s) devient un bouton", () => {
    expect(() => htmlMailCompte({ ...MESSAGE, bouton: { libelle: "x", url: "javascript:alert(1)" } })).toThrow();
  });

  it("un lien qui n'est pas http(s) : le message part en texte seul", () => {
    const m = mailCompte({ ...MESSAGE, bouton: { libelle: "x", url: "rojer.fr/auth/verification" } });
    expect(m.html).toBeUndefined();
    expect(m.text).toContain("rojer.fr/auth/verification");
  });

  it("mailCompte rend les deux formes", () => {
    const m = mailCompte(MESSAGE);
    expect(m.text).toBe(texteMailCompte(MESSAGE));
    expect(m.html).toBe(htmlMailCompte(MESSAGE));
  });
});
