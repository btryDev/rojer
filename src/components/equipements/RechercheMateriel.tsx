"use client";

// La recherche de matériel du formulaire d'équipement (décision de la
// propriétaire du 2026-10-14) : un champ de recherche qui remplace le
// `<select>` des catégories, filtre par libellé et par synonymes
// (`lib/equipements/recherche-materiel.ts`), et propose aussi les matériels
// que Rojer ne suit pas.
//
// ACCESSIBILITÉ — le patron « combobox avec liste » de l'ARIA Authoring
// Practices : `role="combobox"` sur le champ, `aria-expanded`,
// `aria-controls`, `aria-activedescendant` ; `role="listbox"` et
// `role="option"` pour la liste, deux groupes nommés. Flèches pour parcourir,
// Entrée pour choisir, Échap pour refermer sans rien changer. La sélection
// reste celle d'avant tant qu'aucune option n'est choisie : taper ne choisit
// rien.
//
// Charte board : `.champ-board` pour le champ, sous-bloc creux à rayon 22 sur
// `--board-slate-pale` pour la liste, `--board-blue-pale` pour l'option
// active — aucune couleur d'état (rien ici n'est en retard ni fait).

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { MarqueCategorie } from "@/components/equipements/MarqueCategorie";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import {
  materielNonCouvert,
  type CleMaterielNonCouvert,
} from "@/lib/equipements/materiels-non-couverts";
import { rechercherMateriel } from "@/lib/equipements/recherche-materiel";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

export type ChoixMateriel = {
  categorie: CategorieEquipement;
  /** Renseigné seulement pour un matériel non suivi (catégorie `AUTRE`). */
  materiel: CleMaterielNonCouvert | null;
};

type Option =
  | { type: "categorie"; categorie: CategorieEquipement }
  | { type: "materiel"; cle: CleMaterielNonCouvert; libelle: string };

export const MESSAGE_RIEN_NE_CORRESPOND =
  "Rien ne correspond. Vous pouvez choisir « Autre équipement » si l'appareil n'est dans aucune catégorie.";

/** Ce que le champ affiche quand on ne cherche pas : le choix en cours. */
export function libelleDuChoix(choix: ChoixMateriel): string {
  const m = materielNonCouvert(choix.materiel);
  return m ? m.libelle : LABEL_CATEGORIE_EQUIPEMENT[choix.categorie];
}

