import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/landing/compte-session", () => ({ compteDeLaSession: async () => undefined }));
vi.mock("@/lib/demandes-ouverture/actions", () => ({ demanderOuvertureAction: async () => ({}) }));

const { default: PageBientot } = await import("./page");
const { CHAMP_PIEGE } = await import("@/lib/demandes-ouverture/formulaire");

/** La page « Rojer ouvre bientôt » (2026-11-23, `lib/ouverture.ts`). */
describe("/bientot", () => {
  it("dit que Rojer ouvre bientôt, sans date, et propose de laisser son adresse", async () => {
    const html = renderToStaticMarkup(await PageBientot());
    expect(html).toContain("Rojer ouvre très bientôt.");
    expect(html).toContain("Nous terminons l&#x27;ouverture des abonnements.");
    expect(html).toContain('type="email"');
    expect(html).toContain("Me prévenir");
    // Aucune date promise (le pied de page porte l'année du copyright).
    const corps = html.match(/<section[\s\S]*<\/section>/)?.[0] ?? "";
    expect(corps).toContain("Rojer ouvre très bientôt.");
    expect(corps).not.toMatch(/\b20\d\d\b/);
  });

  it("dit à quoi sert l'adresse, et renvoie à la page de confidentialité", async () => {
    const html = renderToStaticMarkup(await PageBientot());
    expect(html).toContain("ne sert qu&#x27;à cet e-mail");
    expect(html).toContain("effacée après l&#x27;envoi, et sur simple demande avant.");
    expect(html).toContain('href="/legal/confidentialite"');
  });

  it("porte le champ piège, caché aux personnes", async () => {
    const html = renderToStaticMarkup(await PageBientot());
    expect(html).toContain(`name="${CHAMP_PIEGE}"`);
    expect(html).toMatch(/<div aria-hidden="true"[^>]*>\s*<label[^>]*>Ne pas remplir ce champ<\/label><input[^>]*tabindex="-1"/i);
  });
});
