// La marque d'une session en lecture seule (ADR-054 § 4) : un repère caché,
// rendu côté serveur, que la feuille de style lit pour masquer ce qui mène à
// une écriture — tout élément marqué `data-ecriture`, panneaux en portail
// compris — et rendre inerte ce qui montre une réponse enregistrée
// (`data-ecriture-inerte`, `globals.css`). Rien ne clignote : la marque
// arrive avec la page. `InerteAuClavier` ferme aussi l'inerte au clavier.
//
// Le masquage n'est qu'un confort de lecture. Le refus reste au serveur
// (`verifierSaisie`, client borné), et les boutons d'envoi encore visibles
// sont grisés par `SaisieDuSite`.

import { getOptionalCompte } from "@/lib/auth/compte";
import { InerteAuClavier } from "./InerteAuClavier";

export async function MarqueLectureSeule() {
  const c = await getOptionalCompte();
  if (c?.compte.role !== "lecture") return null;
  return (
    <>
      <span data-lecture-seule hidden />
      <InerteAuClavier />
    </>
  );
}
