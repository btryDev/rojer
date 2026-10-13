"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { creerEquipementsDepuisPreRemplissage } from "@/lib/equipements/actions";
import { MarqueCategorie } from "@/components/equipements/MarqueCategorie";
import { QuestionTriEtat } from "@/components/equipements/EquipementForm";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import type { ChampTriEtat } from "@/lib/equipements/schema";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

type Suggestion = {
  categorie: CategorieEquipement;
  libelle: string;
  raison: string;
  mention?: string;
};

type Props = {
  etablissementId: string;
  suggestions: Suggestion[];
  /**
   * Les questions exigées par catégorie, dans le régime de l'établissement
   * (`questionsExigeesParCategorie`, calculé au serveur — le panneau ne les
   * recopie pas). Décision de la propriétaire du 2026-10-13 (option 2) : le
   * panneau les pose à côté de la case, au format du formulaire ; la case
   * reste cochable, mais l'envoi exige la réponse. Aujourd'hui : le groupe
   * électrogène d'une installation électrique en ERP.
   */
  questionsExigees?: Partial<Record<CategorieEquipement, readonly ChampTriEtat[]>>;
};

/** Le `name` d'une question du panneau : une par catégorie et par champ. */
export const nomQuestionPanneau = (categorie: CategorieEquipement, champ: ChampTriEtat) =>
  `pre-${categorie}-${champ}`;

export function PreRemplissagePanel({
  etablissementId,
  suggestions,
  questionsExigees = {},
}: Props) {
  const [selection, setSelection] = useState<Set<string>>(
    () => new Set(suggestions.map((s) => s.categorie)),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (suggestions.length === 0) return null;

  const toggle = (cat: string) => {
    setSelection((old) => {
      const next = new Set(old);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const valider = () => {
    const fd = formRef.current ? new FormData(formRef.current) : new FormData();
    const manque: string[] = [];
    const entrees = suggestions
      .filter((s) => selection.has(s.categorie))
      .map((s) => {
        const champs = questionsExigees[s.categorie] ?? [];
        const caracteristiques: Partial<Record<ChampTriEtat, boolean>> = {};
        for (const champ of champs) {
          const v = fd.get(nomQuestionPanneau(s.categorie, champ));
          if (v === "oui") caracteristiques[champ] = true;
          else if (v === "non") caracteristiques[champ] = false;
          else manque.push(LABEL_CATEGORIE_EQUIPEMENT[s.categorie]);
        }
        return {
          categorie: s.categorie,
          libelle: s.libelle,
          ...(champs.length > 0 ? { caracteristiques } : {}),
        };
      });

    if (entrees.length === 0) {
      setErreur(null);
      setMessage("Aucune catégorie sélectionnée.");
      return;
    }
    if (manque.length > 0) {
      setMessage(null);
      setErreur(
        `Répondez oui ou non à la question posée pour : ${[...new Set(manque)].join(", ")}.`,
      );
      return;
    }

    setErreur(null);
    startTransition(async () => {
      try {
        const res = await creerEquipementsDepuisPreRemplissage(
          etablissementId,
          entrees,
        );
        setMessage(
          res.created > 0
            ? `${res.created} équipement${res.created > 1 ? "s" : ""} ajouté${
                res.created > 1 ? "s" : ""
              }. Pensez à les affiner si besoin.`
            : "Aucun équipement ajouté.",
        );
      } catch (e) {
        setMessage(null);
        setErreur(e instanceof Error ? e.message : "La création a échoué.");
      }
    });
  };

  return (
    <section className="carte-board px-7 py-6 sm:px-8">
      <header className="border-b border-[color:var(--board-slate-line)] pb-5">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Pré-remplissage suggéré
        </p>
        <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          D&apos;après le code NAF et les régimes de cet établissement, les
          catégories d&apos;équipement ci-dessous sont typiquement présentes.
          Décochez celles qui ne s&apos;appliquent pas, puis validez pour créer
          les fiches correspondantes.
        </p>
      </header>

      <form
        ref={formRef}
        className="flex flex-col gap-4 pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          valider();
        }}
      >
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {suggestions.map((s) => {
            const coche = selection.has(s.categorie);
            const questions = questionsExigees[s.categorie] ?? [];
            return (
              <li key={s.categorie} className="flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`pre-${s.categorie}`}
                    checked={coche}
                    onChange={() => toggle(s.categorie)}
                    className="mt-0.5 size-4 flex-none rounded border-[color:var(--board-slate)] accent-[color:var(--board-ink)]"
                  />
                  <MarqueCategorie categorie={s.categorie} taille={36} />
                  <label
                    htmlFor={`pre-${s.categorie}`}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                      {LABEL_CATEGORIE_EQUIPEMENT[s.categorie]}
                    </p>
                    <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      {s.libelle} — {s.raison}
                      {s.mention ? ` ${s.mention}` : null}
                    </p>
                  </label>
                </div>
                {/* La question exigée, au format du formulaire : oui ou non,
                    sans présélection. Requise seulement si la case est
                    cochée — une catégorie décochée n'est pas envoyée. */}
                {questions.length > 0 && (
                  <div className="ml-7 flex flex-col gap-3">
                    {questions.map((champ) => (
                      <QuestionTriEtat
                        key={champ}
                        champ={champ}
                        nom={nomQuestionPanneau(s.categorie, champ)}
                        defaut=""
                        exigee={coche}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Le vert du board dit « fait » : ici il l'est — les fiches
            existent. Et il ne le dit que si c'est vrai AU MOMENT où on le
            lit : `pending` passe devant. « 8 équipements ajoutés » s'affichait
            pendant que le bouton disait encore « Création… » — deux états
            contradictoires du même geste, dont l'un annonce fait ce qui est en
            train de se faire, ce que la charte interdit au vert. Le cas se
            reproduit d'un second clic : le message du premier survivait à
            l'ouverture du second. Une opération en cours n'a pas de résultat,
            donc pas de message. */}
        {!pending && message && (
          <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
            {message}
          </p>
        )}
        {!pending && erreur && (
          <p
            role="alert"
            className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]"
          >
            {erreur}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="board"
            size="board"
            disabled={pending}
          >
            {pending
              ? "Création…"
              : `Créer ${selection.size} fiche${selection.size > 1 ? "s" : ""}`}
          </Button>
        </div>
      </form>
    </section>
  );
}
