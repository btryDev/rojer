// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// Les actions serveur de la photo ouvrent la base : hors sujet ici.
vi.mock("@/lib/etablissements/photo", () => ({
  deposerPhotoEtablissement: vi.fn(),
  retirerPhotoEtablissement: vi.fn(),
}));
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ILLUSTRATIONS_BATIMENT } from "@/lib/etablissements/illustration";
import { HeroEtablissement } from "./hero-batiments";

afterEach(cleanup);

const etab = {
  id: "e1",
  raisonDisplay: "Le Comptoir des Halles",
  entrepriseId: "ent",
  adresse: "12 rue Montorgueil, 75001 Paris",
  effectifSurSite: 8,
  siret: null,
  codeNaf: "56.10A",
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: "N",
  typesErpAutres: [],
  categorieErp: "N5",
  classeIgh: null,
  entreprise: { raisonSociale: "SARL", effectif: 8 },
} as unknown as Parameters<typeof HeroEtablissement>[0]["etablissement"];

const zones = [
  { id: "z1", nom: "Bâtiment principal", nbEquipements: 7 },
  { id: "z2", nom: "Terrasse", nbEquipements: 0 },
];

function texte(e = etab, guide: Parameters<typeof HeroEtablissement>[0]["guide"] = null) {
  return (
    render(
      <HeroEtablissement etablissement={e} illustration="restaurant" photo={null} guide={guide} nbEquipe={6} nbEquipements={7} zones={zones} />,
    ).container.textContent ?? ""
  );
}

// 2026-10-25 : la fiche du hero présente l'établissement — à la place des
// trois relevés. Rien n'y est un état de conformité.
describe("hero : la fiche de l'établissement", () => {
  it("nomme l'établissement, son activité, son régime, son effectif, son équipe et son parc", () => {
    const t = texte();
    expect(t).toContain("Le Comptoir des Halles");
    expect(t).toContain("Restaurant · 12 rue Montorgueil, 75001 Paris");
    expect(t).toContain("ERP · type N · cat. 5");
    expect(t).toContain("+ Établissement de travail");
    expect(t).toContain("8 salariés");
    expect(t).toContain("6 fiches");
    expect(t).toContain("7 déclarés");
    expect(t).toContain("dans 2 zones");
  });

  it("hors ERP, le régime travail, sans précision redondante", () => {
    const t = texte({ ...etab, estERP: false });
    expect(t).toContain("Établissement de travail");
    expect(t).not.toContain("+ Établissement de travail");
  });

  it("n'affirme jamais un régime non déclaré : IGH seul", () => {
    const t = texte({ ...etab, estERP: false, estEtablissementTravail: false, estIGH: true });
    expect(t).toContain("IGH");
    expect(t).not.toContain("Établissement de travail");
  });

  it("les zones sont nommées comme zones, et une zone vide le dit", () => {
    const t = texte();
    expect(t).toContain("Zone principale");
    expect(t).not.toContain("Bâtiment principal");
    expect(t).toContain("aucun équipement");
  });
});

describe("hero : le guide de mise en place, depuis la fiche", () => {
  it("dossier incomplet : la fiche le dit et offre de finir", () => {
    const t = texte(etab, { aFaire: 2, contenu: <p>Les étapes</p> });
    expect(t).toContain("Informations incomplètes");
    expect(t).toContain("Finir de compléter les infos de l'établissement");
    // Les étapes ne sont pas montrées tant qu'on ne les demande pas.
    expect(t).not.toContain("Les étapes");
  });

  it("le bouton ouvre les étapes dans un panneau", () => {
    render(
      <HeroEtablissement etablissement={etab} illustration="restaurant" photo={null} guide={{ aFaire: 2, contenu: <p>Les étapes</p> }} nbEquipe={6} nbEquipements={7} zones={zones} />,
    );
    fireEvent.click(screen.getByText("Finir de compléter les infos de l'établissement"));
    expect(screen.getByRole("dialog").textContent).toContain("Les étapes");
    expect(screen.getByRole("dialog").textContent).toContain("Encore 2 étapes pour couvrir l'essentiel");
  });

  it("dossier complet : ni mention ni bouton", () => {
    const t = texte();
    expect(t).not.toContain("Informations incomplètes");
    expect(t).not.toContain("Finir de compléter");
  });
});

describe("planches du bâtiment", () => {
  // La règle de choix (`illustrationBatiment`) ne rend que des planches qui
  // existent : un fichier manquant laisserait la carte vide.
  it.each(ILLUSTRATIONS_BATIMENT)("%s : le fichier existe et est un WebP", (nom) => {
    const octets = readFileSync(join(process.cwd(), "public/illustrations/batiments", `${nom}.webp`));
    expect(octets.toString("ascii", 8, 12)).toBe("WEBP");
  });
});
