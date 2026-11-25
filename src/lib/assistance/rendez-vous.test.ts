import { describe, expect, it, vi } from "vitest";

// L'année où compte un rendez-vous, et ce que l'onglet en montre (ADR-063).

const h = vi.hoisted(() => ({ libres: vi.fn() }));
vi.mock("./creneaux", () => ({ creneauxLibres: h.libres }));

const { anneeDuRendezVous, rendezVousDuCompte } = await import("./rendez-vous");

const d = (iso: string) => new Date(iso);

describe("anneeDuRendezVous", () => {
  it("d'un anniversaire du premier paiement au suivant", () => {
    const ancre = d("2025-03-15T10:00:00Z");
    expect(anneeDuRendezVous(ancre, d("2026-11-24T00:00:00Z"))).toEqual({
      debut: d("2026-03-15T10:00:00Z"),
      fin: d("2027-03-15T10:00:00Z"),
    });
    // Avant l'anniversaire de l'année : l'année d'abonnement a commencé l'an dernier.
    expect(anneeDuRendezVous(ancre, d("2026-02-01T00:00:00Z"))).toEqual({
      debut: d("2025-03-15T10:00:00Z"),
      fin: d("2026-03-15T10:00:00Z"),
    });
  });

  it("sans paiement (compte offert) : l'année civile", () => {
    expect(anneeDuRendezVous(null, d("2026-11-24T00:00:00Z"))).toEqual({
      debut: d("2026-01-01T00:00:00Z"),
      fin: d("2027-01-01T00:00:00Z"),
    });
  });
});

describe("rendezVousDuCompte", () => {
  const MAINTENANT = d("2026-11-24T16:00:00Z");
  const ancre = d("2026-03-01T00:00:00Z"); // année : 2026-03-01 → 2027-03-01
  const creneau = (id: string, iso: string) => ({ id, debut: d(iso), fin: new Date(d(iso).getTime() + 3_600_000) });
  const LIBRES = [creneau("a", "2026-12-02T08:00:00Z"), creneau("b", "2027-03-02T08:00:00Z")];
  const db = (rendezVous: unknown[]) =>
    ({ rendezVousAssistance: { findMany: vi.fn(async () => rendezVous) } }) as unknown as Parameters<typeof rendezVousDuCompte>[0];

  it("sans rendez-vous : tous les créneaux libres du mois qui vient", async () => {
    h.libres.mockResolvedValue(LIBRES);
    const base = db([]);
    const r = await rendezVousDuCompte(base, ancre, MAINTENANT);
    // Un rendez-vous annulé ne compte pas, ceux d'avant l'année non plus.
    expect(base.rendezVousAssistance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { annuleLe: null, debut: { gte: d("2026-03-01T00:00:00Z") } } }),
    );
    expect(r.prochain).toBeNull();
    expect(r.creneaux.map((c) => c.id)).toEqual(["a", "b"]);
    // Le mois qui vient, à plus de 24 h.
    expect(h.libres).toHaveBeenCalledWith(expect.anything(), {
      depuis: d("2026-11-25T16:00:00Z"),
      jusqua: d("2026-12-24T16:00:00Z"),
    });
  });

  it("le rendez-vous de l'année passé : seuls les créneaux de l'année suivante restent", async () => {
    h.libres.mockResolvedValue(LIBRES);
    const passe = { id: "r0", debut: d("2026-06-01T08:00:00Z"), fin: d("2026-06-01T09:00:00Z") };
    const r = await rendezVousDuCompte(db([passe]), ancre, MAINTENANT);
    expect(r.passe?.id).toBe("r0");
    expect(r.creneaux.map((c) => c.id)).toEqual(["b"]);
    expect(r.finDeLAnnee).toEqual(d("2027-03-01T00:00:00Z"));
  });

  it("un rendez-vous à venir : le déplacer peut viser son année", async () => {
    h.libres.mockResolvedValue(LIBRES);
    const prochain = { id: "r1", debut: d("2026-12-10T08:00:00Z"), fin: d("2026-12-10T09:00:00Z") };
    const r = await rendezVousDuCompte(db([prochain]), ancre, MAINTENANT);
    expect(r.prochain?.id).toBe("r1");
    expect(r.creneaux.map((c) => c.id)).toEqual(["a", "b"]);
  });
});
