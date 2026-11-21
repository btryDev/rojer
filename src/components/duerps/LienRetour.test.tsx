import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LienRetour } from "./LienRetour";
import { FilRetour } from "@/components/ui-kit/FilRetour";

// Relecture du 2026-11-21 : un libellé long (le nom d'une action, une raison
// sociale) débordait sur téléphone — le bouton ne passe pas à la ligne.

describe("LienRetour", () => {
  it("un libellé long tient dans sa colonne : texte tronqué, libellé entier dans `title`", () => {
    const long = "Remplacer le bloc autonome d'éclairage de sécurité ".repeat(6).trim();
    const html = renderToStaticMarkup(<LienRetour href="/a">{long}</LienRetour>);
    expect(html).toContain(`title="${long.replace(/'/g, "&#x27;")}"`);
    expect(html).toMatch(/<a[^>]*class="[^"]*\bmax-w-full\b/);
    expect(html).toMatch(/<span class="min-w-0 truncate">← /);
  });

  it("un libellé composé (`Plan {numero}`) donne son texte entier au `title`", () => {
    const numero = "PP-003";
    const html = renderToStaticMarkup(<LienRetour href="/a">Plan {numero}</LienRetour>);
    expect(html).toContain('title="Plan PP-003"');
  });
});

describe("FilRetour", () => {
  it("deux retours : le second, vers la liste, d'un ton plus clair", () => {
    const html = renderToStaticMarkup(
      <FilRetour
        provenance={{ href: "/etablissements/e1/calendrier", label: "Calendrier" }}
        canonique={{ href: "/etablissements/e1/plan-prevention", label: "Plans de prévention" }}
      />,
    );
    const liens = html.match(/<a[^>]*>/g) ?? [];
    expect(liens).toHaveLength(2);
    expect(liens[0]).toContain('href="/etablissements/e1/calendrier"');
    expect(liens[0]).not.toContain("board-slate-mid");
    expect(liens[1]).toContain('href="/etablissements/e1/plan-prevention"');
    expect(liens[1]).toContain("text-[color:var(--board-slate-mid)]");
    // `cn` garde une seule couleur de texte : celle du ton discret.
    expect(liens[1]).not.toContain("text-[color:var(--board-ink)]");
  });

  it("sans provenance : un seul retour, vers la liste", () => {
    const html = renderToStaticMarkup(
      <FilRetour provenance={null} canonique={{ href: "/etablissements/e1/plan-prevention", label: "Plans de prévention" }} />,
    );
    expect(html.match(/<a[^>]*>/g) ?? []).toHaveLength(1);
  });
});
