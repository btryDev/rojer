// Les signatures d'avant le 2026-10-12, sans partie : l'acte repasse « en
// attente », et la fiche dit quoi faire (relecture indépendante du 2026-10-12).

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Signature } from "@prisma/client";
import {
  DEMARRER_ATTEND_LES_PARTIES,
  RESIGNER_CHAQUE_PARTIE,
  SignaturesSansPartie,
} from "./SignaturesParties";

const ancienne = {
  id: "sig-1",
  partie: null,
  signataireNom: "Paul Martin",
  signataireRole: null,
  signataireEmail: "paul@toitures.fr",
  horodatageIso: "2026-10-01T10:00:00.000Z",
  methode: "otp_email",
  hashDocument: "v2:abc",
  nomDocument: "Plan de prévention PP-001",
} as unknown as Signature;

describe("signatures sans partie", () => {
  it("la fiche dit de refaire signer chaque partie", () => {
    const html = renderToStaticMarkup(<SignaturesSansPartie signatures={[ancienne]} />);
    expect(html).toContain("elle n&#x27;est comptée pour aucune des deux.");
    expect(html).toContain("Faites signer à nouveau chaque partie depuis cette fiche.");
  });

  it("« Démarrer » absent pour cette raison se dit avec la même phrase", () => {
    expect(DEMARRER_ATTEND_LES_PARTIES.endsWith(RESIGNER_CHAQUE_PARTIE)).toBe(true);
  });

  it("sans signature ancienne, rien ne s'affiche", () => {
    expect(renderToStaticMarkup(<SignaturesSansPartie signatures={[]} />)).toBe("");
  });
});
