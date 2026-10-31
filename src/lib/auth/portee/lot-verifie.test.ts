// `creerEnLotVerifie` sans ligne (seconde lecture du 2026-10-31) : ni lecture,
// ni transaction — modifier un prestataire sans pièce remplacée restait sinon
// à cinq ou six allers-retours.

import { describe, expect, it, vi } from "vitest";

const { creerEnLotVerifie } = await vi.importActual<typeof import("./lot-verifie")>("./lot-verifie");

describe("creerEnLotVerifie", () => {
  it("une liste vide n'ouvre pas de transaction et ne lit rien", async () => {
    const $transaction = vi.fn();
    const findMany = vi.fn();
    const createMany = vi.fn();
    const client = { $transaction, prestataire: { findMany }, piecePrestataire: { createMany } };

    const r = await creerEnLotVerifie(client as never, "PiecePrestataire", []);

    expect(r).toEqual({ count: 0 });
    expect($transaction).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});
