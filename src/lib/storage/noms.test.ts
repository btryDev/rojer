import { describe, expect, it } from "vitest";
import { nomDossierArchive, nomEntreeArchive } from "./noms";

describe("nomEntreeArchive", () => {
  it("garde un nom ordinaire et son extension", () => {
    expect(nomEntreeArchive("attestation-urssaf-2026.pdf", "URSSAF.pdf")).toBe(
      "attestation-urssaf-2026.pdf",
    );
  });

  it("neutralise une remontée d'arborescence", () => {
    expect(nomEntreeArchive("../../../../.ssh/authorized_keys", "URSSAF.pdf")).toBe(
      "authorized_keys",
    );
    expect(nomEntreeArchive("..\\..\\Windows\\System32\\drivers.sys", "K.pdf")).toBe(
      "drivers.sys",
    );
  });

  it("refuse un nom qui n'est qu'une remontée", () => {
    expect(nomEntreeArchive("..", "URSSAF.pdf")).toBe("URSSAF.pdf");
    expect(nomEntreeArchive("../", "URSSAF.pdf")).toBe("URSSAF.pdf");
    expect(nomEntreeArchive("/", "URSSAF.pdf")).toBe("URSSAF.pdf");
  });

  it("retombe sur le défaut quand le nom est vide ou absent", () => {
    expect(nomEntreeArchive(null, "RC_Pro.pdf")).toBe("RC_Pro.pdf");
    expect(nomEntreeArchive("   ", "RC_Pro.pdf")).toBe("RC_Pro.pdf");
    expect(nomEntreeArchive("***", "RC_Pro.pdf")).toBe("___");
  });

  it("remplace les caractères hors jeu sûr sans toucher au point d'extension", () => {
    expect(nomEntreeArchive("Kbis Société & Cie.pdf", "Kbis.pdf")).toBe(
      "Kbis_Societe___Cie.pdf",
    );
  });

  it("translittère les lettres accentuées au lieu de les remplacer par « _ »", () => {
    // Contrôle visuel du 2026-10-13 : « V_rif__lec_Atlantique ».
    expect(nomEntreeArchive("Vérif'Élec Atlantique.pdf", "x.pdf")).toBe(
      "Verif_Elec_Atlantique.pdf",
    );
    expect(nomEntreeArchive("Cœur Ægir Straße.pdf", "x.pdf")).toBe(
      "Coeur_AEgir_Strasse.pdf",
    );
  });

  it("borne la longueur", () => {
    const long = `${"a".repeat(300)}.pdf`;
    expect(nomEntreeArchive(long, "K.pdf").length).toBe(120);
  });
});

describe("nomDossierArchive", () => {
  it("remplace les espaces par des soulignés", () => {
    expect(nomDossierArchive("Ascenseurs du Nord", "Prestataire")).toBe(
      "Ascenseurs_du_Nord",
    );
  });

  it("garde la lettre de base des raisons sociales accentuées", () => {
    expect(nomDossierArchive("Sécurité Incendie Ouest", "Prestataire")).toBe(
      "Securite_Incendie_Ouest",
    );
  });

  it("retombe sur le défaut quand la raison sociale n'a aucun caractère sûr", () => {
    expect(nomDossierArchive("///", "Prestataire")).toBe("Prestataire");
  });
});
