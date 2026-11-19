import { describe, expect, it } from "vitest";
import { MOTIF_REVOCATION_ENVOI_ECHOUE, MOTIF_REVOCATION_NOUVEAU_LIEN } from "@/lib/access-tokens/revocation";
import { etatAffichePlan } from "./etats";
import {
  aUnLienOuUneSignature,
  etatDeLaPartie,
  historiqueDuPlan,
  type LienLu,
  type SignatureLue,
} from "./fiche-signatures";

const T0 = new Date("2026-11-19T14:00:00Z");
const plus = (min: number) => new Date(T0.getTime() + min * 60_000);

const lien = (id: string, extra: Partial<LienLu> = {}): LienLu => ({
  id,
  partie: "entreprise_exterieure",
  emailDestinataire: "paul@nettoyage.fr",
  nomDestinataire: "Paul Testeur",
  createdAt: plus(1),
  expireLe: plus(7 * 24 * 60),
  utiliseLe: null,
  revoqueLe: null,
  revoqueMotif: null,
  otpExpireLe: null,
  ...extra,
});

const signature = (id: string, extra: Partial<SignatureLue> = {}): SignatureLue => ({
  id,
  partie: "entreprise_utilisatrice",
  signataireNom: "Paloma Sanchez",
  horodatageIso: plus(2),
  methode: "compte_code_email",
  revoqueLe: null,
  revoqueMotif: null,
  ...extra,
});

describe("le statut affiché", () => {
  it("« Brouillon » tant que rien n'est parti ni signé, puis le statut de la base", () => {
    expect(etatAffichePlan("attente_signatures", false).mot).toBe("Brouillon");
    expect(etatAffichePlan("attente_signatures", true).mot).toBe("En attente de signatures");
    expect(etatAffichePlan("valide", true).mot).toBe("Signé");
    expect(etatAffichePlan("clos", false).mot).toBe("Plan clos");
  });

  it("un lien dont l'e-mail n'est pas parti ne sort pas le plan du brouillon", () => {
    expect(aUnLienOuUneSignature([lien("a", { revoqueLe: plus(1), revoqueMotif: MOTIF_REVOCATION_ENVOI_ECHOUE })], 0)).toBe(false);
    expect(aUnLienOuUneSignature([lien("a")], 0)).toBe(true);
    expect(aUnLienOuUneSignature([], 1)).toBe(true);
  });
});

describe("l'état d'une partie", () => {
  it("la signature l'emporte ; sinon le dernier lien, ouvert ou non", () => {
    expect(etatDeLaPartie("entreprise_utilisatrice", signature("s"), [], T0).etat).toBe("signee");
    const e = etatDeLaPartie(
      "entreprise_exterieure",
      null,
      [lien("ancien", { createdAt: plus(0), revoqueLe: plus(1), revoqueMotif: MOTIF_REVOCATION_NOUVEAU_LIEN }), lien("neuf", { otpExpireLe: plus(20) })],
      plus(5),
    );
    expect(e).toMatchObject({ etat: "lien_envoye", ouvert: true, lien: { id: "neuf" } });
  });

  it("un lien expiré ou révoqué se dit tel ; une autre partie ne compte pas", () => {
    expect(etatDeLaPartie("entreprise_exterieure", null, [lien("a")], plus(8 * 24 * 60)).etat).toBe("lien_expire");
    expect(etatDeLaPartie("entreprise_exterieure", null, [lien("a", { revoqueLe: plus(3) })], plus(5)).etat).toBe("lien_revoque");
    expect(etatDeLaPartie("entreprise_utilisatrice", null, [lien("a")], plus(5)).etat).toBe("rien");
  });
});

describe("l'historique", () => {
  const h = historiqueDuPlan({
    creeLe: T0,
    raisonEE: "Nettoyage Pro SARL",
    liens: [
      lien("l1", { otpExpireLe: plus(15), utiliseLe: null, revoqueLe: plus(30), revoqueMotif: MOTIF_REVOCATION_NOUVEAU_LIEN }),
      lien("l2", { createdAt: plus(31) }),
    ],
    signatures: [
      signature("s1", { revoqueLe: plus(25), revoqueMotif: "l'entreprise utilisatrice corrige le plan" }),
      signature("s2", { partie: "entreprise_exterieure", signataireNom: "Paul Testeur", methode: "otp_email", revoqueLe: plus(25), revoqueMotif: "l'entreprise utilisatrice corrige le plan" }),
    ],
    propositions: [
      { id: "p1", accessTokenId: "l1", statut: "refusee", createdAt: plus(10), traiteeLe: plus(12), traiteeParEmail: "moi@exemple.fr", corrigeeLe: null },
      { id: "p2", accessTokenId: "l1", statut: "acceptee", createdAt: plus(20), traiteeLe: plus(22), traiteeParEmail: "moi@exemple.fr", corrigeeLe: plus(22) },
      { id: "p3", accessTokenId: "l1", statut: "refusee", createdAt: plus(40), traiteeLe: plus(41), traiteeParEmail: null, corrigeeLe: null },
    ],
    maintenant: plus(60),
  });
  const lignes = h.map((e) => e.ligne);

  it("du plus récent au plus ancien, création en dernier", () => {
    expect(lignes.at(-1)).toBe("Plan créé");
    for (let i = 1; i < h.length; i++) expect(h[i - 1].date.getTime()).toBeGreaterThanOrEqual(h[i].date.getTime());
  });

  it("liens envoyés, ouverts, remplacés", () => {
    expect(lignes).toContain("Lien envoyé à Nettoyage Pro SARL");
    expect(lignes).toContain("Paul Testeur ouvre le lien et demande un code");
    expect(h.find((e) => e.cle === "revocation-l1")?.sousLigne).toBe("remplacé par un lien plus récent");
  });

  it("propositions : refusée, acceptée puis corrigée, refusée d'office", () => {
    expect(lignes).toContain("Paul Testeur propose des modifications");
    expect(lignes).toContain("Vous refusez la proposition de Nettoyage Pro SARL");
    expect(lignes).toContain("Vous acceptez la proposition de Nettoyage Pro SARL et la corrigez");
    expect(lignes).toContain("Proposition refusée d'office : le plan a été clos ou annulé");
  });

  it("les signatures révoquées d'un même geste : une ligne, chacune vérifiable", () => {
    const r = h.filter((e) => e.cle.startsWith("revocation-signatures-"));
    expect(r).toHaveLength(1);
    expect(r[0].ligne).toBe("2 signatures révoquées : l'entreprise utilisatrice corrige le plan");
    expect(r[0].verifier?.map((v) => v.href)).toEqual(["/verifier/s1", "/verifier/s2"]);
  });
});
