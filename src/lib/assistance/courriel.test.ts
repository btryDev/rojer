import { describe, expect, it } from "vitest";
import { courrielDAssistance, type DemandePourCourriel } from "./courriel";

const base: DemandePourCourriel = {
  categorie: "rapport",
  message: "Faut-il remplacer les blocs ?",
  contexte: "Éclairage de sécurité (BAES)",
  page: "/etablissements/e1/registre",
  formule: "Pro",
  personne: { nom: "Marie Durand", email: "m.durand@example.fr" },
  etablissement: "Boulangerie Durand — Lyon 3e",
  compteId: "c1",
  navigateur: "Mozilla/5.0 (Macintosh) Safari/605.1.15",
};

describe("l'e-mail d'une demande d'assistance", () => {
  it("dit le sujet, la formule et le lieu dans l'objet", () => {
    expect(courrielDAssistance(base).subject).toBe(
      "[Assistance Rojer · Pro] Un rapport de contrôle — Boulangerie Durand — Lyon 3e",
    );
  });

  it("porte la question, qui la pose, la page et ce que l'écran regardait", () => {
    const { text } = courrielDAssistance(base);
    expect(text).toContain("Faut-il remplacer les blocs ?");
    expect(text).toContain("De : Marie Durand <m.durand@example.fr>");
    expect(text).toContain("Page : /etablissements/e1/registre");
    expect(text).toContain("Écran : Éclairage de sécurité (BAES)");
    expect(text).toContain("écrit à m.durand@example.fr");
    expect(text).toContain("Navigateur : Mozilla/5.0 (Macintosh) Safari/605.1.15");
  });

  it("sans établissement, la demande vaut pour tout le compte ; sans contexte, pas de ligne", () => {
    const { subject, text } = courrielDAssistance({
      ...base,
      etablissement: null,
      contexte: null,
      navigateur: null,
      personne: { nom: null, email: "a@b.fr" },
    });
    expect(subject).toMatch(/— tout le compte$/);
    expect(text).not.toContain("Écran :");
    expect(text).not.toContain("Navigateur");
    expect(text).toContain("De : a@b.fr");
  });

  it("la mise en page porte le message, échappé, et invite à répondre", () => {
    const { html } = courrielDAssistance({ ...base, message: "Ligne 1\n<script>alert(1)</script> & co" });
    expect(html).toContain("Un rapport de contrôle");
    expect(html).toContain("Ligne 1<br>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; co");
    expect(html).not.toContain("<script>");
    expect(html).toContain("la réponse part à m.durand@example.fr");
    // On y répond : le pied par défaut des e-mails de compte n'y est pas, sous
    // aucune forme d'espace (relecture du 2026-11-24).
    expect(html).not.toMatch(/répondez pas/);
    expect(html).not.toMatch(/btry|expert/i);
  });

  it("un nom sur plusieurs lignes ne casse pas l'objet", () => {
    const { subject } = courrielDAssistance({ ...base, etablissement: "Nom\nsur deux lignes" });
    expect(subject).not.toContain("\n");
  });
});
