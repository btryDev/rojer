// La carte « À déclarer pour cette personne », RENDUE (ADR-043) : seule une
// passe de rendu voit ce que l'écran omet ou peint à tort.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ceQuiManqueALaPersonne } from "@/lib/salaries/du-a-la-personne";
import { CarteCeQuiManque } from "./CarteCeQuiManque";

const jour = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
const NOW = jour("2026-08-28");

const rendre = (entreLe: string | null, titres: { obligationId: string; delivreLe: Date }[] = []) =>
  renderToStaticMarkup(
    <CarteCeQuiManque
      manques={ceQuiManqueALaPersonne(
        { actif: true, entreLe: entreLe === null ? null : jour(entreLe) },
        titres,
      )}
      now={NOW}
      lienModifier="/modifier"
    />,
  ).replace(/&#x27;/g, "'");

describe("la carte de ce qui manque", () => {
  it("date la VIP depuis l'entrée et dit le retard", () => {
    const html = rendre("2026-01-05");
    expect(html).toContain("Visite d'information et de prévention");
    expect(html).toContain("3 mois après l'entrée au plus tard");
    expect(html).toContain("5 avril 2026");
    expect(html).toContain("En retard");
    // La date d'entrée est connue : aucun lien pour la renseigner.
    expect(html).not.toContain("Renseigner la date d'entrée");
  });

  it("sans date d'entrée : ni date ni retard, et le lien pour la renseigner", () => {
    const html = rendre(null);
    expect(html).toContain("n'est pas renseignée");
    expect(html).toContain("Non daté");
    expect(html).not.toContain("En retard");
    expect(html).toContain('href="/modifier"');
  });

  it("nomme le titre qui appelle l'attestation, exigée dès sa délivrance", () => {
    const html = rendre("2026-01-05", [
      { obligationId: "sante-travail-salarie-vip", delivreLe: jour("2026-02-01") },
      { obligationId: "formation-securite-salarie-accueil", delivreLe: jour("2026-01-10") },
      { obligationId: "conduite-salarie-autorisation", delivreLe: jour("2026-03-01") },
    ]);
    expect(html).toContain("Exigée dès « Autorisation de conduite délivrée par l'employeur »");
    expect(html).not.toContain("Visite d'information et de prévention");
  });

  it("ne date que le volet que R. 4141-20 date, pas la formation entière (relecture C1)", () => {
    const html = rendre("2026-01-05", [
      { obligationId: "sante-travail-salarie-vip", delivreLe: jour("2026-02-01") },
    ]);
    expect(html).toContain("Le texte date le volet « dispositions à prendre en cas d'accident ou de sinistre »");
    expect(html).toContain("Le reste de la formation se donne à l'embauche, sans délai chiffré.");
  });

  it("dit que c'est l'employeur qui doit (relecture R2)", () => {
    expect(rendre("2026-01-05")).toContain("Ce que l'employeur doit à cette personne");
  });

  it("la VIP cite l'article de la visite initiale, pas celui du renouvellement", () => {
    const html = rendre("2026-01-05");
    expect(html).toContain("R. 4624-10");
    expect(html).not.toContain("R. 4624-16");
  });

  it("ne rend rien quand rien ne manque", () => {
    expect(
      renderToStaticMarkup(<CarteCeQuiManque manques={[]} now={NOW} lienModifier="/m" />),
    ).toBe("");
  });
});
