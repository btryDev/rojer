import { describe, expect, it } from "vitest";
import { deduireActif } from "@/components/layout/sidebar-nav";
import { appareilDeLAction, avecParametres, cheminAction, cheminControle } from "./chemins";

// Le rail se déduit du chemin : un contrôle d'appareil et ses points doivent
// allumer « Équipements », pas le calendrier ni le plan d'actions (ADR-048).
describe("chemins des fiches — où vit un contrôle, où vit un point", () => {
  it("le contrôle d'un appareil vit sous sa fiche, et le rail allume Équipements", () => {
    const c = cheminControle("e1", { id: "v1", equipementId: "eq1" });
    expect(c).toBe("/etablissements/e1/equipements/eq1/controles/v1");
    expect(deduireActif(c, "e1")).toBe("equipements");
  });

  it("un contrôle d'ensemble reste au calendrier", () => {
    const c = cheminControle("e1", { id: "v1", equipementId: null });
    expect(deduireActif(c, "e1")).toBe("calendrier");
  });

  it("un point vit sous l'appareil de son contrôle, ou de celui qu'un contrôle d'ensemble désigne", () => {
    expect(appareilDeLAction({ verificationId: "v1", equipementId: null, verification: { equipementId: "eq1" } })).toBe("eq1");
    expect(appareilDeLAction({ verificationId: "v1", equipementId: "eq2", verification: { equipementId: null } })).toBe("eq2");
    const c = cheminAction("e1", { id: "a1", appareilId: "eq1" });
    expect(deduireActif(c, "e1")).toBe("equipements");
  });

  it("une mesure du DUERP reste au plan d'actions, même si une colonne d'appareil traînait", () => {
    const appareil = appareilDeLAction({ verificationId: null, equipementId: "eq1" });
    expect(appareil).toBeNull();
    expect(deduireActif(cheminAction("e1", { id: "a1", appareilId: appareil }), "e1")).toBe("actions");
  });

  it("une redirection garde les paramètres reçus, et ceux-là seulement", () => {
    expect(avecParametres("/x", { de: "/etablissements/e1/calendrier", apres: undefined })).toBe(
      "/x?de=%2Fetablissements%2Fe1%2Fcalendrier",
    );
    expect(avecParametres("/x", {})).toBe("/x");
  });
});
