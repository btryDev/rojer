// Le hero du tableau de bord : la fiche de l'établissement et son bâtiment.
//
// **Ce que le dessin dit, et ne dit pas.** L'application ne sait rien du bâti
// — ni hauteur, ni étages, ni forme. Le dessin est l'emblème du genre de lieu
// (`illustrationBatiment`), jamais un portrait : rien n'y est épinglé.
// [2026-10-25] Un plan du lieu, puis des étiquettes de zone autour du dessin,
// ont été essayés et refusés par la propriétaire : un emplacement dessiné se
// lit comme celui du client, et le produit ne le connaît pas. Ce qu'on sait
// de l'établissement est écrit dans sa fiche, sur laquelle le dessin est posé.

import { DoorOpen, IdCard, Users, Wrench } from "lucide-react";
import { nomDeZone } from "@/lib/batiments/nom-zone";
import { CartePhotoLieu } from "./CartePhotoLieu";
import type { IllustrationBatiment } from "@/lib/etablissements/illustration";
import { regimesAffiches } from "@/lib/etablissements/types-erp-affiches";
import { pluriel } from "@/lib/rendu/pluriel";
import type { EtablissementLite } from "../types";

/**
 * Le monogramme de repli, quand aucun logo n'est déposé.
 *
 * Les initiales des deux premiers mots, ou les deux premières lettres d'un
 * mot unique. Dérivé du nom, donc jamais faux — là où une icône générique
 * de bâtiment aurait fait croire à un logo par défaut.
 *
 * NOTE D'IMPLÉMENTATION — le logo n'est pas encore persisté : `Entreprise`
 * n'a pas de colonne pour lui et aucun écran ne permet d'en déposer un. Le
 * jour où il arrive, il prend la place du monogramme dans la fiche.
 */
export function monogramme(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "—";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

/**
 * Le genre de lieu que dit le dessin, en un mot — repris sous le nom de la
 * fiche. `null` pour le local générique : « local » n'apprend rien.
 */
const ACTIVITE: Record<IllustrationBatiment, string | null> = {
  restaurant: "Restaurant",
  magasin: "Commerce",
  bureaux: "Bureaux",
  hotel: "Hôtel",
  "salle-sport": "Salle de sport",
  local: null,
};

function Fait({
  Icone,
  libelle,
  valeur,
  precision,
}: {
  Icone: typeof Users;
  libelle: string;
  valeur: string;
  precision: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-[11.5px] text-[color:var(--board-slate-mid)]">
        <Icone aria-hidden className="size-3.5 flex-none" />
        {libelle}
      </dt>
      <dd className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">
        {valeur}
      </dd>
      {precision ? (
        <dd className="m-0 text-[12px] text-[color:var(--board-slate-mid)]">{precision}</dd>
      ) : null}
    </div>
  );
}

/**
 * Le hero du tableau de bord : la fiche de l'établissement, étirée sur la
 * largeur, et le bâtiment du genre de lieu posé sur son extrémité droite
 * (planche 6 de l'artefact, retenue par la propriétaire le 2026-10-25).
 *
 * Tout ce que la fiche dit vient de la fiche établissement, de l'équipe et
 * du parc ; rien n'y est un état de conformité — les compteurs sont aux
 * widgets du dessous. Les zones sont de l'information, pas un filtre : le
 * filtre reste le sélecteur posé sous le hero.
 */
export function HeroEtablissement({
  etablissement: etab,
  illustration,
  photo,
  nbEquipe,
  nbEquipements,
  zones,
}: {
  etablissement: EtablissementLite;
  illustration: IllustrationBatiment;
  /** L'adresse de la photo du lieu, ou `null` (`DashboardBundle.photoHero`). */
  photo: string | null;
  nbEquipe: number;
  nbEquipements: number;
  zones: readonly { id: string; nom: string; nbEquipements: number }[];
}) {
  const [principal = "Régime non renseigné", ...autres] = regimesAffiches(etab);
  const activite = ACTIVITE[illustration];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_clamp(260px,24vw,380px)]">
      <div className="min-w-0 rounded-[24px] bg-[color:var(--board-card)] p-6 ring-1 ring-[color:rgba(13,18,36,.10)] sm:p-7">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            aria-hidden
            className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-[color:var(--board-ink)] indent-[0.06em] font-mono text-[13px] font-medium tracking-[0.06em] text-white"
          >
            {monogramme(etab.raisonDisplay)}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-[color:var(--board-ink)]">
              {etab.raisonDisplay}
            </p>
            <p className="m-0 mt-0.5 truncate text-[13px] text-[color:var(--board-slate-mid)]">
              {[activite, etab.adresse].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <dl className="m-0 mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[color:var(--board-slate-line)] pt-5 xl:grid-cols-4">
          <Fait
            Icone={DoorOpen}
            libelle="Régime"
            valeur={principal}
            precision={autres.length > 0 ? `+ ${autres.join(", ")}` : null}
          />
          <Fait
            Icone={Users}
            libelle="Effectif"
            valeur={pluriel(etab.effectifSurSite, "salarié")}
            precision="sur site"
          />
          <Fait
            Icone={IdCard}
            libelle="Équipe"
            valeur={pluriel(nbEquipe, "fiche")}
            precision="dans l'équipe"
          />
          <Fait
            Icone={Wrench}
            libelle="Équipements"
            valeur={pluriel(nbEquipements, "déclaré")}
            precision={`dans ${pluriel(zones.length, "zone")}`}
          />
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="board-eyebrow mr-1 text-[10px] text-[color:var(--board-slate-mid)]">
            Zones
          </span>
          {zones.map((z) => (
            <span
              key={z.id}
              className="inline-flex items-center gap-2 rounded-[12px] bg-[color:var(--board-slate-pale)] px-3 py-1.5 text-[12.5px]"
            >
              <span className="font-semibold text-[color:var(--board-ink)]">{nomDeZone(z.nom)}</span>
              <span className="text-[color:var(--board-slate-mid)]">
                {z.nbEquipements > 0 ? pluriel(z.nbEquipements, "équipement") : "aucun équipement"}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* [2026-10-25] Le lieu dans sa propre carte, à côté de la fiche et à
          sa hauteur : la photo déposée par le dirigeant, ou l'illustration
          du genre de lieu. */}
      <CartePhotoLieu etablissementId={etab.id} photo={photo} illustration={illustration} />
    </div>
  );
}
