import { beforeEach, describe, expect, it, vi } from "vitest";

// L'action du formulaire de contact, sans réseau ni base : l'envoi, la limite
// de débit et les en-têtes sont simulés.

const sendMail = vi.fn<(p: unknown) => Promise<void>>();
const envoiEnService = vi.fn(() => true);
const consommer = vi.fn<(d: unknown) => Promise<{ ok: true } | { ok: false; reessayerDansSecondes: number }>>();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("@/lib/email", () => ({
  sendMail: (p: unknown) => sendMail(p),
  envoiEnService: () => envoiEnService(),
  motifErreur: (e: unknown) => (e instanceof Error ? e.message : "erreur inconnue"),
}));
vi.mock("@/lib/securite/limite-debit", async (original) => ({
  ...(await original<typeof import("@/lib/securite/limite-debit")>()),
  consommer: (d: unknown) => consommer(d),
}));

const { envoyerMessageContact } = await import("./actions");
const { CONTACT } = await import("@/components/landing/contact");

function formulaire(champs: Record<string, string> = {}): FormData {
  const f = new FormData();
  const valeurs = {
    sujet: "Rojer sur mesure",
    nom: "  Camille Martin ",
    email: "camille@exemple-externe.fr",
    structure: "Boulangerie du Port",
    message: "Bonjour,\nnous avons trois boutiques.",
    ...champs,
  };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

const SAISIE = { status: "saisie" } as const;

beforeEach(() => {
  sendMail.mockReset().mockResolvedValue(undefined);
  envoiEnService.mockReset().mockReturnValue(true);
  consommer.mockReset().mockResolvedValue({ ok: true });
});

describe("envoyerMessageContact", () => {
  it("envoie à la boîte de Rojer, la réponse allant au visiteur", async () => {
    const etat = await envoyerMessageContact(SAISIE, formulaire());
    expect(etat).toEqual({ status: "envoye", email: "camille@exemple-externe.fr" });
    expect(sendMail).toHaveBeenCalledOnce();
    const envoi = sendMail.mock.calls[0][0] as { to: string; replyTo: string; subject: string; text: string };
    expect(envoi.to).toBe(CONTACT);
    expect(envoi.replyTo).toBe("camille@exemple-externe.fr");
    expect(envoi.subject).toBe("[Contact Rojer] Rojer sur mesure — Camille Martin (Boulangerie du Port)");
    expect(envoi.text).toContain("nous avons trois boutiques.");
  });

  it("un sujet sur une ligne, même si le nom porte des sauts de ligne", async () => {
    await envoyerMessageContact(SAISIE, formulaire({ nom: "Camille\r\nBcc: x@y.fr", structure: "" }));
    const envoi = sendMail.mock.calls[0][0] as { subject: string };
    expect(envoi.subject).toBe("[Contact Rojer] Rojer sur mesure — Camille Bcc: x@y.fr");
  });

  it.each([
    ["un nom vide", { nom: "   " }],
    ["une adresse invalide", { email: "pas-une-adresse" }],
    ["une liste d'adresses", { email: "a@exemple.fr, b@exemple.fr" }],
    ["un message vide", { message: "" }],
    ["un sujet hors liste", { sujet: "Publicité" }],
    ["un message trop long", { message: "x".repeat(3001) }],
  ])("refuse %s sans rien envoyer ni compter", async (_, champs) => {
    const etat = await envoyerMessageContact(SAISIE, formulaire(champs));
    expect(etat.status).toBe("erreur");
    expect(sendMail).not.toHaveBeenCalled();
    expect(consommer).not.toHaveBeenCalled();
  });

  it("le champ piège rempli : réponse « envoyé », rien ne part", async () => {
    const etat = await envoyerMessageContact(SAISIE, formulaire({ site_web: "https://spam.example" }));
    expect(etat.status).toBe("envoye");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("compte par IP et pour tout le site, et refuse au-delà", async () => {
    consommer.mockResolvedValue({ ok: false, reessayerDansSecondes: 600 });
    const etat = await envoyerMessageContact(SAISIE, formulaire());
    expect(etat).toEqual({ status: "erreur", message: expect.stringContaining("10 minutes") });
    expect(sendMail).not.toHaveBeenCalled();
    const cles = (consommer.mock.calls[0][0] as { cle: string }[]).map((d) => d.cle.split(":").slice(0, 2).join(":"));
    expect(cles).toEqual(["contact:ip", "contact:tous"]);
  });

  it("l'envoi hors service ou en échec : une erreur, sans rien promettre", async () => {
    envoiEnService.mockReturnValue(false);
    expect((await envoyerMessageContact(SAISIE, formulaire())).status).toBe("erreur");
    expect(sendMail).not.toHaveBeenCalled();

    envoiEnService.mockReturnValue(true);
    sendMail.mockRejectedValue(new Error("Mailpace injoignable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await envoyerMessageContact(SAISIE, formulaire())).status).toBe("erreur");
  });
});
