import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.mock("./evenements", () => ({
  prendre: vi.fn(),
  marquerAiguille: vi.fn(),
  marquerEchec: vi.fn(),
  evenementsAAiguiller: vi.fn(),
  etatDesEvenements: vi.fn(),
  oublierLesAnciens: vi.fn(),
}));
vi.mock("./file", () => ({ clientsDus: vi.fn(), enEchecDurable: vi.fn() }));
vi.mock("./synchronisation", async (reel) => ({
  ...(await reel<typeof import("./synchronisation")>()),
  synchroniserSousBail: vi.fn(),
}));
vi.mock("./parcours", () => ({ rendrePlanningEchu: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/abonnements/souscription", () => ({ finaliserCarte: vi.fn().mockResolvedValue({ issue: "rien" }) }));
vi.mock("@/lib/alertes", () => ({ alerter: vi.fn().mockResolvedValue(undefined) }));

import * as evenements from "./evenements";
import * as file from "./file";
import { synchroniserSousBail } from "./synchronisation";
import { rendrePlanningEchu } from "./parcours";
import { finaliserCarte } from "@/lib/abonnements/souscription";
import { alerter } from "@/lib/alertes";
import { EVENEMENTS_ECOUTES } from "./webhook";
import { aiguillageDe, aiguiller, traiterLaFile, traiterLaFileIci } from "./traitement";

const api = {
  subscriptions: { retrieve: vi.fn() },
  checkout: { sessions: { retrieve: vi.fn() } },
  invoices: { retrieve: vi.fn() },
  disputes: { retrieve: vi.fn() },
  charges: { retrieve: vi.fn() },
};
const faux = api as unknown as Stripe;
const PRISE = new Date("2026-11-10T10:00:00Z");
const maintenant = () => PRISE;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", customer: "cus_1" });
  api.checkout.sessions.retrieve.mockResolvedValue({ mode: "subscription", customer: "cus_1" });
  api.invoices.retrieve.mockResolvedValue({ customer: "cus_1" });
  api.disputes.retrieve.mockResolvedValue({ id: "du_1", reason: "fraudulent", amount: 2900, currency: "eur", charge: { customer: "cus_1" } });
  api.charges.retrieve.mockResolvedValue({ id: "ch_1", customer: "cus_1", amount: 3480, amount_refunded: 3480, currency: "eur" });
  vi.mocked(evenements.prendre).mockResolvedValue(PRISE);
  vi.mocked(evenements.marquerAiguille).mockResolvedValue(true);
  vi.mocked(evenements.marquerEchec).mockResolvedValue(false);
});

describe("aiguillageDe : le client de l'objet relu, et les effets propres à l'objet", () => {
  it.each(EVENEMENTS_ECOUTES)("%s : chaque événement écouté désigne le client de son objet", async (type) => {
    expect(await aiguillageDe(faux, type, "obj_1")).toMatchObject({ clientStripe: "cus_1" });
  });

  it("abonnement : relu avec les options courtes du webhook ; son identifiant suit (client supprimé) ; un planning échu est rendu", async () => {
    api.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", customer: { id: "cus_1" }, schedule: "sub_sched_1" });
    expect(await aiguillageDe(faux, "v1.customer.subscription.updated", "sub_1")).toEqual({ clientStripe: "cus_1", abonnementId: "sub_1" });
    expect(api.subscriptions.retrieve).toHaveBeenCalledWith("sub_1", {}, expect.objectContaining({ maxNetworkRetries: 0 }));
    expect(rendrePlanningEchu).toHaveBeenCalledOnce();
  });

  it("session de carte : la formule s'applique, la relecture suit par la file", async () => {
    api.checkout.sessions.retrieve.mockResolvedValue({ mode: "setup", customer: "cus_1" });
    expect(await aiguillageDe(faux, "v1.checkout.session.completed", "cs_1")).toEqual({ clientStripe: "cus_1" });
    expect(finaliserCarte).toHaveBeenCalledWith(faux, expect.objectContaining({ mode: "setup" }), { synchroniser: false });
  });

  it("sans client à suivre (paiement ponctuel, type non suivi, objet absent) : un motif, rien d'autre", async () => {
    api.checkout.sessions.retrieve.mockResolvedValue({ mode: "payment", customer: "cus_1" });
    expect(await aiguillageDe(faux, "v1.checkout.session.completed", "cs_1")).toMatchObject({ clientStripe: null });
    expect(await aiguillageDe(faux, "v1.customer.subscription.past_due", "sub_1")).toMatchObject({ clientStripe: null });
    expect(await aiguillageDe(faux, "v1.invoice.paid", null)).toMatchObject({ clientStripe: null });
  });

  it("litige et remboursement : une alerte (identifiants et montants), et la relecture du client", async () => {
    await aiguillageDe(faux, "v1.charge.dispute.created", "du_1");
    expect(alerter).toHaveBeenLastCalledWith("litige sur un paiement", expect.arrayContaining([expect.stringContaining("29.00 EUR")]));
    await aiguillageDe(faux, "v1.charge.refunded", "ch_1");
    expect(alerter).toHaveBeenLastCalledWith("remboursement", expect.arrayContaining([expect.stringContaining("34.80 EUR")]));
  });
});

describe("aiguiller : prise, lecture, issue", () => {
  const evt = { id: "evt_1", type: "v1.invoice.paid", objetId: "in_1", tentatives: 0 };

  it("pris ailleurs : rien n'est lu", async () => {
    vi.mocked(evenements.prendre).mockResolvedValue(null);
    expect(await aiguiller(faux, evt, maintenant)).toBe("pris");
    expect(api.invoices.retrieve).not.toHaveBeenCalled();
  });

  it("prise reprise pendant la lecture : l'autre worker conclut", async () => {
    vi.mocked(evenements.marquerAiguille).mockResolvedValue(false);
    expect(await aiguiller(faux, evt, maintenant)).toBe("pris");
  });

  it("aiguillé sous sa prise : le client demandé et l'événement marqué, ensemble", async () => {
    expect(await aiguiller(faux, evt, maintenant)).toBe("aiguille");
    expect(evenements.marquerAiguille).toHaveBeenCalledWith("evt_1", PRISE, { clientStripe: "cus_1" }, expect.any(Number), PRISE);
  });

  it("en échec : rendu à un essai suivant avec un motif sans le message reçu ; échec durable : une alerte", async () => {
    api.invoices.retrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({ message: "client@exemple.fr", type: "invalid_request_error", statusCode: 404, code: "resource_missing" } as never),
    );
    expect(await aiguiller(faux, evt, maintenant)).toBe("echec");
    expect(evenements.marquerEchec).toHaveBeenCalledWith(evt, PRISE, "API Stripe : StripeInvalidRequestError 404 (resource_missing)", PRISE);
    expect(evenements.marquerAiguille).not.toHaveBeenCalled();
    expect(alerter).not.toHaveBeenCalled();
    vi.mocked(evenements.marquerEchec).mockResolvedValue(true);
    await aiguiller(faux, evt, maintenant);
    expect(alerter).toHaveBeenCalledWith("événement Stripe en échec durable", expect.any(Array));
  });
});

