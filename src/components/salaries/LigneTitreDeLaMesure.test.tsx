// La ligne « Se déclare salarié par salarié », RENDUE : la table peut être
// juste et l'écran la taire (même leçon que `CarteTitresDuDuerp.test.tsx`).

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { titreParId } from "@/lib/salaries/catalogue";
import { LigneTitreDeLaMesure } from "./LigneTitreDeLaMesure";

const rendre = (referentielMesureId: string | null) =>
  renderToStaticMarkup(
    <LigneTitreDeLaMesure referentielMesureId={referentielMesureId} etablissementId="etab-1" />,
  );

describe("LigneTitreDeLaMesure", () => {
  it("nomme le titre et renvoie vers Équipe", () => {
    const html = rendre("trv-elec-habilitation");
    expect(html).toContain("Se déclare salarié par salarié");
    expect(html).toContain(titreParId("elec-salarie-habilitation")!.libelle);
    expect(html).toContain('href="/etablissements/etab-1/equipe"');
  });

  it("ne rend rien pour une mesure sans titre ni pour une mesure personnalisée", () => {
    expect(rendre("trv-elec-carnet")).toBe("");
    expect(rendre(null)).toBe("");
  });
});
