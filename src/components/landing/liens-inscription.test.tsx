import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// La photo du hero : ses props d'image (aperçu flou) ne se calculent que sous
// le compilateur de Next. Seuls les liens comptent ici.
vi.mock("next/image", () => ({ getImageProps: () => ({ props: { src: "", srcSet: "", sizes: "", style: {} } }) }));
import { Hero } from "./Hero";
import { colonneCompte, SiteFooter } from "./SiteFooter";
import { TarifOffres } from "./TarifOffres";

/**
 * Les boutons d'inscription de la page publique mènent à /signup ; un compte
 * connecté garde son lien vers son dossier. [2026-11-26 : /bientot et
 * l'interrupteur `lib/ouverture.ts` retirés.]
 */

const liens = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const COMPTE = { href: "/etablissements/etab-1", label: "Reprendre mon dossier" };

describe("un visiteur sans compte est mené à l'inscription", () => {
  it("le hero : « Essayer 30 jours » mène à /signup", () => {
    const html = renderToStaticMarkup(<Hero />);
    expect(html).toContain("Essayer 30 jours");
    expect(liens(html)).toContain("/signup");
  });

  it("le tarif : les deux cartes à prix mènent à /signup, l'offre choisie comprise", () => {
    const html = renderToStaticMarkup(<TarifOffres />);
    expect(html).toContain("Essayer 30 jours");
    expect(html).toContain("Choisir Pro");
    expect(liens(html).filter((h) => h.startsWith("/signup"))).toHaveLength(2);
  });

  it("le pied de page : « Créer un compte » et « Se connecter »", () => {
    expect(colonneCompte(undefined).liens).toEqual([
      { href: "/signup", label: "Créer un compte" },
      { href: "/login", label: "Se connecter" },
    ]);
    const html = renderToStaticMarkup(<SiteFooter />);
    expect(liens(html)).toContain("/signup");
    expect(liens(html)).toContain("/login");
  });
});

describe("un visiteur connecté garde son dossier", () => {
  it("le tarif mène à son dossier, pas à l'inscription", () => {
    const html = renderToStaticMarkup(<TarifOffres compte={COMPTE} />);
    expect(liens(html).filter((h) => h === COMPTE.href)).toHaveLength(2);
    expect(liens(html).some((h) => h.startsWith("/signup"))).toBe(false);
  });

  it("le pied de page dit « Mon espace »", () => {
    expect(colonneCompte(COMPTE).liens).toEqual([{ href: COMPTE.href, label: "Mon espace" }]);
  });

  it("le hero ne lui propose pas de s'inscrire", () => {
    const html = renderToStaticMarkup(<Hero compte={COMPTE} />);
    expect(html).not.toContain("Essayer 30 jours");
  });
});
