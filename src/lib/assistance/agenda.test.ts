import { describe, expect, it } from "vitest";
import { calendrierDuRendezVous } from "./agenda";

// Le fichier d'agenda du rendez-vous annuel (ADR-063 § 6).

const d = (iso: string) => new Date(iso);

describe("calendrierDuRendezVous", () => {
  const ics = calendrierDuRendezVous(
    { id: "r1", debut: d("2026-12-02T08:00:00Z"), fin: d("2026-12-02T09:00:00Z"), mode: "telephone", telephone: "06 12, 34; 56" },
    d("2026-11-24T16:05:09.123Z"),
  );

  it("un événement en UTC, des fins de ligne CRLF", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("\r\nDTSTART:20261202T080000Z\r\n");
    expect(ics).toContain("\r\nDTEND:20261202T090000Z\r\n");
    expect(ics).toContain("\r\nDTSTAMP:20261124T160509Z\r\n");
    expect(ics).toContain("\r\nUID:r1@rojer.fr\r\n");
    // L'organisateur, exigé par la RFC 5546 pour PUBLISH et CANCEL.
    expect(ics).toMatch(/\r\nORGANIZER;CN=Rojer:mailto:[^\r]+@[^\r]+\r\n/);
    expect(ics.split("\r\n").every((l) => !l.includes("\n"))).toBe(true);
  });

  it("échappe le texte saisi (virgule, point-virgule)", () => {
    // Dépliée (RFC 5545 : CRLF suivi d'une espace) avant d'être comparée.
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:Par téléphone : nous vous appelons au 06 12\\, 34\\; 56.");
  });

  it("une révision qui croît, et chaque ligne pliée à 75 octets", () => {
    expect(ics).toContain("\r\nSEQUENCE:1795536309\r\n");
    expect(ics).toContain("\r\nMETHOD:PUBLISH\r\n");
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    const visio = calendrierDuRendezVous(
      { id: "r1", debut: d("2026-12-02T08:00:00Z"), fin: d("2026-12-02T09:00:00Z"), mode: "visio", telephone: "06 12 34 56 78" },
      d("2026-11-24T16:05:09Z"),
    );
    expect(visio.split("\r\n").some((l) => l.startsWith(" "))).toBe(true);
  });

  it("une annulation retire l'événement", () => {
    const annule = calendrierDuRendezVous(
      { id: "r1", debut: d("2026-12-02T08:00:00Z"), fin: d("2026-12-02T09:00:00Z"), mode: "visio", telephone: null },
      d("2026-11-24T16:05:09Z"),
      { annule: true },
    );
    expect(annule).toContain("\r\nMETHOD:CANCEL\r\n");
    expect(annule).toContain("\r\nSTATUS:CANCELLED\r\n");
  });
});
