"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { creerEquipementsDepuisPreRemplissage } from "@/lib/equipements/actions";
import { MarqueCategorie } from "@/components/equipements/MarqueCategorie";
import { QuestionTriEtat } from "@/components/equipements/EquipementForm";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import type { ChampTriEtat } from "@/lib/equipements/schema";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";
import { CASE_A_COCHER } from "@/components/ui-kit/case-a-cocher";

type Suggestion = {
  categorie: CategorieEquipement;
  libelle: string;
  raison: string;
  mention?: string;
  /** `false` : proposée sans être cochée (`Entree.cocheeParDefaut`). */
  cocheeParDefaut?: false;
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
    // 2026-10-17 : une suggestion marquée `cocheeParDefaut: false` part
    // décochée — l'eau chaude collective, qui dépend d'un fait que le
    // produit ne détient pas.
    () => new Set(suggestions.filter((s) => s.cocheeParDefaut !== false).map((s) => s.categorie)),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [avertissement, setAvertissement] = useState<string | null>(null);
  // Les catégories cochées dont la question est restée sans réponse au
  // dernier envoi : leur champ porte l'erreur (`aria-invalid`, message lié).
  const [sansReponse, setSansReponse] = useState<ReadonlySet<CategorieEquipement>>(
    () => new Set(),
  );
  const formRef = useRef<HTMLFormElement>(null);

  // 2026-10-14 (revue du lot, point 2) : quand la création épuise les
  // suggestions, `revalidatePath` re-rend la page avec une liste vide. Le
  // panneau ne disparaît plus : la page le rend toujours, au même endroit, si
  // bien que React garde son état à travers le rafraîchissement — et ce qu'il
  // reste à dire (le succès, et surtout l'avertissement d'un calendrier non
  // recalculé) se lit encore. Sans résultat à dire, rien n'est rendu, comme
  // avant. Un paramètre d'URL aurait survécu au rechargement et redit un
  // échec peut-être réparé depuis ; un état client meurt avec la page.
  if (suggestions.length === 0) {
    if (!message && !avertissement) return null;
    return (
      <section>
        {message && (
          <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
            {message}
          </p>
        )}
        {avertissement && (
          <p
            role="alert"
            className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
          >
            {avertissement}
          </p>
        )}
      </section>
    );
  }

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
    const manque: CategorieEquipement[] = [];
    const entrees = suggestions
      .filter((s) => selection.has(s.categorie))
      .map((s) => {
        const champs = questionsExigees[s.categorie] ?? [];
        const caracteristiques: Partial<Record<ChampTriEtat, boolean>> = {};
        for (const champ of champs) {
          const v = fd.get(nomQuestionPanneau(s.categorie, champ));
          if (v === "oui") caracteristiques[champ] = true;
          else if (v === "non") caracteristiques[champ] = false;
          else manque.push(s.categorie);
        }
        return {
          categorie: s.categorie,
          libelle: s.libelle,
          ...(champs.length > 0 ? { caracteristiques } : {}),
        };
      });

    setSansReponse(new Set(manque));
    if (entrees.length === 0) {
      setErreur(null);
      setMessage("Aucune catégorie sélectionnée.");
      return;
    }
    if (manque.length > 0) {
      setMessage(null);
      setErreur(
        `Répondez oui ou non à la question posée pour : ${[...new Set(manque)]
          .map((c) => LABEL_CATEGORIE_EQUIPEMENT[c])
          .join(", ")}.`,
      );
      return;
    }

    setErreur(null);
    setAvertissement(null);
    startTransition(async () => {
      try {
        const res = await creerEquipementsDepuisPreRemplissage(
          etablissementId,
          entrees,
        );
        // Un refus du serveur se RETOURNE (revue du 2026-10-13) : son message
        // arrive tel quel, là où une exception aurait été masquée par Next en
        // production.
        if (res.status === "error") {
          setMessage(null);
          setErreur(res.message);
          return;
        }
        setMessage(
          res.created > 0
            ? `${res.created} équipement${res.created > 1 ? "s" : ""} ajouté${
                res.created > 1 ? "s" : ""
              }. Pensez à les affiner si besoin.`
            : "Aucun équipement ajouté.",
        );
        // 2026-10-14 : les fiches sont créées, mais le calendrier n'a pas
        // suivi — le dire, comme la fiche entreprise
        // (`success_avec_avertissement`) et `FaitActiviteRow`. Ignoré
        // jusqu'ici, l'échec de régénération passait inaperçu
        // (`docs/chantiers-ouverts.md`, § 0, défaut n° 6).
        setAvertissement(res.avertissement ?? null);
      } catch {
        setMessage(null);
        // ~~`e.message`~~ (rayé le 2026-10-13) : en production, Next remplace
        // le message d'une exception d'action serveur ; les refus attendus
        // arrivent désormais par le retour, ci-dessus. Reste l'imprévu.
        setErreur("La création a échoué. Rien n'a été créé ; réessayez.");
      }
    });
  };

  return (
    <section>
      <header className="border-b border-[color:var(--board-slate-line)] pb-5">
        {/* 2026-10-27 : le panneau vit dans une fenêtre (`SuggestionsEnFenetre`),
            qui porte le surtitre et le titre ; il n'est plus une carte. */}
        <p className="m-0 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
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
        {/* L'astérisque se lit (revue du 2026-10-13) : la légende n'est
            posée que si une question l'est. */}
        {suggestions.some((s) => (questionsExigees[s.categorie] ?? []).length > 0) && (
          <p className="m-0 text-[12px] text-[color:var(--board-slate-mid)]">
            * réponse requise pour créer la fiche cochée
          </p>
        )}
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
                    className={CASE_A_COCHER}
                  />
                  <MarqueCategorie categorie={s.categorie} taille={36} />
                  <label
                    htmlFor={`pre-${s.categorie}`}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <p
                      id={`pre-${s.categorie}-titre`}
                      className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]"
                    >
                      {LABEL_CATEGORIE_EQUIPEMENT[s.categorie]}
                    </p>
                    <p className="m-0 mt-1 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      {s.libelle} — {s.raison}
                      {s.mention ? ` ${s.mention}` : null}
                    </p>
                  </label>
                </div>
                {/* La question exigée, au format du formulaire : oui ou non,
                    sans présélection. Requise seulement si la case est
                    cochée — une catégorie décochée n'est pas envoyée.
                    Groupe nommé par la catégorie (revue du 2026-10-13) : la
                    question seule ne dit pas de quel appareil elle parle. */}
                {questions.length > 0 && (
                  <div
                    role="group"
                    aria-labelledby={`pre-${s.categorie}-titre`}
                    className="ml-7 flex flex-col gap-3"
                  >
                    {questions.map((champ) => (
                      <QuestionTriEtat
                        key={champ}
                        champ={champ}
                        nom={nomQuestionPanneau(s.categorie, champ)}
                        defaut=""
                        exigee={coche}
                        erreur={
                          coche && sansReponse.has(s.categorie)
                            ? "Répondez oui ou non."
                            : undefined
                        }
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
        {/* Les fiches existent (le vert au-dessus est vrai) ; le calendrier,
            lui, n'a pas été recalculé : encre du signal, comme la fiche
            entreprise. */}
        {!pending && avertissement && (
          <p
            role="alert"
            className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]"
          >
            {avertissement}
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
