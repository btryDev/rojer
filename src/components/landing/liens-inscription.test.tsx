import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { INSCRIPTIONS_OUVERTES } from "@/lib/ouverture";

// La photo du hero : ses props d'image (aperçu flou) ne se calculent que sous
// le compilateur de Next. Seuls les liens comptent ici.
vi.mock("next/image", () => ({ getImageProps: () => ({ props: { src: "", srcSet: "", sizes: "", style: {} } }) }));
import { Hero } from "./Hero";
import { colonneCompte, SiteFooter } from "./SiteFooter";
import { TarifOffres } from "./TarifOffres";

/**
 * Inscriptions fermées (`lib/ouverture.ts`, 2026-11-23) : aucun bouton de la
 * page publique ne mène à /signup ; chacun mène à /bientot. Un compte
 * connecté garde son lien vers son dossier.
 */

const liens = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const COMPTE = { href: "/etablissements/etab-1", label: "Reprendre mon dossier" };

describe.skipIf(INSCRIPTIONS_OUVERTES)("les boutons d'inscription de la page publique, fermée", () => {
  it("le hero : « Essayer 30 jours » mène à /bientot", () => {
    const html = renderToStaticMarkup(<Hero />);
    expect(html).toContain("Essayer 30 jours");
    expect(liens(html)).toContain("/bientot");
    expect(liens(html).some((h) => h.startsWith("/signup"))).toBe(false);
  });

  it("le tarif : les cartes gardent leur libellé et mènent à /bientot", () => {
    const html = renderToStaticMarkup(<TarifOffres />);
    expect(html).toContain("Essayer 30 jours");
    expect(html).toContain("Choisir Pro");
    expect(liens(html).filter((h) => h === "/bientot")).toHaveLength(2);
    expect(liens(html).some((h) => h.startsWith("/signup"))).toBe(false);
  });

  it("le pied de page : « Être prévenu de l'ouverture », et « Se connecter » intact", () => {
    expect(colonneCompte(undefined).liens).toEqual([
      { href: "/bientot", label: "Être prévenu de l'ouverture" },
      { href: "/login", label: "Se connecter" },
    ]);
    const html = renderToStaticMarkup(<SiteFooter />);
    expect(liens(html)).toContain("/bientot");
    expect(liens(html)).toContain("/login");
    expect(liens(html).some((h) => h.startsWith("/signup"))).toBe(false);
  });
});

describe("un visiteur connecté garde son dossier", () => {
  it("le tarif mène à son dossier, pas à /bientot", () => {
    const html = renderToStaticMarkup(<TarifOffres compte={COMPTE} />);
    expect(liens(html).filter((h) => h === COMPTE.href)).toHaveLength(2);
    expect(liens(html)).not.toContain("/bientot");
  });

  it("le pied de page dit « Mon espace »", () => {
    expect(colonneCompte(COMPTE).liens).toEqual([{ href: COMPTE.href, label: "Mon espace" }]);
  });

  it("le hero ne lui propose pas de s'inscrire", () => {
    const html = renderToStaticMarkup(<Hero compte={COMPTE} />);
    expect(html).not.toContain("Essayer 30 jours");
  });
});

describe("rouverte, les boutons retrouvent /signup", () => {
  it("le pied de page", () => {
    expect(colonneCompte(undefined, true).liens[0]).toEqual({ href: "/signup", label: "Créer un compte" });
  });
});

describe("aucun lien public n'écrit /signup en dur", () => {
  // Les liens d'inscription passent par `lienInscription` (ou l'interrupteur
  // lui-même) : un `href="/signup"` écrit à la main échapperait à la fermeture.
  const FICHIERS = [
    "components/landing/Hero.tsx",
    "components/landing/TarifOffres.tsx",
    "components/landing/SiteFooter.tsx",
    "components/landing/LandingHeader.tsx",
    "components/layout/AppHeader.tsx",
    "app/login/page.tsx",
  ];
  for (const f of FICHIERS) {
    it(f, () => {
      const source = readFileSync(join(process.cwd(), "src", f), "utf8");
      expect(source).not.toMatch(/href=["'{`]+\/signup/);
    });
  }
});
