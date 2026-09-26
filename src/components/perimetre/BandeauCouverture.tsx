// Dire au dirigeant que ce qu'il lit est incomplet.
//
// Un établissement hors périmètre n'est pas bloqué : il n'y a rien de
// dangereux à consulter ses équipements, et lui fermer la porte ne
// l'aiderait pas. Ce qui serait dangereux, c'est qu'il lise un calendrier et
// un registre d'apparence complète en ignorant qu'ils laissent de côté la
// moitié du règlement qui le vise. C'est cet écran-là qu'on présente à une
// commission.
//
// D'où un bandeau, et pas une note en pied de page : il se lit avant le
// contenu qu'il qualifie, sinon il arrive trop tard.
//
// Deux tons, jamais confondus. « Manque » est un fait établi et durable —
// encre signal. « Indétermination » est une question ouverte dont la réponse
// appartient au dirigeant — ambre, et un geste à faire. Les deux peuvent être
// vrais en même temps : le bandeau rend alors deux blocs, et pas un compromis
// entre les deux tons.
//
// Une entrée par fait, jamais un total. Quatre manques ne font pas « 4 » :
// ils font quatre phrases, chacune vraie d'une chose différente. Et un même
// axe peut en porter deux — un DUERP dont le référentiel ne couvre pas tout
// ET qui s'appuie sur celui d'un autre métier —, d'où des clés indexées.

import Link from "next/link";
import { AlertTriangle, HelpCircle } from "lucide-react";
import type {
  CouvertureEtablissement,
  ManqueCouverture,
  IndeterminationCouverture,
} from "@/lib/perimetre/couverture";
import { riensASignaler } from "@/lib/perimetre/couverture";

/** Le geste proposé, par axe. Un lien par manque serait du bruit ; un lien
 *  vers la fiche établissement quand c'est le régime qui est en cause, et
 *  vers l'endroit où la question se répond sinon. */
function lienDeLAxe(
  axe: ManqueCouverture["axe"],
  hrefs: { etablissement: string; duerp?: string; equipements?: string },
): { href: string; libelle: string } | null {
  switch (axe) {
    case "igh":
    case "categorie_erp":
      return {
        href: hrefs.etablissement,
        libelle: "Vérifier le régime de l'établissement",
      };
    // Même destination encore, et un troisième libellé : l'effectif est
    // renseigné, il ne se « renseigne » donc pas, et ce n'est pas le régime
    // qu'on va relire. « Vérifier le régime » enverrait chercher au mauvais
    // endroit d'un formulaire long.
    case "effectif":
      return {
        href: hrefs.etablissement,
        libelle: "Vérifier l'effectif déclaré",
      };
    // Le cas `famille_habitation` a vécu ici du 2026-09-01 au 2026-09-03, avec
    // un libellé à lui — « Renseigner la fiche de l'établissement » — et une
    // bonne raison de l'avoir : on n'envoie pas « vérifier » un champ vide.
    // L'axe est retiré avec la question : aucune obligation du référentiel ne
    // dépend de la famille, et une indétermination annoncée sur une donnée qui
    // ne décide de rien envoie le dirigeant chercher pour rien.
    case "secteur_duerp":
      return hrefs.duerp
        ? { href: hrefs.duerp, libelle: "Ouvrir le document unique" }
        : null;
    // Même destination, et le même libellé à dessein : « Déclarer vos
    // équipements » présumerait qu'il y en a à déclarer, ce que le fait ne dit
    // pas — un bureau sans appareil soumis sort la même phrase.
    case "domaine_equipement":
    case "inventaire":
      return hrefs.equipements
        ? { href: hrefs.equipements, libelle: "Voir les équipements" }
        : null;
  }
}

function Bloc({
  ton,
  entrees,
  hrefs,
}: {
  ton: "signal" | "ambre";
  entrees: (ManqueCouverture | IndeterminationCouverture)[];
  hrefs: { etablissement: string; duerp?: string; equipements?: string };
}) {
  if (entrees.length === 0) return null;
  const signal = ton === "signal";

  return (
    <section
      className="carte-board flex gap-4 px-7 py-5 sm:px-8"
      style={{
        background: signal
          ? "var(--board-signal-wash)"
          : "var(--board-amber-wash)",
        boxShadow: `0 0 0 1px ${
          signal ? "var(--board-signal-line)" : "var(--board-amber)"
        }`,
      }}
      role="note"
    >
      <span
        className="mt-0.5 flex-none"
        style={{
          color: signal ? "var(--board-signal-ink)" : "var(--board-amber-ink)",
        }}
      >
        {signal ? (
          <AlertTriangle aria-hidden className="size-[18px]" />
        ) : (
          <HelpCircle aria-hidden className="size-[18px]" />
        )}
      </span>

      <div className="flex min-w-0 flex-col gap-5">
        {entrees.map((e, i) => {
          const lien = lienDeLAxe(e.axe, hrefs);
          const suite = "consequence" in e ? e.consequence : e.quoiFaire;
          return (
            // L'axe ne suffit PAS comme clé : `axeDuerp` et
            // `axeSecteurParDefaut` poussent tous deux `secteur_duerp`, et
            // c'est voulu — les deux faits sont vrais en même temps. React
            // rendait les deux au premier passage mais déclare le doublon non
            // supporté, et en avertissait à chaque rendu serveur concerné.
            <div key={`${e.axe}-${i}`} className="min-w-0">
              <p
                className="m-0 text-[14px] font-semibold leading-[1.4] tracking-[-0.015em]"
                style={{
                  color: signal
                    ? "var(--board-signal-ink)"
                    : "var(--board-amber-ink)",
                }}
              >
                {e.motif}
              </p>
              <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                {suite}
              </p>
              {lien ? (
                <Link
                  href={lien.href}
                  className="mt-3 inline-block text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                >
                  {lien.libelle}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BandeauCouverture({
  couverture,
  hrefEtablissement,
  hrefDuerp,
  hrefEquipements,
}: {
  couverture: CouvertureEtablissement;
  /** La fiche établissement, où se corrige ou se renseigne le régime. */
  hrefEtablissement: string;
  /** Le document unique, où se répondent les questions d'activité. */
  hrefDuerp?: string;
  /** L'inventaire, où le détail appareil par appareil se lit. */
  hrefEquipements?: string;
}) {
  if (riensASignaler(couverture)) return null;
  const hrefs = {
    etablissement: hrefEtablissement,
    duerp: hrefDuerp,
    equipements: hrefEquipements,
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Les faits établis d'abord : une question ouverte se lit mieux après
          ce qui est déjà tranché. */}
      <Bloc ton="signal" entrees={couverture.manques} hrefs={hrefs} />
      <Bloc ton="ambre" entrees={couverture.indeterminations} hrefs={hrefs} />
    </div>
  );
}
