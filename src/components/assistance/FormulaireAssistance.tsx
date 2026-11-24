"use client";

import { useActionState, useId, useState } from "react";
import { usePathname } from "next/navigation";
import type { CategorieAssistance } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { demanderAssistance, type DemandeAssistanceState } from "@/lib/assistance/actions";
import {
  LABEL_CATEGORIE_ASSISTANCE,
  MESSAGE_MAX,
  TOUT_LE_COMPTE,
  estUnSujetDeLApplication,
  groupesDeSujets,
  sujetInitial,
} from "@/lib/assistance/libelles";

type Props = {
  pro: boolean;
  /** Le sujet proposé par l'encart d'où part la demande. */
  categorie?: CategorieAssistance | null;
  /** Ce que l'écran regardait (« Vérification annuelle des BAES »). */
  contexte?: string;
  /** L'établissement de la page ; sur la page Assistance, le choix par défaut. */
  etablissementId?: string;
  /** Sur la page Assistance : les établissements du compte, au choix. */
  etablissements?: { id: string; raisonDisplay: string }[];
  /** L'adresse où part la réponse, si la page la connaît. */
  email?: string | null;
  /** La page d'où l'on vient, quand ce n'est pas celle où l'on est (la page Assistance). */
  page?: string;
  /** Son nom, pour le dire (« Équipements »). */
  libellePage?: string | null;
  /** Dans le panneau d'un encart : le refermer. */
  surFermer?: () => void;
};

/**
 * Le formulaire de l'assistance (ADR-050, amendée le 2026-11-24), le même
 * sur la page « Assistance » et dans le panneau des encarts. Les sujets
 * suivent la formule : la prévention en Pro, l'application pour tous. La
 * demande part par e-mail ; la réponse aussi.
 */
export function FormulaireAssistance(props: Props) {
  // Un nouveau tour remonte le formulaire : une autre question repart à neuf.
  const [tour, setTour] = useState(0);
  return <Formulaire key={tour} {...props} recommencer={() => setTour((t) => t + 1)} />;
}

