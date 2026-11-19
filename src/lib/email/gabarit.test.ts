import { describe, expect, it } from "vitest";
import {
  htmlMailCompte,
  htmlMailSignature,
  mailCompte,
  mailSignature,
  texteMailCompte,
  texteMailSignature,
  type MailCompte,
  type MailSignature,
} from "./gabarit";

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

  it("le HTML porte le titre, le bouton, la validité et le lien en clair", () => {
    const html = htmlMailCompte(MESSAGE);
    expect(html).toContain("Activez votre compte Rojer");
    expect(html).toContain('href="https://rojer.fr/auth/verification?token=a&amp;b=c"');
    expect(html).toContain(">Activer mon compte</a>");
    expect(html.match(/rojer\.fr\/auth\/verification/g)).toHaveLength(3);
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

const SIGNATURE: MailSignature = {
  titre: "Plan de prévention à signer",
  nom: "Jean Dupond",
  paragraphes: ["Boulangerie Martin vous invite à signer le plan de prévention."],
  encadre: [
    { libelle: "Référence", valeur: "PP-001" },
    { libelle: "Lieux", valeur: "Cuisine" },
  ],
  suite: ["Sur la page, demandez votre code."],
  bouton: { libelle: "Consulter et signer le plan", url: "https://rojer.fr/acces/abc" },
  validite: "jusqu'au 26 novembre 2026 à 14:30 (heure de Paris)",
  apres: ["Finalité : x.", "Droit d'accès / effacement : y."],
};

describe("e-mails de signature : la mise en page (2026-11-19)", () => {
  it("le texte se lit seul : bonjour, phrases, encadré, bouton et lien, validité, pied", () => {
    expect(texteMailSignature(SIGNATURE)).toBe(
      [
        "Bonjour Jean Dupond,",
        "",
        "Boulangerie Martin vous invite à signer le plan de prévention.",
        "",
        "Référence : PP-001",
        "Lieux : Cuisine",
        "",
        "Sur la page, demandez votre code.",
        "",
        "Consulter et signer le plan : https://rojer.fr/acces/abc",
        "Le lien est valable jusqu'au 26 novembre 2026 à 14:30 (heure de Paris).",
        "",
        "Finalité : x.",
        "Droit d'accès / effacement : y.",
      ].join("\n"),
    );
  });

  it("le HTML porte le titre, l'encadré, le bouton, la validité, le lien en clair et le pied", () => {
    const html = htmlMailSignature(SIGNATURE);
    expect(html).toContain(">Plan de prévention à signer</h1>");
    expect(html).toContain("PP-001");
    expect(html).toContain(">Consulter et signer le plan</a>");
    expect(html.match(/rojer\.fr\/acces\/abc/g)).toHaveLength(3);
    expect(html).toContain("Le lien est valable jusqu&#39;au 26 novembre 2026");
    expect(html).toContain("Droit d&#39;accès / effacement");
  });

  it("toute donnée saisie est échappée : nom, phrase, encadré", () => {
    const piege = '<img src=x onerror="alert(1)">';
    const html = htmlMailSignature({
      ...SIGNATURE,
      nom: piege,
      paragraphes: [`${piege} vous invite`],
      encadre: [{ libelle: "Lieux", valeur: piege }],
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("le code en gros caractères, sans bouton ni lien", () => {
    const m = mailSignature({
      titre: "Votre code de confirmation",
      paragraphes: [],
      code: { libelle: "Votre code de confirmation", valeur: "123456" },
      apres: [],
    });
    expect(m.text).toContain("Votre code de confirmation : 123456");
    expect(m.html).toMatch(/font-size:36px[^>]*>123456</);
    expect(m.html).not.toContain("href=");
    expect(m.html).not.toContain("Le bouton ne s");
  });

  it("un lien qui n'est pas http(s) : le message part en texte seul", () => {
    const m = mailSignature({ ...SIGNATURE, bouton: { libelle: "x", url: "javascript:alert(1)" } });
    expect(m.html).toBeUndefined();
  });
});
