// @vitest-environment jsdom
/**
 * Un seul idiome pour dire où vit une page d'entrée de registre (ADR-014).
 *
 * Contrôle visuel du 2026-10-13 : « ← LE COMPTOIR DES HALLES » sur les permis
 * de feu, les plans de prévention et les zones, un fil d'Ariane sur le carnet
 * sanitaire — la même relation dite de deux façons. Le lien vers
 * l'établissement dit où la page est RANGÉE : c'est un fil d'Ariane, pas un
 * retour (le retour dit d'où l'on vient).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FilAriane } from "./FilAriane";

afterEach(cleanup);

describe("FilAriane", () => {
  it("le parent est un lien, la page courante ne l'est pas", () => {
    render(
      <FilAriane
        crumbs={[
          { href: "/etablissements/e1", label: "Le Comptoir des Halles" },
          { href: "/ignore", label: "Permis de feu" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    const liens = nav.querySelectorAll("a");
    expect(liens).toHaveLength(1);
    expect(liens[0].getAttribute("href")).toBe("/etablissements/e1");
    expect(nav.textContent).toContain("Permis de feu");
    expect(nav.textContent).not.toContain("←");
  });
});

/**
 * Ce qui, dans le source d'une page d'entrée, écrit un RETOUR en dur vers
 * l'établissement au lieu de dire où la page est rangée. Quatre formes
 * rencontrées : la flèche `ArrowLeft`, le chevron gauche, le chevron droit
 * retourné (`rotate-180` — le calendrier, le registre et le périmètre le
 * portaient jusqu'au 2026-10-13, et une garde qui ne cherchait que
 * `ArrowLeft` les laissait passer), et la flèche « ← » écrite en texte. Plus
 * le lien lui-même : un `<Link>` posé à la main sur la racine de
 * l'établissement, que le fil d'Ariane est seul à porter.
 */
function retoursEnDur(source: string): string[] {
  // Les commentaires racontent l'historique (« ← LE COMPTOIR DES HALLES ») :
  // ils ne s'affichent pas, ils ne comptent pas.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const fautes: string[] = [];
  if (code.includes("ArrowLeft")) fautes.push("ArrowLeft");
  if (code.includes("ChevronLeft")) fautes.push("ChevronLeft");
  if (/<Chevron\w*[^>]*\brotate-180\b/.test(code)) {
    fautes.push("chevron retourné (rotate-180)");
  }
  if (code.includes("←")) fautes.push("« ← » en texte");
  if (/<Link\s+href=\{(?:`\/etablissements\/\$\{id\}`|base)\}/.test(code)) {
    fautes.push("<Link> écrit à la main vers l'établissement");
  }
  return fautes;
}

describe("les pages d'entrée disent leur rangement par un fil d'Ariane", () => {
  const RACINE = path.resolve(__dirname, "../../app/etablissements/[id]");
  // Toutes les pages d'entrée de module : chaque dossier direct sous
  // `etablissements/[id]` qui porte une page. Balayées et non énumérées — une
  // page d'entrée neuve tombe sous la garde sans qu'on ait à l'y inscrire.
  // Les fiches de détail (`[actionId]`, `[permisFeuId]`…) et les écrans de
  // saisie (`nouveau`, `modifier` d'une fiche) sont plus profonds : leur
  // retour suit la provenance (ADR-014), pas cette règle.
  const pages = readdirSync(RACINE, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("["))
    .map((e) => e.name)
    .filter((nom) => existsSync(path.join(RACINE, nom, "page.tsx")))
    .sort();
  const lire = (dossier: string) =>
    readFileSync(path.join(RACINE, dossier, "page.tsx"), "utf8");

  it("balaie bien les pages d'entrée (borne basse)", () => {
    // 21 au 2026-10-13. Une borne basse : un dossier renommé ou un chemin
    // cassé ferait passer la garde à vide, pas une page ajoutée.
    expect(pages.length).toBeGreaterThanOrEqual(21);
  });

  it.each(pages)(
    "%s : aucune flèche de retour écrite en dur vers l'établissement",
    (dossier) => {
      expect(retoursEnDur(lire(dossier))).toEqual([]);
    },
  );

  // Le pendant positif, en borne basse : les pages passées au fil — les
  // quatre frères du carnet (contrôle visuel du 2026-10-13), puis les onze
  // du lot `fil-ariane-entrees`. Retirer le fil de l'une d'elles sans rien
  // remettre à la place doit se voir.
  it.each([
    "batiments",
    "carnet-sanitaire",
    "permis-feu",
    "plan-prevention",
    "actions",
    "calendrier",
    "duerp",
    "equipe",
    "etats-permanents",
    "modifier",
    "perimetre",
    "prescriptions",
    "prestataires",
    "quand-ca-arrive",
    "registre",
  ])("%s : un fil d'Ariane vers l'établissement", (dossier) => {
    expect(lire(dossier)).toMatch(/<FilAriane|crumbs=\{/);
  });

  it("la garde reconnaît les quatre formes de retour en dur", () => {
    const lien = (icone: string) =>
      `<Link\n  href={\`/etablissements/\${id}\`}\n  className="x"\n>\n  ${icone}\n  {etab.raisonDisplay}\n</Link>`;
    expect(retoursEnDur(lien(`<ArrowLeft className="size-3" aria-hidden />`))).toContain("ArrowLeft");
    expect(
      retoursEnDur(lien(`<ChevronRight\n aria-hidden\n className="size-3 rotate-180"\n />`)),
    ).toContain("chevron retourné (rotate-180)");
    expect(retoursEnDur(`<Link href={base}>← Retour</Link>`)).toEqual([
      "« ← » en texte",
      "<Link> écrit à la main vers l'établissement",
    ]);
    // Le chevron d'un volet déplié n'est pas un retour.
    expect(
      retoursEnDur(`<span className="group-open:rotate-180">▾</span>`),
    ).toEqual([]);
    // Ni un commentaire qui raconte l'ancien retour.
    expect(retoursEnDur(`{/* « ← LE COMPTOIR DES HALLES » */}`)).toEqual([]);
  });
});