describe("traiterLaFile", () => {
  it("les événements d'abord, puis chaque client dû une fois ; s'arrête quand il n'y a plus rien", async () => {
    vi.mocked(evenements.evenementsAAiguiller)
      .mockResolvedValueOnce([
        { id: "evt_1", type: "v1.invoice.paid", objetId: "in_1", tentatives: 0 },
        { id: "evt_2", type: "v1.invoice.paid", objetId: "in_2", tentatives: 0 },
      ])
      .mockResolvedValue([]);
    vi.mocked(file.clientsDus).mockResolvedValueOnce(["cus_1"]).mockResolvedValue([]);
    vi.mocked(synchroniserSousBail).mockResolvedValue({ issue: "ecrit" });
    expect(await traiterLaFile(faux, { maintenant })).toEqual({ aiguilles: 2, echecs: 0, relus: 1, relecturesEnEchec: 0 });
    expect(synchroniserSousBail).toHaveBeenCalledExactlyOnceWith(faux, "cus_1", { maintenant, strict: true });
  });

  it("une relecture en échec ne bloque pas les suivantes", async () => {
    vi.mocked(evenements.evenementsAAiguiller).mockResolvedValue([]);
    vi.mocked(file.clientsDus).mockResolvedValueOnce(["cus_1", "cus_2"]).mockResolvedValue([]);
    vi.mocked(synchroniserSousBail).mockRejectedValueOnce(new Error("panne")).mockResolvedValue({ issue: "ecrit" });
    expect(await traiterLaFile(faux, { maintenant })).toMatchObject({ relus: 1, relecturesEnEchec: 1 });
  });

  it("traiterLaFileIci ne lève jamais, pas même pour un appel qui arrive pendant un traitement", async () => {
    let lacher!: (e: Error) => void;
    vi.mocked(evenements.evenementsAAiguiller).mockReturnValueOnce(new Promise((_, r) => (lacher = r)));
    const premier = traiterLaFileIci(faux);
    const second = traiterLaFileIci(faux);
    lacher(new Error("base injoignable"));
    vi.mocked(evenements.evenementsAAiguiller).mockRejectedValue(new Error("base injoignable"));
    expect(await premier).toBeNull();
    expect(await second).toBeNull();
  });

  it("rend la main au bout du budget", async () => {
    vi.mocked(evenements.evenementsAAiguiller).mockResolvedValue([{ id: "evt_1", type: "v1.invoice.paid", objetId: "in_1", tentatives: 0 }]);
    vi.mocked(file.clientsDus).mockResolvedValue([]);
    expect(await traiterLaFile(faux, { maintenant, budgetMs: -1 })).toEqual({ aiguilles: 0, echecs: 0, relus: 0, relecturesEnEchec: 0 });
  });
});
