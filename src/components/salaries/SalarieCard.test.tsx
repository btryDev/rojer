// La carte d'une personne dans Équipe, RENDUE (ADR-043, relecture C2) : un
// manque daté et en retard colore la tête ; un manque non daté reste ardoise.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CHAMP_ETAT } from "@/lib/calendrier/etats";
import type { SalarieDeLaListe } from "@/lib/salaries/queries";
import { SalarieCard } from "./SalarieCard";

const salarie = (manques: SalarieDeLaListe["manques"]): SalarieDeLaListe => ({
  id: "s1",
  nom: "Martin",
  prenom: "Claire",
  poste: null,
  entreLe: null,
  actif: true,
  titres: [],
  manques,
});

const rendre = (s: SalarieDeLaListe) =>
  renderToStaticMarkup(<SalarieCard etablissementId="e1" salarie={s} />);

const VIP = "Visite d'information et de prévention (VIP)";

describe("la carte d'Équipe montre ce qui manque", () => {
  it("un manque en retard colore la tête et se nomme", () => {
    const html = rendre(salarie([{ obligationId: "vip", libelle: VIP, etat: "enRetard" }]));
    expect(html).toContain(`background:${CHAMP_ETAT.enRetard}`);
    expect(html).toContain("À déclarer : Visite");
  });

  it("un manque non daté reste ardoise", () => {
    const html = rendre(salarie([{ obligationId: "vip", libelle: VIP, etat: null }]));
    expect(html).not.toContain(`background:${CHAMP_ETAT.enRetard}`);
    expect(html).toContain("À déclarer : Visite");
  });

  it("rien ne manque, rien ne déclaré : la phrase d'avant", () => {
    expect(rendre(salarie([]))).toContain("Aucun titre déclaré");
  });
});
