"use client";

import { useActionState, useCallback, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import type { CategorieAssistance } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { demanderAssistance, type DemandeAssistanceState } from "@/lib/assistance/actions";
import {
  CATEGORIES_ASSISTANCE,
  LABEL_CATEGORIE_ASSISTANCE,
  LIBELLE_BESOIN_AIDE,
  LIEN_BTRY,
  MESSAGE_MAX,
  QUI_REPOND,
  TELEPHONE_MAX,
} from "@/lib/assistance/libelles";
import { MessageFait } from "@/components/ui-kit/MessageFait";
import { CLASSES_ITEM, TON_ITEM_REPOS } from "@/components/layout/entrees-navigation";

/**
 * « Besoin d'aide ? » (décision de la propriétaire du 2026-10-24) : un texte
 * adapté à l'endroit, qui ouvre le formulaire de demande. Le bouton ne nomme
 * personne ; le formulaire dit qui répond.
 *
 *   - `encart` : une accroche et un bouton, là où le doute est fort ;
 *   - `lien`   : une ligne discrète, au fil d'un parcours ;
 *   - `rail`   : l'entrée permanente de la barre latérale ;
 *   - `feuille`: la même entrée au pied des feuilles de la navigation du
 *     téléphone (`NavigationMobile`), sur l'encre comme le rail.
 */
export function DemandeAide({
  variante,
  libelle = LIBELLE_BESOIN_AIDE,
  accroche,
  categorie = "autre",
  contexte,
  etablissementId,
}: {
  variante: "encart" | "lien" | "rail" | "feuille";
  /** Le texte du bouton ou du lien, adapté à l'endroit. */
  libelle?: string;
  /** Pour l'encart : la phrase qui pose le doute. */
  accroche?: string;
  categorie?: CategorieAssistance;
  /** Ce que l'écran regardait (« Vérification annuelle des BAES »). */
  contexte?: string;
  etablissementId?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const ouvrir = () => setOuvert(true);

  const declencheur =
    variante === "rail" ? (
      // Le rail (88 px, fond encre) : une tuile comme ses voisines, le mot
      // court visible et le nom accessible qui le contient (WCAG 2.5.3).
      <button
        type="button"
        onClick={ouvrir}
        aria-haspopup="dialog"
        title={LIBELLE_BESOIN_AIDE}
        className="group flex w-full flex-col items-center gap-1.5 rounded-xl py-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-white/[0.06]">
          <LifeBuoy aria-hidden className="size-[18px]" />
        </span>
        <span className="text-[10.5px] font-semibold leading-none">{libelle}</span>
      </button>
    ) : variante === "feuille" ? (
      // Une ligne au gabarit des entrées de la feuille.
      <button
        type="button"
        onClick={ouvrir}
        aria-haspopup="dialog"
        className={`${CLASSES_ITEM} ${TON_ITEM_REPOS} text-left`}
      >
        <LifeBuoy aria-hidden className="size-4 flex-none opacity-90" />
        <span className="min-w-0 flex-1 leading-[1.3]">{libelle}</span>
      </button>
    ) : variante === "lien" ? (
      <button
        type="button"
        onClick={ouvrir}
        aria-haspopup="dialog"
        className="inline p-0 text-left text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4 hover:text-[color:var(--board-ink)]"
      >
        {libelle}
      </button>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-4">
        {accroche && (
          <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">{accroche}</p>
        )}
        <Button type="button" variant="boardClair" size="boardSm" onClick={ouvrir} aria-haspopup="dialog">
          <LifeBuoy aria-hidden className="size-4" />
          {libelle}
        </Button>
      </div>
    );

  return (
    <>
      {declencheur}
      <PanneauModal ouvert={ouvert} surFermer={fermer} surtitre="Assistance" titre={LIBELLE_BESOIN_AIDE}>
        {/* Monté à l'ouverture : chaque ouverture repart d'un formulaire neuf. */}
        {ouvert && (
          <Formulaire
            // Le rail ne sait pas d'où on l'ouvre : la page le dira.
            categorie={variante === "rail" || variante === "feuille" ? null : categorie}
            contexte={contexte}
            etablissementId={etablissementId}
            surFermer={fermer}
          />
        )}
      </PanneauModal>
    </>
  );
}

function Formulaire({
  categorie,
  contexte,
  etablissementId,
  surFermer,
}: {
  /** `null` : la déduire de la page. */
  categorie: CategorieAssistance | null;
  contexte?: string;
  etablissementId?: string;
  surFermer: () => void;
}) {
  const page = usePathname();
  const categorieInitiale = categorie ?? categorieDeLaPage(page);
  // Des identifiants propres au panneau : il se pose au-dessus d'une page
  // qui peut avoir ses propres champs « categorie », « message »…
  const ids = { categorie: useId(), message: useId(), telephone: useId() };
  const [state, action, pending] = useActionState<DemandeAssistanceState, FormData>(demanderAssistance, {
    status: "idle",
  });
  const err = (c: string) => (state.status === "error" ? state.fieldErrors?.[c]?.[0] : undefined);

  if (state.status === "success") {
    return (
      <>
        <MessageFait>Votre demande est enregistrée.</MessageFait>
        <p className="m-0">Un expert l&apos;étudie et vous recontacte.</p>
        <div>
          <Button type="button" variant="board" size="boardSm" onClick={surFermer}>
            Fermer
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="m-0">
        {QUI_REPOND}{" "}
        <a
          href={LIEN_BTRY}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4"
        >
          Qui sommes-nous ?
        </a>
      </p>
    {/* Le portail sort le formulaire du DOM d'un éventuel formulaire parent,
        pas de son arbre React : l'envoi ne doit pas remonter jusqu'à lui. */}
    <form action={action} onSubmit={(e) => e.stopPropagation()} className="space-y-4">
      <input type="hidden" name="page" value={page} />
      {etablissementId && <input type="hidden" name="etablissementId" value={etablissementId} />}
      {contexte && <input type="hidden" name="contexte" value={contexte} />}
      <div>
        <label className="label-board" htmlFor={ids.categorie}>
          Votre besoin
        </label>
        <select id={ids.categorie} name="categorie" className="champ-board" defaultValue={categorieInitiale}>
          {CATEGORIES_ASSISTANCE.map((c) => (
            <option key={c} value={c}>
              {LABEL_CATEGORIE_ASSISTANCE[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-board" htmlFor={ids.message}>
          Votre question *
        </label>
        <textarea
          id={ids.message}
          name="message"
          rows={4}
          required
          maxLength={MESSAGE_MAX}
          className="champ-board"
          placeholder={contexte ? `À propos de « ${contexte} » : …` : "Décrivez votre situation en quelques mots."}
        />
        {err("message") && <p className="m-0 mt-1 text-[12px] text-[color:var(--board-signal-ink)]">{err("message")}</p>}
      </div>
      <div>
        <label className="label-board" htmlFor={ids.telephone}>
          Téléphone (facultatif)
        </label>
        <input id={ids.telephone} name="telephone" type="tel" maxLength={TELEPHONE_MAX} className="champ-board" />
        <p className="m-0 mt-1.5 text-[12px] text-[color:var(--board-slate-mid)]">
          Sinon, nous vous répondons à l&apos;adresse de votre compte.
        </p>
      </div>
      {/* Une erreur sur un autre champ que la question n'a pas de place à
          l'écran : le message général la dit. */}
      {state.status === "error" && (!state.fieldErrors || !state.fieldErrors.message) && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">{state.message}</p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="boardSm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer ma demande"}
        </Button>
        <Button type="button" variant="boardClair" size="boardSm" onClick={surFermer}>
          Annuler
        </Button>
      </div>
    </form>
    </>
  );
}

/** La catégorie probable d'une demande ouverte depuis le rail, selon la page. */
export function categorieDeLaPage(chemin: string | null): CategorieAssistance {
  if (!chemin) return "autre";
  if (/\/prestataires(\/|$)/.test(chemin)) return "prestataire";
  if (chemin.startsWith("/duerp") || /\/(duerp|equipe)(\/|$)/.test(chemin)) return "duerp";
  if (/\/perimetre(\/|$)/.test(chemin)) return "hors_couverture";
  if (/\/(verifications|controles|registre)(\/|$)/.test(chemin)) return "rapport";
  if (/\/controle(\/|$)/.test(chemin)) return "commission_securite";
  return "autre";
}
