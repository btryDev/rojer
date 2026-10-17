// Le corps d'une fiche du registre, quelle que soit sa forme.
//
// Le catalogue en connaît trois — `etablissement`, `formulaire`, `journal` —
// et deux situations de plus : la fiche tenue sur un autre écran, et celle
// qu'aucun moyen ne couvre encore. Les cinq passent par ici, et le `switch`
// est exhaustif (cf. le garde `never`) : une forme ajoutée au catalogue et
// oubliée ici ne compile pas.
//
// C'est la garantie qui compte : **aucune fiche due ne peut être rendue
// muette**. Une fiche qu'on ne saurait pas afficher disparaîtrait du
// registre, et le dirigeant croirait son document complet alors qu'il lui
// manque une pièce.

import { CarteFiche } from "@/components/ui-kit/fiche";
import type { FormeSaisie } from "@/lib/registre/champs";
import type { Completude, ContenuLu } from "@/lib/registre/completude";
import type { ActionFiche } from "./types";
import { FicheFormulaire } from "./FicheFormulaire";
import { FicheJournal } from "./FicheJournal";
import { FicheLecture } from "./FicheLecture";

/** Le sur-titre de la carte : ce qu'on s'apprête à lire ou à remplir. */
function titreDuCorps(
  saisie: FormeSaisie | undefined,
  tenueAilleurs: boolean,
): string {
  if (!saisie) return tenueAilleurs ? "Ce que porte cette fiche" : "Cette fiche";
  switch (saisie.forme) {
    case "etablissement":
      return "Renseignements";
    case "formulaire":
      return "Réponses";
    case "journal":
      return "Lignes consignées";
  }
}

export function CorpsFicheRegistre({
  saisie,
  contenu,
  completude,
  action,
  hrefEdition,
  ailleurs,
}: {
  /** La forme de saisie, ou `undefined` si rien ne se saisit ici. */
  saisie: FormeSaisie | undefined;
  contenu?: ContenuLu | null;
  completude: Completude;
  /** L'action déjà liée à l'établissement et à cette fiche. */
  action?: ActionFiche;
  /** Où se modifient les réponses portées par l'établissement. */
  hrefEdition?: string;
  /**
   * Ce que porte la fiche quand un autre écran la tient — les équipements
   * inventoriés, les vérifications faites. Rendu en lecture par l'appelant,
   * qui seul sait où lire ces lignes.
   */
  ailleurs?: React.ReactNode;
}) {
  const tenueAilleurs = Boolean(completude.alimentee);

  return (
    <CarteFiche titre={titreDuCorps(saisie, tenueAilleurs)}>
      {corps()}
    </CarteFiche>
  );

  function corps() {
    if (!saisie) {
      // Deux absences très différentes, qu'on aurait tort de rendre pareil.
      if (ailleurs) return ailleurs;
      if (tenueAilleurs) {
        // Le contenu existe mais l'appelant ne l'a pas passé : on le dit
        // plutôt que de rendre une carte vide qui passerait pour une fiche
        // sans contenu.
        return (
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Cette fiche se tient depuis {completude.alimentee?.libelle}.
          </p>
        );
      }
      // Là, le trou est celui de l'application, pas celui du dirigeant. Le
      // taire ferait croire le registre complet.
      return (
        <div className="rounded-[20px] border border-dashed border-[color:var(--board-slate-line)] px-5 py-4">
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
            <strong className="font-semibold text-[color:var(--board-ink)]">
              Cette fiche est à tenir de votre côté.
            </strong>{" "}
            Elle vous est due, mais l&apos;application ne sait pas encore la
            recueillir : conservez-la sur le support que vous voulez — un
            classeur, un fichier — et présentez-la avec le reste du registre.
          </p>
          <p className="m-0 mt-2.5 max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Elle figure ici, et non pas nulle part, pour que vous sachiez ce
            qui manquerait lors d&apos;une visite.
          </p>
        </div>
      );
    }

    switch (saisie.forme) {
      case "etablissement":
        return (
          <FicheLecture
            champs={saisie.champs}
            valeurs={contenu?.champs}
            nombres={contenu?.nombres}
            hrefEdition={hrefEdition ?? "#"}
          />
        );

      case "formulaire":
        // Sans action, la fiche se lirait comme un formulaire mort : mieux
        // vaut ne rien proposer que proposer un bouton qui n'écrit rien.
        if (!action) return indisponible();
        return (
          <FicheFormulaire
            champs={saisie.champs}
            valeurs={contenu?.champs}
            action={action}
          />
        );

      case "journal":
        if (!action) return indisponible();
        return (
          <FicheJournal
            colonnes={saisie.colonnes}
            lignes={contenu?.lignes ?? []}
            action={action}
          />
        );

      default: {
        // Une forme ajoutée au catalogue sans passage ici casse la
        // compilation, plutôt que de disparaître silencieusement de l'écran.
        const jamais: never = saisie;
        return jamais;
      }
    }
  }

  function indisponible() {
    return (
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        La saisie de cette fiche n&apos;est pas disponible ici.
      </p>
    );
  }
}
