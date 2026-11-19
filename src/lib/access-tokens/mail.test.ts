import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les deux courriels d'un accès externe, mis en page (2026-11-19) : le lien
 * (E1) sans code, le code (E2) sans lien ; HTML et texte, données échappées,
 * les deux lignes RGPD gardées.
 */

const { envoyes } = vi.hoisted(() => ({
  envoyes: [] as { to: string; subject: string; text: string; html?: string }[],
}));
vi.mock("@/lib/email", () => ({
  sendMail: vi.fn(async (m: { to: string; subject: string; text: string; html?: string }) => {
    envoyes.push(m);
  }),
  publicAppUrl: () => "http://localhost:3000",
}));

import { envoyerMailAcces, envoyerMailCode } from "./mail";

beforeEach(() => {
  envoyes.length = 0;
});

const ACCES = {
  to: "chef@exterieure.fr",
  nom: "Jean Dupond",
  sujet: "Plan de prévention à signer — PP-001 (Boulangerie Martin)",
  message: "Boulangerie Martin vous invite à signer le plan.\n\nRojer enregistrera votre signature.",
  urlAcces: "http://localhost:3000/acces/jeton-clair-assez-long-0123456789",
  codeALaDemande: true,
  // 26 novembre 2026, 14:30 à Paris.
  expireLe: new Date("2026-11-26T13:30:00Z"),
  titre: "Plan de prévention à signer",
  bouton: "Consulter et signer le plan",
  encadre: [
    { libelle: "Référence", valeur: "PP-001" },
    { libelle: "Entreprise extérieure", valeur: "Nettoyage <SARL>" },
  ],
};

describe("E1 — le lien de signature", () => {
  it("HTML et texte : bouton, encadré, échéance lue sur `expireLe`, lien de secours", async () => {
    await envoyerMailAcces(ACCES);
    const [m] = envoyes;
    expect(m.subject).toBe(ACCES.sujet);
    expect(m.text).toContain("Bonjour Jean Dupond,");
    expect(m.text).toContain("Référence : PP-001");
    expect(m.text).toContain(`Consulter et signer le plan : ${ACCES.urlAcces}`);
    expect(m.text).toContain("Le lien est valable jusqu'au jeudi 26 novembre 2026 à 14:30 (heure de Paris).");
    expect(m.html).toContain(">Consulter et signer le plan</a>");
    expect(m.html).toContain(`href="${ACCES.urlAcces}"`);
    expect(m.html).toContain("jeudi 26 novembre 2026 à 14:30");
    // Le texte saisi est échappé.
    expect(m.html).toContain("Nettoyage &lt;SARL&gt;");
    expect(m.html).not.toContain("<SARL>");
  });

  it("aucun code dans le message : il part à la demande, depuis la page", async () => {
    await envoyerMailAcces(ACCES);
    const [m] = envoyes;
    const sansLien = (s: string) => s.replaceAll(ACCES.urlAcces, "");
    expect(sansLien(m.text)).not.toMatch(/\b\d{6}\b/);
    expect(sansLien(m.html!)).not.toMatch(/>\s*\d{6}\s*</);
    expect(m.text).toContain("demandez votre code de confirmation");
  });

  it("garde les deux lignes RGPD, en texte comme en HTML", async () => {
    await envoyerMailAcces(ACCES);
    const [m] = envoyes;
    expect(m.text).toContain("Finalité : permettre une action ponctuelle demandée par votre interlocuteur.");
    expect(m.text).toContain("Droit d'accès / effacement : contactez l'émetteur du lien.");
    expect(m.html).toContain("Finalité");
    expect(m.html).toContain("contactez l&#39;émetteur du lien.");
  });

  it("refuse un sujet sur plusieurs lignes", async () => {
    await expect(envoyerMailAcces({ ...ACCES, sujet: "a\r\nBcc: x@y.fr" })).rejects.toThrow();
    expect(envoyes).toHaveLength(0);
  });
});

describe("E2 — le code", () => {
  const CODE = {
    to: "chef@exterieure.fr",
    nom: "Jean Dupond",
    otp: "482913",
    document: "Plan de prévention PP-001 — Nettoyage SARL",
    essaisRestants: 2,
  };

  it("le code en gros, sa durée, les essais restants, le document", async () => {
    await envoyerMailCode(CODE);
    const [m] = envoyes;
    expect(m.text).toContain("Votre code de confirmation : 482913");
    expect(m.text).toContain("Il sert à signer : « Plan de prévention PP-001 — Nettoyage SARL ».");
    expect(m.text).toContain("Ce code expire dans 10 minutes. Ne le partagez avec personne.");
    expect(m.text).toContain("Il vous reste 2 essais sur ce lien (sur 3, nouveaux codes compris).");
    expect(m.html).toMatch(/font-size:36px[^>]*>482913</);
    expect(m.text).toContain("Finalité :");
  });

  it("jamais le lien : ni adresse d'accès, ni bouton", async () => {
    await envoyerMailCode(CODE);
    const [m] = envoyes;
    for (const forme of [m.text, m.html!]) {
      expect(forme).not.toContain("/acces/");
      expect(forme).not.toMatch(/https?:\/\//);
    }
    expect(m.html).not.toContain("href=");
  });
});
