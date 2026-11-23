import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/landing/compte-session", () => ({ compteDeLaSession: async () => undefined }));
vi.mock("@/lib/demandes-ouverture/actions", () => ({ demanderOuvertureAction: async () => ({}) }));
// Sous vitest, une image importée n'a pas d'aperçu flou : `next/image`
// refuserait `placeholder="blur"`. Le cadre est remplacé par ce qu'il
// transmet — le texte alternatif.
vi.mock("@/components/landing/PhotoCadre", () => ({
  PhotoCadre: ({ photo }: { photo: { alt: string } }) => <span data-illustration="bientot" data-alt={photo.alt} />,
}));

const { default: PageBientot } = await import("./page");
const { CHAMP_PIEGE } = await import("@/lib/demandes-ouverture/formulaire");
const { FormulaireBientot } = await import("./FormulaireBientot");

/** La page « Rojer ouvre bientôt » (2026-11-23, `lib/ouverture.ts`). */
describe("/bientot", () => {
  it("dit que Rojer ouvre bientôt, sans date, et propose de laisser son adresse", async () => {
    const html = renderToStaticMarkup(await PageBientot());
    expect(html).toContain("Rojer ouvre très bientôt.");
    expect(html).toContain("nous vous écrirons le jour où vous pourrez commencer");
    expect(html).toContain('type="email"');
    expect(html).toContain("Me prévenir");
    // Aucune date promise (le pied de page porte l'année du copyright).
    // Le texte lu, sans les balises : un attribut (espace de noms SVG,
    // dimensions d'image) peut porter un nombre qui n'est pas une date.
    const corps = (html.match(/<section[\s\S]*<\/section>/)?.[0] ?? "").replace(/<[^>]+>/g, " ");
    expect(corps).toContain("Rojer ouvre très bientôt.");
    expect(corps).not.toMatch(/\b20\d\d\b/);
    // Rien sur la raison de l'attente (2026-11-23, décision de la propriétaire :
    // « les gens n'ont pas à le savoir »).
    expect(corps).not.toMatch(/abonnement|stripe|paiement/i);
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

  it("le chapeau ne redit pas ce que dit la note sous le champ (2026-11-23)", async () => {
    const html = renderToStaticMarkup(await PageBientot());
    expect(html).not.toContain("Un seul e-mail");
  });

  it("l'illustration est décorative : la page dit déjà tout", async () => {
    const html = renderToStaticMarkup(await PageBientot());
    expect(html).toContain('<span data-illustration="bientot" data-alt=""></span>');
  });
});

describe("le formulaire, selon la réponse", () => {
  it("adresse notée : l'accusé redit l'adresse, le champ disparaît", () => {
    const html = renderToStaticMarkup(<FormulaireBientot etatInitial={{ email: "paul@exemple.fr" }} />);
    expect(html).toContain('role="status"');
    expect(html).toContain("C&#x27;est noté. Nous vous écrirons à paul@exemple.fr le jour de l&#x27;ouverture.");
    expect(html).toContain("Corriger l&#x27;adresse");
    expect(html).not.toContain('type="email"');
  });

  it("refus : le message est lié au champ", () => {
    const html = renderToStaticMarkup(<FormulaireBientot etatInitial={{ erreur: "Adresse e-mail invalide." }} />);
    expect(html).toMatch(/<input[^>]*aria-invalid="true"[^>]*aria-describedby="bientot-email-erreur"/);
    expect(html).toContain('id="bientot-email-erreur"');
    expect(html).toContain("Adresse e-mail invalide.");
    expect(html).toContain("Me prévenir");
  });
});
