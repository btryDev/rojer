import { describe, expect, it } from "vitest";
import { caracteristiquesLisibles } from "./caracteristiques";

describe("caracteristiquesLisibles", () => {
  it("ne rend rien quand la catégorie n'a ni propriété ni question", () => {
    expect(caracteristiquesLisibles("AUTRE", null)).toEqual([]);
    expect(caracteristiquesLisibles("AUTRE", undefined)).toEqual([]);
  });

  it("survit à un JSON qui n'est pas un objet", () => {
    // La colonne est un Json libre : rien ne garantit sa forme côté base.
    expect(caracteristiquesLisibles("AUTRE", "n'importe quoi")).toEqual([]);
    expect(caracteristiquesLisibles("AUTRE", [1, 2])).toEqual([]);
  });

  it("pose les questions de la catégorie même sans aucune donnée", () => {
    // Une VMC sans caractéristiques enregistrées porte quand même la question
    // VMC-Gaz : c'est elle qui explique l'échéance au calendrier.
    const c = caracteristiquesLisibles("VMC", null);
    expect(c.map((x) => x.cle)).toContain("estVmcGaz");
    expect(c.find((x) => x.cle === "estVmcGaz")?.enAttente).toBe(true);
  });

  it("annonce une question sans réponse plutôt que de la taire", () => {
    // C'est le point : l'obligation reste au calendrier tant que la
    // réponse manque, et la fiche est le seul endroit qui l'explique.
    const c = caracteristiquesLisibles("VMC", { nombre: 3 });
    const gaz = c.find((x) => x.cle === "estVmcGaz");
    expect(gaz).toMatchObject({
      valeur: "Pas encore répondu",
      enAttente: true,
    });
  });

  it("rend « oui » et « non » sans les confondre avec l'absence de réponse", () => {
    const oui = caracteristiquesLisibles("VMC", { estVmcGaz: true });
    expect(oui.find((x) => x.cle === "estVmcGaz")).toMatchObject({
      valeur: "Oui",
      enAttente: false,
    });

    const non = caracteristiquesLisibles("VMC", { estVmcGaz: false });
    expect(non.find((x) => x.cle === "estVmcGaz")).toMatchObject({
      valeur: "Non",
      enAttente: false,
    });
  });

  it("ne pose plus aucune question sur un extincteur", () => {
    // La question « Robinets d'incendie armés (RIA) » a été retirée le
    // 2026-09-03 : elle ne bornait plus rien depuis que les RIA ont leur
    // propre catégorie d'équipement et que la reprise a été jouée
    // (`incendie-erp-ria-annuelle`, notesInternes). Un extincteur ne porte
    // donc plus de question à trois états, et la fiche ne doit pas en
    // ressusciter une : une question qui ne décide de rien fait croire au
    // dirigeant que sa réponse compte.
    expect(caracteristiquesLisibles("EXTINCTEUR", null)).toEqual([]);
    expect(
      caracteristiquesLisibles("EXTINCTEUR", { aRobinetsIncendieArmes: true }),
    ).toEqual([]);
  });

  it("n'affiche que les questions de la catégorie", () => {
    // « Sert au levage de personnes » sur une VMC ferait douter du
    // reste de la fiche.
    const cles = caracteristiquesLisibles("VMC", {}).map((x) => x.cle);
    expect(cles).toContain("estVmcGaz");
    expect(cles).not.toContain("sertAuLevageDePersonnes");

    const levage = caracteristiquesLisibles("EQUIPEMENT_LEVAGE", {}).map(
      (x) => x.cle,
    );
    expect(levage).toEqual([
      "sertAuLevageDePersonnes",
      "estMuParForceHumaine",
      "estChariotOuGerbeur",
      "aAccessoiresDeLevage",
    ]);
  });

  it("réserve le groupe électrogène à l'installation électrique", () => {
    const elec = caracteristiquesLisibles("INSTALLATION_ELECTRIQUE", {
      aGroupeElectrogene: true,
    });
    expect(elec.map((x) => x.cle)).toContain("aGroupeElectrogene");

    const hotte = caracteristiquesLisibles("HOTTE_PRO", {
      aGroupeElectrogene: true,
    });
    expect(hotte.map((x) => x.cle)).not.toContain("aGroupeElectrogene");
  });

  it("ne pose le groupe électrogène qu'en ERP, ou quand le régime est inconnu (C41)", () => {
    const cles = (estERP?: boolean) =>
      caracteristiquesLisibles("INSTALLATION_ELECTRIQUE", {}, { estERP }).map(
        (x) => x.cle,
      );
    // Hors ERP, la question ne gouverne rien : « Pas encore répondu » y
    // annoncerait une attente que rien n'attend.
    expect(cles(false)).not.toContain("aGroupeElectrogene");
    expect(cles(true)).toContain("aGroupeElectrogene");
    // Régime inconnu : dans le doute, la question reste.
    expect(cles(undefined)).toContain("aGroupeElectrogene");
    const enErp = caracteristiquesLisibles(
      "INSTALLATION_ELECTRIQUE",
      {},
      { estERP: true },
    ).find((x) => x.cle === "aGroupeElectrogene");
    expect(enErp).toMatchObject({ valeur: "Pas encore répondu", enAttente: true });
  });

  it("réserve le local à pollution spécifique aux catégories d'aération", () => {
    // Le formulaire écrit `false` pour toutes les autres catégories : une
    // case décochée et une case jamais posée sont indistinguables dans un
    // `FormData`. Un extincteur affichait donc « Non » à une question
    // qu'on ne lui a jamais posée.
    const vmc = caracteristiquesLisibles("VMC", {
      estLocalPollutionSpecifique: false,
    });
    expect(vmc.map((x) => x.cle)).toContain("estLocalPollutionSpecifique");

    const extincteur = caracteristiquesLisibles("EXTINCTEUR", {
      estLocalPollutionSpecifique: false,
    });
    expect(extincteur.map((x) => x.cle)).not.toContain(
      "estLocalPollutionSpecifique",
    );
  });

  it("écarte une note vide", () => {
    const c = caracteristiquesLisibles("HOTTE_PRO", { notes: "   " });
    expect(c.map((x) => x.cle)).not.toContain("notes");
  });
});
