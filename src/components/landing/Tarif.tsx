// LE TARIF — trois offres, la mise en route accompagnée (sans prix, un
// contact), puis la grille complète dans un volet. Données : `tarif-
// donnees.ts` (grille du 2026-11-05).
//
// Rien n'y dit « conforme » : l'expert donne un conseil technique, jamais un
// avis juridique, et la mention le rappelle.

import { ChevronRepli, LIEN_REPLI } from "@/components/ui/repli";
import { cn } from "@/lib/utils";
import { lienContact } from "./contact";
import { Reveal } from "./Reveal";
import { ABONNEMENT, GRILLE, INCLUS, NON_INCLUS } from "./tarif-grille";
import { TarifOffres } from "./TarifOffres";

const COLONNES = [
  { nom: "Essai", detail: "30 jours, sur Essentiel" },
  { nom: "Essentiel" },
  { nom: "Pro" },
  { nom: "Sur mesure" },
] as const;

/** Le fond de la colonne « Essai ». */
const FOND_ESSAI = "bg-[color:var(--board-amber-wash)]";

/** Le ton d'une case qui ne porte pas un chiffre. */
const TON: Record<string, string> = {
  [INCLUS]: "font-semibold text-[color:var(--board-blue-ink)]",
  [NON_INCLUS]: "text-[color:var(--board-slate)]",
  [ABONNEMENT]: "font-mono text-[0.66rem] tracking-[0.06em] text-[color:var(--board-amber-ink)]",
};

export function Tarif({
  ctaHref,
  ctaLabel,
  connecte,
}: {
  ctaHref: string;
  ctaLabel: string;
  connecte: boolean;
}) {
  return (
    <section id="tarif" className="bg-[color:var(--board-card)] py-24 sm:py-32">
      <div className="lp-shell">
        <Reveal as="header" className="text-center">
          <p className="lp-eyebrow">Tarif</p>
          <h2 className="lp-titre lp-h2 mt-3.5">Une offre selon la taille de votre structure</h2>
          <p className="lp-lede mx-auto mt-4 max-w-[52ch]">
            30 jours d&apos;essai sur Essentiel, sans carte bancaire. Mensuel
            sans engagement, ou annuel à −15&nbsp;%.
          </p>
        </Reveal>

        <Reveal delai={120}>
          <TarifOffres ctaHref={ctaHref} ctaLabel={ctaLabel} connecte={connecte} />
        </Reveal>

        {/* La mise en route accompagnée : pas de prix pour l'instant. */}
        <Reveal delai={160}>
          <div className="mt-7 flex flex-col items-start gap-6 rounded-[22px] bg-[color:var(--board-blue-pale)] px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="lp-titre text-[1.15rem]">Mise en route accompagnée</h3>
              <p className="mt-1.5 max-w-[62ch] text-[0.92rem] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Nous remplissons Rojer avec vous : votre établissement, vos
                équipements, votre DUERP existant et les rapports déjà reçus.
                Vous repartez avec un dossier rempli.
              </p>
            </div>
            <a href={lienContact("Mise en route accompagnée")} className="lp-btn lp-btn-ink flex-none">
              Nous contacter
            </a>
          </div>
        </Reveal>

        <p className="mt-5 text-center text-[0.78rem] text-[color:var(--board-slate-soft)]">
          Prix hors taxes. Essai sans carte bancaire. L&apos;expert donne un
          conseil technique de prévention, jamais un avis juridique.
        </p>

        {/* La grille complète, repliée : la page reste lisible. */}
        <details className="group mt-10">
          <summary className={cn(LIEN_REPLI, "mx-auto flex w-max text-[0.92rem] text-[color:var(--board-ink)]")}>
            <ChevronRepli />
            Voir le détail des offres
          </summary>

          <div className="mt-8 overflow-x-auto rounded-[22px] bg-[color:var(--board-card)] shadow-[0_0_0_1px_rgba(13,18,36,0.08)]">
            <table className="w-full min-w-[720px] border-collapse text-[0.9rem]">
              <thead>
                <tr className="border-b border-[color:var(--board-slate-pale)]">
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Module</th>
                  {COLONNES.map((c, i) => (
                    <th key={c.nom} scope="col" className={cn("w-[15%] px-4 py-3 text-center font-semibold", i === 0 && FOND_ESSAI)}>
                      {c.nom}
                      {"detail" in c ? (
                        <span className="block text-[0.72rem] font-normal text-[color:var(--board-slate-soft)]">{c.detail}</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              {GRILLE.map((g) => (
                <tbody key={g.titre}>
                  <tr>
                    <th
                      colSpan={5}
                      scope="rowgroup"
                      className="bg-[color:var(--board-blue-pale)] px-4 py-2 text-left font-mono text-[0.66rem] font-medium uppercase tracking-[0.14em] text-[color:var(--board-blue-ink)]"
                    >
                      {g.titre}
                    </th>
                  </tr>
                  {g.lignes.map((l) => (
                    <tr key={l.libelle} className="border-b border-[color:var(--board-slate-pale)] last:border-b-0">
                      <th scope="row" className="px-4 py-3 text-left font-normal">{l.libelle}</th>
                      {l.cases.map((v, i) => (
                        <td key={COLONNES[i].nom} className={cn("px-4 py-3 text-center", TON[v], i === 0 && FOND_ESSAI)}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className="mt-4 text-center text-[0.78rem] leading-[1.55] text-[color:var(--board-slate-soft)]">
            Pendant l&apos;essai, tout s&apos;essaie ; valider, signer ou envoyer un
            document demande de s&apos;abonner. Au jour 30 sans abonnement, le
            compte passe en veille : lecture, export et alertes, plus de saisie.
            Au quota, seule la création est bloquée.
          </p>
        </details>
      </div>
    </section>
  );
}