function Formulaire({
  pro,
  categorie,
  contexte,
  etablissementId,
  etablissements,
  email,
  page,
  libellePage,
  surFermer,
  recommencer,
}: Props & { recommencer: () => void }) {
  const ici = usePathname();
  const ids = { sujet: useId(), message: useId(), erreurMessage: useId(), etablissement: useId() };
  const plusieurs = etablissements !== undefined && etablissements.length > 1;
  const [sujet, setSujet] = useState<CategorieAssistance>(() => sujetInitial(pro, categorie));
  // Champs tenus par l'état : React vide un formulaire non contrôlé à la fin
  // de son action, même en erreur — le message écrit serait perdu (revue du
  // 2026-11-24).
  const [message, setMessage] = useState("");
  const [etab, setEtab] = useState(etablissementId ?? TOUT_LE_COMPTE);
  const [state, action, pending] = useActionState<DemandeAssistanceState, FormData>(demanderAssistance, {
    status: "idle",
  });
  const err = (c: string) => (state.status === "error" ? state.fieldErrors?.[c]?.[0] : undefined);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-start gap-4">
        <MessageFormulaire ton="info">
          Votre message est parti. La réponse vous arrive par e-mail, à {state.email}.
        </MessageFormulaire>
        {surFermer ? (
          <Button type="button" variant="board" size="boardSm" onClick={surFermer}>
            Fermer
          </Button>
        ) : (
          <Button type="button" variant="boardClair" size="board" onClick={recommencer}>
            Poser une autre question
          </Button>
        )}
      </div>
    );
  }

  const technique = estUnSujetDeLApplication(sujet);
  return (
    // Le portail sort le formulaire du DOM d'un éventuel formulaire parent,
    // pas de son arbre React : l'envoi ne doit pas remonter jusqu'à lui.
    // Demander de l'aide reste ouvert quand la saisie est fermée (ADR-053 § 3, § 14).
    // Tous les champs sont tenus par l'état : la remise à zéro que React fait
    // à la fin de l'action ramènerait les menus déroulants à leur première
    // option, sans que l'écran le montre — et un nouvel essai partirait avec
    // un autre sujet ou un autre établissement (relecture du 2026-11-24).
    <form
      action={action}
      onSubmit={(e) => e.stopPropagation()}
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-6"
      data-saisie-ouverte
    >
      <input type="hidden" name="page" value={page ?? ici ?? ""} />
      {contexte && <input type="hidden" name="contexte" value={contexte} />}

      {/* Le sujet et l'établissement, côte à côte : un menu déroulant par
          choix, les sujets rangés par groupe (2026-11-24, décision de la
          propriétaire — les pastilles s'étalaient sur trois lignes). */}
      <div className={`grid gap-x-5 gap-y-5 ${plusieurs ? "md:grid-cols-2" : surFermer ? "" : "md:max-w-[420px]"}`}>
        <div className="min-w-0">
          <label className="label-board" htmlFor={ids.sujet}>
            Le sujet
          </label>
          <select
            id={ids.sujet}
            name="categorie"
            value={sujet}
            onChange={(e) => setSujet(e.target.value as CategorieAssistance)}
            className="champ-board"
          >
            {groupesDeSujets(pro, categorie).map((g) => {
              const options = g.sujets.map((c) => (
                <option key={c} value={c}>
                  {LABEL_CATEGORIE_ASSISTANCE[c]}
                </option>
              ));
              return g.titre ? (
                <optgroup key={g.titre} label={g.titre}>
                  {options}
                </optgroup>
              ) : (
                options
              );
            })}
          </select>
        </div>

        {plusieurs ? (
          <div className="min-w-0">
            <label className="label-board" htmlFor={ids.etablissement}>
              L&apos;établissement concerné
            </label>
            <select
              id={ids.etablissement}
              name="etablissementId"
              value={etab}
              onChange={(e) => setEtab(e.target.value)}
              className="champ-board"
            >
              {etablissements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.raisonDisplay}
                </option>
              ))}
              <option value={TOUT_LE_COMPTE}>Tout le compte</option>
            </select>
          </div>
        ) : null}
      </div>
      {!plusieurs && etablissementId ? <input type="hidden" name="etablissementId" value={etablissementId} /> : null}

      <div>
        <label className="label-board" htmlFor={ids.message}>
          {technique ? "Ce qui se passe" : "Votre question"}
        </label>
        <textarea
          id={ids.message}
          aria-invalid={err("message") ? true : undefined}
          aria-describedby={err("message") ? ids.erreurMessage : undefined}
          name="message"
          rows={surFermer ? 5 : 7}
          required
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="champ-board"
          placeholder={
            contexte
              ? `À propos de « ${contexte} » : …`
              : technique
                ? "Ce que vous faisiez, ce que vous attendiez, ce qui s'est passé."
                : "Ce que vous avez sous les yeux, ce que vous voulez savoir."
          }
        />
        {err("message") && (
          <p id={ids.erreurMessage} className="m-0 mt-1 text-[12px] text-[color:var(--board-signal-ink)]">
            {err("message")}
          </p>
        )}
        {technique && (
          <p className="m-0 mt-2 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Avec votre message partent {libellePage ? `la page « ${libellePage} »` : "la page où vous étiez"} et le nom
            de votre navigateur, pour reproduire le problème.
          </p>
        )}
      </div>

      {/* Une erreur sur un autre champ que le message n'a pas de place à
          l'écran : le message général la dit, annoncé aux lecteurs d'écran. */}
      <MessageFormulaire ton="alerte">
        {state.status === "error" && (!state.fieldErrors || !state.fieldErrors.message) ? state.message : null}
      </MessageFormulaire>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[color:var(--board-slate-line)] pt-5">
        <div className="flex gap-3">
          <Button type="submit" variant="board" size={surFermer ? "boardSm" : "board"} enCours={pending}>
            {pending ? "Envoi…" : technique ? "Envoyer le message" : "Envoyer la question"}
          </Button>
          {surFermer && (
            <Button type="button" variant="boardClair" size="boardSm" onClick={surFermer}>
              Annuler
            </Button>
          )}
        </div>
        <p className="m-0 min-w-[240px] flex-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          La réponse vous arrive par e-mail, {email ? `à ${email}` : "à l'adresse de votre compte"}.
        </p>
      </div>
    </form>
  );
}