export function RechercheMateriel({
  id,
  choix,
  onChoix,
  onRecherche,
  invalide,
  decritPar,
}: {
  /** L'`id` du champ, que le `<label>` vise. */
  id: string;
  choix: ChoixMateriel;
  onChoix: (c: ChoixMateriel) => void;
  /** Une recherche commence (`true`) ou s'achève, par un choix ou un abandon (`false`). */
  onRecherche?: (enCours: boolean) => void;
  invalide?: boolean;
  /** `aria-describedby` : l'aide sous le champ. */
  decritPar?: string;
}) {
  const base = useId();
  const idListe = `${base}-liste`;
  const [ouvert, setOuvert] = useState(false);
  // `null` : on ne cherche pas, le champ montre le choix en cours.
  const [saisie, setSaisie] = useState<string | null>(null);
  const [actif, setActif] = useState(0);

  const resultatBrut = useMemo(() => rechercherMateriel(saisie ?? ""), [saisie]);
  // Revue du lot (point 7) : une saisie qui ne désigne rien propose « Autre
  // équipement », sélectionnable — la soupape de saisie reste à un geste.
  const rienNeCorrespond =
    resultatBrut.categories.length === 0 && resultatBrut.materiels.length === 0;
  const resultat = useMemo(
    () =>
      rienNeCorrespond
        ? { categories: ["AUTRE" as CategorieEquipement], materiels: [] }
        : resultatBrut,
    [resultatBrut, rienNeCorrespond],
  );
  const options: Option[] = useMemo(
    () => [
      ...resultat.categories.map((c) => ({ type: "categorie" as const, categorie: c })),
      ...resultat.materiels.map((m) => ({ type: "materiel" as const, cle: m.cle, libelle: m.libelle })),
    ],
    [resultat],
  );
  const idOption = (i: number) => `${base}-option-${i}`;

  const choisir = (o: Option) => {
    onChoix(
      o.type === "categorie"
        ? { categorie: o.categorie, materiel: null }
        : { categorie: "AUTRE", materiel: o.cle },
    );
    setSaisie(null);
    setOuvert(false);
    onRecherche?.(false);
  };

  const fermer = () => {
    setSaisie(null);
    setOuvert(false);
    onRecherche?.(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!ouvert) {
        setOuvert(true);
        setActif(0);
      } else if (options.length > 0) {
        setActif((a) => (a + 1) % options.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (ouvert && options.length > 0) {
        setActif((a) => (a - 1 + options.length) % options.length);
      }
    } else if (e.key === "Enter") {
      // Entrée choisit l'option active ; elle n'envoie jamais le formulaire
      // tant que la liste est ouverte.
      if (ouvert) {
        e.preventDefault();
        const o = options[actif];
        if (o) choisir(o);
      }
    } else if (e.key === "Escape") {
      if (ouvert) {
        e.preventDefault();
        fermer();
      }
    }
  };

  const nbCategories = resultat.categories.length;
  const optionsCategories = options.slice(0, nbCategories);
  const optionsMateriels = options.slice(nbCategories);

  const rendreOption = (o: Option, i: number) => {
    const estActive = ouvert && i === actif;
    const estChoisie =
      o.type === "categorie"
        ? choix.materiel === null && choix.categorie === o.categorie
        : choix.materiel === o.cle;
    return (
      <li
        key={o.type === "categorie" ? o.categorie : o.cle}
        id={idOption(i)}
        role="option"
        aria-selected={estChoisie}
        // `onMouseDown` + `preventDefault` : le champ garde le focus, et le
        // clic ne passe pas par un `blur` qui fermerait la liste avant lui.
        onMouseDown={(e) => {
          e.preventDefault();
          choisir(o);
        }}
        onMouseMove={() => setActif(i)}
        className={
          "flex cursor-pointer items-center gap-3 rounded-[16px] px-3 py-2 text-[13.5px] leading-[1.35] text-[color:var(--board-ink)] " +
          (estActive ? "bg-[color:var(--board-blue-pale)]" : "")
        }
      >
        {o.type === "categorie" ? (
          <>
            <MarqueCategorie categorie={o.categorie} taille={26} />
            <span className="min-w-0 flex-1">{LABEL_CATEGORIE_EQUIPEMENT[o.categorie]}</span>
          </>
        ) : (
          <>
            <MarqueCategorie categorie="AUTRE" taille={26} />
            <span className="min-w-0 flex-1">
              {o.libelle}
              <span className="block text-[11.5px] text-[color:var(--board-slate-mid)]">
                Non suivi par Rojer — enregistré en « Autre équipement »
              </span>
            </span>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={ouvert}
        // Revue du lot (point 7) : `aria-controls` ne vise que la liste
        // présente — elle n'est montée qu'ouverte.
        aria-controls={ouvert ? idListe : undefined}
        aria-activedescendant={ouvert && options[actif] ? idOption(actif) : undefined}
        aria-invalid={invalide || undefined}
        aria-describedby={decritPar}
        className="champ-board"
        value={saisie ?? libelleDuChoix(choix)}
        placeholder="Chercher : extincteur, chaudière, chambre froide…"
        onFocus={(e) => e.currentTarget.select()}
        onClick={() => setOuvert(true)}
        onChange={(e) => {
          setSaisie(e.currentTarget.value);
          setActif(0);
          setOuvert(true);
          onRecherche?.(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={fermer}
      />
      {/* Région live, toujours montée (revue du lot, point 7) : « rien ne
          correspond » s'annonce au lecteur d'écran sans déplacer le focus. */}
      <p role="status" aria-live="polite" className="sr-only">
        {ouvert && rienNeCorrespond ? MESSAGE_RIEN_NE_CORRESPOND : ""}
      </p>
      {ouvert && (
        <ul
          id={idListe}
          role="listbox"
          aria-label="Catégories et matériels"
          // Le patron flottant du board (`BarreCompte`, panneau du compte) :
          // carte, rayon 18, son ombre — pas une quatrième recette (charte
          // § 1.7), ni la surface creuse, qui est celle des sous-blocs.
          className="absolute left-0 right-0 z-50 m-0 mt-2 max-h-[340px] list-none overflow-y-auto rounded-[18px] bg-[color:var(--board-card)] p-2 shadow-[0_0_0_1px_rgba(13,18,36,.08),0_18px_40px_-20px_rgba(13,18,36,.35)]"
        >
          {rienNeCorrespond && (
            <li role="presentation" aria-hidden="true" className="px-3 py-2 text-[12.5px] text-[color:var(--board-slate-mid)]">
              {MESSAGE_RIEN_NE_CORRESPOND}
            </li>
          )}
          {optionsCategories.length > 0 && (
            <li role="presentation">
              <ul role="group" aria-label="Catégories suivies par Rojer" className="m-0 list-none p-0">
                {optionsCategories.map((o, i) => rendreOption(o, i))}
              </ul>
            </li>
          )}
          {optionsMateriels.length > 0 && (
            <li role="presentation" className="mt-2 border-t border-[color:var(--board-slate-line)] pt-2">
              <p
                aria-hidden="true"
                className="board-eyebrow m-0 px-3 pb-1 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]"
              >
                Matériels que Rojer ne suit pas
              </p>
              <ul role="group" aria-label="Matériels que Rojer ne suit pas" className="m-0 list-none p-0">
                {optionsMateriels.map((o, i) => rendreOption(o, nbCategories + i))}
              </ul>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
