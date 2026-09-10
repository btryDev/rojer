// Une catégorie du parc, et les appareils qu'elle contient.
//
// Le classement principal reste la catégorie — c'est elle qui porte le
// rythme réglementaire, et c'est par famille qu'un dirigeant pense son
// parc. Ce qui a changé : la section n'est plus une liste de dates mais
// une grille de vitrines, et chaque vitrine dit d'abord OÙ.
//
// La jauge en tête compte, elle ne mesure pas : un segment par appareil,
// coloré par les jetons d'état du board.

import Link from "next/link";
import { Plus } from "lucide-react";
import { MarqueCategorie } from "@/components/equipements/MarqueCategorie";
import { VitrineEquipement } from "@/components/equipements/VitrineEquipement";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { LABEL_PERIODICITE } from "@/lib/calendrier/labels";
import {
  CHAMP_ETAT,
  PRIORITE_ETAT,
  type RegistreLigne,
} from "@/lib/calendrier/etats";
import type { ResumeEquipement } from "@/lib/equipements/etat-verifications";
import type {
  CategorieEquipement,
  Periodicite,
} from "@/lib/referentiels/types-communs";

export type AppareilListe = {
  id: string;
  libelle: string;
  /** Ce que la vitrine annonce en grand : le bâtiment dès qu'il y en a
   *  plusieurs et qu'aucun n'est filtré, la localisation sinon (ADR-019). */
  lieu: string | null;
  /** Le second étage du lieu, quand le premier est le bâtiment. */
  precision?: string | null;
  resume: ResumeEquipement;
  /** Quand le référentiel ne produit aucune échéance pour cet appareil :
   *  un fait sur l'outil, jamais sur le droit (cf. `hors-referentiel.ts`). */
  horsReferentiel: { libelle: string; explication: string } | null;
  href: string;
};

/** Ordre d'affichage des segments : le plus urgent en tête. */
const ORDRE: RegistreLigne[] = [
  "enRetard",
  "aPlanifier",
  "proche",
  "lointain",
  "faite",
];

function Jauge({ etats }: { etats: RegistreLigne[] }) {
  const compte = new Map<RegistreLigne, number>();
  for (const e of etats) compte.set(e, (compte.get(e) ?? 0) + 1);
  const segments = ORDRE.filter((e) => compte.has(e));
  if (segments.length === 0) return null;

  return (
    <span aria-hidden className="flex h-2 w-[180px] flex-none gap-[3px]">
      {segments.map((e) => (
        <span
          key={e}
          className="h-full rounded-full"
          style={{ flex: compte.get(e), background: CHAMP_ETAT[e] }}
        />
      ))}
    </span>
  );
}

export function CarteCategorie({
  categorie,
  appareils,
  periodicites,
  hrefAjouter,
}: {
  categorie: CategorieEquipement;
  appareils: AppareilListe[];
  /** Les rythmes réellement portés par les lignes de suivi générées. */
  periodicites: Periodicite[];
  hrefAjouter: string;
}) {
  // Une installation électrique porte à elle seule quatre rythmes : les
  // énumérer transformait le sur-titre en liste de courses. Au-delà de
  // deux, on annonce le nombre — le détail est sur la fiche.
  const rythmes = [...new Set(periodicites.map((p) => LABEL_PERIODICITE[p]))];
  const rythme =
    rythmes.length === 0
      ? null
      : rythmes.length <= 2
        ? `vérification ${rythmes.join(" et ")}`
        : `${rythmes.length} rythmes de vérification`;

  return (
    <section>
      <div className="flex items-center gap-3.5 border-b border-[color:var(--board-slate-line)] pb-3.5">
        <MarqueCategorie categorie={categorie} taille={44} />
        <div className="min-w-0 flex-1">
          <h2 className="board-titre m-0 text-[22px]">
            {LABEL_CATEGORIE_EQUIPEMENT[categorie]}
          </h2>
          <p className="board-eyebrow m-0 mt-1 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            {appareils.length} équipement{appareils.length > 1 ? "s" : ""}
            {rythme ? ` · ${rythme}` : null}
          </p>
        </div>
        <Jauge
          etats={appareils
            // Un appareil sans le moindre signal n'a pas d'état calculé :
            // `resumerEquipement(undefined)` retombe sur « à planifier ».
            // Peint tel quel, il donnait une jauge pleine de segments
            // « à planifier » au-dessus de vitrines qui annoncent, chacune,
            // « aucune vérification rattachée ». `urgenceCategorie` écarte
            // déjà ce repli pour le tri ; la jauge l'avalait.
            .filter((a) => a.resume.signaux.length > 0)
            .map((a) => a.resume.etat)}
        />
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {appareils.map((a) => (
          <VitrineEquipement
            key={a.id}
            libelle={a.libelle}
            lieu={a.lieu}
            precision={a.precision}
            signaux={a.resume.signaux}
            horsReferentiel={a.horsReferentiel}
            href={a.href}
          />
        ))}
      </div>

      {/* Le geste est aussi à la famille concernée : depuis le haut de
          page, il faut rechoisir la catégorie qu'on avait sous les yeux.
          En bande plutôt qu'en tuile — une tuile d'ajout tombe seule sur
          une deuxième rangée dès que la famille compte quatre appareils. */}
      <Link
        href={hrefAjouter}
        className="mt-3 flex items-center justify-center gap-2 rounded-[18px] border border-dashed border-[color:var(--board-slate)] py-3 text-[12.5px] font-semibold text-[color:var(--board-slate-soft)] transition-colors hover:border-[color:var(--board-blue-strong)] hover:text-[color:var(--board-blue-ink)]"
      >
        <Plus className="size-4" aria-hidden />
        Ajouter — {LABEL_CATEGORIE_EQUIPEMENT[categorie].toLowerCase()}
      </Link>
    </section>
  );
}

/** Rangs d'urgence, pour trier les sections : la catégorie la plus en
 *  peine se lit en premier. Exporté pour que la page trie sans redéfinir
 *  l'échelle. */
export function urgenceCategorie(appareils: AppareilListe[]): number {
  return appareils.reduce((max, a) => {
    // Un appareil sans le moindre signal n'a rien à faire remonter : son
    // état est un repli, pas un « à planifier » constaté. Sans cette
    // distinction, une famille d'appareils dont le référentiel ne dit rien
    // passait devant une famille qui porte une échéance dans trois mois —
    // alors que ses cartes annoncent « aucune vérification rattachée ».
    if (a.resume.signaux.length === 0) return max;
    const e = a.resume.etat;
    const rang = e === "aPlanifier" ? 1.5 : PRIORITE_ETAT[e];
    return Math.max(max, rang);
  }, 0);
}
