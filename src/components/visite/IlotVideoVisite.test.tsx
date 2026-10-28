// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IlotVideoVisite } from "./IlotVideoVisite";
import { cookieVisiteMasquee } from "@/lib/visite/visites";

const COOKIE = cookieVisiteMasquee("equipements");
afterEach(cleanup);
beforeEach(() => {
  document.cookie = `${COOKIE}=; Path=/; Max-Age=0`;
  // jsdom ne joue pas de média : la lecture est simulée.
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());
const memorise = () => document.cookie.includes(`${COOKIE}=1`);

describe("IlotVideoVisite", () => {
  it("ne charge la vidéo qu'à l'ouverture du panneau, qui dit ses étapes aux lecteurs d'écran", () => {
    render(<IlotVideoVisite cle="equipements" />);
    expect(document.querySelector("video")).toBeNull();
    fireEvent.click(screen.getByText("Regarder la vidéo"));
    const dialogue = screen.getByRole("dialog");
    expect(dialogue.querySelector("video")?.getAttribute("src")).toBe("/videos/visite-equipements.mp4");
    expect(dialogue.querySelector("ol")?.textContent).toContain("Déposer le rapport du dernier contrôle");
  });

  it("lance la vidéo avec le son, et la relance en sourdine si le navigateur refuse", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new DOMException("son refusé", "NotAllowedError"))
      .mockResolvedValue(undefined);
    render(<IlotVideoVisite cle="equipements" />);
    fireEvent.click(screen.getByText("Regarder la vidéo"));
    const video = screen.getByRole("dialog").querySelector("video")!;
    await Promise.resolve();
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(2);
    expect(video.muted).toBe(true);
  });

  it("la croix retire l'îlot sans rien mémoriser", () => {
    render(<IlotVideoVisite cle="equipements" />);
    fireEvent.click(screen.getByLabelText("Masquer pour cette fois"));
    expect(screen.queryByText("Comment ça marche ?")).toBeNull();
    expect(memorise()).toBe(false);
  });

  it("« Ne plus afficher » sur l'îlot le retire et le mémorise", () => {
    render(<IlotVideoVisite cle="equipements" />);
    fireEvent.click(screen.getByText("Ne plus afficher"));
    expect(screen.queryByText("Comment ça marche ?")).toBeNull();
    expect(memorise()).toBe(true);
  });

  it("dans le panneau : cocher mémorise, décocher défait, et l'îlot part à la fermeture si coché", () => {
    render(<IlotVideoVisite cle="equipements" />);
    fireEvent.click(screen.getByText("Regarder la vidéo"));
    const caseACocher = screen.getByRole("dialog").querySelector('input[type="checkbox"]')!;
    fireEvent.click(caseACocher);
    expect(memorise()).toBe(true);
    fireEvent.click(caseACocher);
    expect(memorise()).toBe(false);
    fireEvent.click(caseACocher);
    fireEvent.click(screen.getByText("Fermer"));
    expect(screen.queryByText("Comment ça marche ?")).toBeNull();
  });
});
