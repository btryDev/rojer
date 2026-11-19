import { beforeEach, describe, expect, it, vi } from "vitest";

// L'action du formulaire de contact, sans réseau ni base : l'envoi, la limite
// de débit et les en-têtes sont simulés.

const sendMail = vi.fn<(p: unknown) => Promise<void>>();
const envoiEnService = vi.fn(() => true);
const consommer = vi.fn<(d: unknown) => Promise<{ ok: true } | { ok: false; reessayerDansSecondes: number }>>();

vi.mock("server-only", () => ({}));
let entetes = new Headers();
vi.mock("next/headers", () => ({ headers: async () => entetes }));
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
  entetes = new Headers({ "x-forwarded-for": "203.0.113.7" });
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
    ["un nom vide", { nom: "   " }, "Indiquez votre nom."],
    ["une adresse invalide", { email: "pas-une-adresse" }, "Cette adresse e-mail n'est pas valide."],
    ["une liste d'adresses", { email: "a@exemple.fr, b@exemple.fr" }, "Cette adresse e-mail n'est pas valide."],
    ["un message vide", { message: "" }, "Écrivez votre message."],
    ["un sujet hors liste", { sujet: "Publicité" }, "Choisissez un sujet dans la liste."],
    ["un message trop long", { message: "x".repeat(3001) }, "Le message tient en 3000 caractères au plus."],
  ])("refuse %s, en français, sans rien envoyer ni compter", async (_, champs, message) => {
    expect(await envoyerMessageContact(SAISIE, formulaire(champs))).toEqual({ status: "erreur", message });
    expect(sendMail).not.toHaveBeenCalled();
    expect(consommer).not.toHaveBeenCalled();
  });

  it("un saut de ligne compte un caractère, comme dans le champ (CRLF à l'envoi)", async () => {
    // 3 300 caractères envoyés, 3 000 dans le champ (puis 2 999, le dernier saut retiré).
    const etat = await envoyerMessageContact(SAISIE, formulaire({ message: "abcdefghi\r\n".repeat(300) }));
    expect(etat.status).toBe("envoye");
  });

  it("le champ piège rempli : réponse « envoyé », rien ne part", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const etat = await envoyerMessageContact(SAISIE, formulaire({ rjx_tampon: "https://spam.example" }));
    expect(etat.status).toBe("envoye");
    expect(sendMail).not.toHaveBeenCalled();
  });

  const dimensions = () =>
    consommer.mock.calls.map((c) => (c[0] as { cle: string }[]).map((d) => d.cle.split(":")[1]).join(","));

  it("compte l'IP, puis le site", async () => {
    await envoyerMessageContact(SAISIE, formulaire());
    expect(dimensions()).toEqual(["ip", "tous"]);
  });

  it("une IP refusée n'use pas le quota du site", async () => {
    consommer.mockResolvedValueOnce({ ok: false, reessayerDansSecondes: 600 });
    const etat = await envoyerMessageContact(SAISIE, formulaire());
    expect(etat).toEqual({ status: "erreur", message: expect.stringContaining("10 minutes") });
    expect(dimensions()).toEqual(["ip"]);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sans IP lisible, un seau commun plutôt que pas de limite", async () => {
    entetes = new Headers();
    await envoyerMessageContact(SAISIE, formulaire());
    const [premier] = consommer.mock.calls[0][0] as { cle: string }[];
    const { cleLimite } = await import("@/lib/securite/limite-debit");
    expect(premier.cle).toBe(cleLimite("contact", "ip", "inconnue"));
  });

  it("le quota du site atteint : refus", async () => {
    consommer.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, reessayerDansSecondes: 3600 });
    expect((await envoyerMessageContact(SAISIE, formulaire())).status).toBe("erreur");
    expect(sendMail).not.toHaveBeenCalled();
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
