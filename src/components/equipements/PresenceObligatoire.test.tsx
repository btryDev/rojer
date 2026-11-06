// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  MaterielHorsParc,
  MentionPresence,
  type LigneSecuriteAffichee,
} from "./PresenceObligatoire";

// Ce que la page Équipements pose en tête d'un groupe (ADR-057 § 4) : la
// mention sur la carte de la catégorie dit combien d'appareils sont déclarés,
// jamais qu'ils sont en place ; le matériel sans catégorie garde son geste
// « Déclarer » vers « Ce qui doit être en place ».

afterEach(cleanup);

const commun = {
  fondement: null,
  aConfirmer: false,
  hrefAction: null,
};

const appareil = (id: string) => ({
  id,
  libelle: id,
  lieu: null,
  resume: { etat: "aPlanifier" as const, signaux: [], aConfirmer: [] },
  horsReferentiel: null,
  aCompleter: [],
  href: `/${id}`,
});

const dae = (n: number): LigneSecuriteAffichee => ({
  ...commun,
  obligationId: "dae-erp-detention",
  libelle: "Défibrillateur (DAE)",
  cible: { kind: "categorie", categorie: "DEFIBRILLATEUR" },
  etat: n > 0 ? "declare" : "pas_encore_declare",
  domaine: "secours",
  appareils: Array.from({ length: n }, (_, i) => appareil(`dae-${i}`)),
});

describe("MentionPresence", () => {
  it("dit « obligatoire ici » et le nombre déclaré, sans reprendre le nom de la catégorie", () => {
    render(<MentionPresence ligne={dae(2)} />);
    expect(screen.getByText(/Obligatoire ici · 2 déclarés/)).toBeTruthy();
    expect(screen.queryByText(/Défibrillateur/)).toBeNull();
  });

  it("aucun appareil : « aucun déclaré »", () => {
    render(<MentionPresence ligne={dae(0)} />);
    expect(screen.getByText(/aucun déclaré/)).toBeTruthy();
  });

  it("nomme l'obligation quand elle n'est pas la catégorie (alarme sonore ≠ SSI)", () => {
    render(
      <MentionPresence
        ligne={{
          ...dae(1),
          obligationId: "incendie-travail-alarme-sonore",
          libelle: "Système d'alarme sonore",
          cible: { kind: "categorie", categorie: "ALARME_INCENDIE" },
          domaine: "incendie",
        }}
      />,
    );
    expect(screen.getByText(/Obligatoire ici — système d'alarme sonore · 1 déclaré/)).toBeTruthy();
  });

  it("« à confirmer » quand le moteur la retient par prudence", () => {
    render(<MentionPresence ligne={{ ...dae(0), aConfirmer: true }} />);
    expect(screen.getByText(/À confirmer ici/)).toBeTruthy();
  });
});

describe("MaterielHorsParc", () => {
  it("« Déclarer » mène à la ligne de « Ce qui doit être en place »", () => {
    render(
      <MaterielHorsParc
        ligne={{
          ...commun,
          obligationId: "secours-etablissement-materiel",
          libelle: "Matériel de premiers secours",
          cible: { kind: "etat_permanent" },
          etat: "ailleurs",
          domaine: "secours",
          appareils: [],
          hrefAction: "/e/etats-permanents#etat-secours-etablissement-materiel",
        }}
      />,
    );
    const lien = screen.getByRole("link", { name: /Déclarer/ });
    expect(lien.getAttribute("href")).toBe("/e/etats-permanents#etat-secours-etablissement-materiel");
  });
});
