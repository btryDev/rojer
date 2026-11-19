import { describe, expect, it } from "vitest";
import { motifLisible } from "./motif-lisible";
import { MOTIF_REVOCATION_ENVOI_ECHOUE, MOTIF_REVOCATION_NOUVEAU_LIEN } from "./revocation";
import { MOTIF_CONTENU_MODIFIE } from "@/lib/signatures/verrou-contenu";
import { OTP_ESSAIS_MAX } from "@/lib/signatures/otp";

describe("motifLisible — le motif d'un lien révoqué, en une phrase", () => {
  it("le motif brut des essais épuisés devient une phrase", () => {
    expect(motifLisible(`OTP épuisé (${OTP_ESSAIS_MAX} essais)`)).toBe(
      "Les 3 essais de code de ce lien sont épuisés.",
    );
  });

  it("un lien remplacé dit qu'un plus récent existe", () => {
    expect(motifLisible(MOTIF_REVOCATION_NOUVEAU_LIEN)).toMatch(/^Un lien plus récent remplace celui-ci/);
  });

  it("l'envoi échoué ne répète pas « demandez un nouveau lien », que la page dit déjà", () => {
    expect(motifLisible(MOTIF_REVOCATION_ENVOI_ECHOUE)).toBe("L'envoi de ce lien a échoué.");
  });

  it("les révocations du cycle de vie d'un acte", () => {
    expect(motifLisible("Plan de prévention clos")).toBe("Le plan de prévention a été clos.");
    expect(motifLisible("Plan de prévention annulé")).toBe("Le plan de prévention a été annulé.");
    expect(motifLisible("Permis de feu terminé")).toBe("Le permis de feu a été terminé.");
  });

  it("un motif en minuscules, suivi de la consigne de nouveau lien, devient une phrase", () => {
    expect(motifLisible(`${MOTIF_CONTENU_MODIFIE.plan} ; demandez un nouveau lien à votre interlocuteur`)).toBe(
      "Le plan de prévention a été modifié depuis l'envoi de ce lien.",
    );
    expect(motifLisible("l'entreprise extérieure a proposé une modification du plan")).toBe(
      "L'entreprise extérieure a proposé une modification du plan.",
    );
  });

  it("sans motif, rien à dire", () => {
    expect(motifLisible(null)).toBeNull();
    expect(motifLisible("  ")).toBeNull();
  });
});
