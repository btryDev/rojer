import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LegalBadge } from "@/components/ui-kit";
import { PrestataireCard } from "@/components/prestataires/PrestataireCard";
import { requireEtablissement } from "@/lib/auth/scope";
import { listPrestataires } from "@/lib/prestataires/queries";
import {
  CHAMP_ETAT,
  ENCRE_ETAT,
  type RegistreLigne,
} from "@/lib/calendrier/etats";

/**
 * L'annuaire des prestataires, en charte board (`docs/charte-board.md`).
 *
 * L'écran était en charte papier : colonne centrée `max-w-5xl`, `cartouche`,
 * `label-admin`, et un bandeau d'alerte bâti sur `--minium`. Il est passé au
 * board sur le gabarit de la liste d'équipements — bandeau bord à bord,
 * gouttière `--board-gutter`, compteurs qui suivent ce qui est affiché.
 */
export default async function PrestatairesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  const prestataires = await listPrestataires(id);

  // Le compteur porte le volume, mais la COULEUR vient de l'état le plus grave
  // réellement présent. Peindre en rose un établissement dont les seules
  // pièces manquantes n'ont jamais été fournies annonce un retard qui n'existe
  // pas : rien n'a d'échéance tant qu'il n'y a pas de document.
  const nbAlertes = prestataires.reduce(
    (acc, p) => acc + p.vigilance.alertesOuvertes,
    0,
  );
  const etatDuLot: RegistreLigne | null = prestataires.some(
    (p) => p.vigilance.etatLePlusGrave === "enRetard",
  )
    ? "enRetard"
    : prestataires.some((p) => p.vigilance.etatLePlusGrave === "proche")
      ? "proche"
      : prestataires.some((p) => p.vigilance.etatLePlusGrave === "aPlanifier")
        ? "aPlanifier"
        : null;

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <Link
              href={`/etablissements/${id}`}
              className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
            >
              <ArrowLeft className="size-3" aria-hidden />
              {etablissement.raisonDisplay}
            </Link>
            <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
              Prestataires
            </h1>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Les entreprises qui interviennent chez vous, et l&apos;état de
              leurs pièces administratives. Une attestation signale son
              expiration trente jours avant l&apos;échéance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Le compteur ne s'affiche qu'en cas d'alerte : un « 0 à
                régulariser » permanent occupe la place sans rien apprendre. */}
            {etatDuLot !== null && (
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-[9px]"
                style={{
                  background: CHAMP_ETAT[etatDuLot],
                  color: ENCRE_ETAT[etatDuLot],
                }}
              >
                <span className="board-titre text-[20px] tabular-nums leading-none">
                  {nbAlertes}
                </span>
                <span className="board-eyebrow text-[9.5px] tracking-[0.12em]">
                  {nbAlertes > 1 ? "pièces à demander" : "pièce à demander"}
                </span>
              </span>
            )}
            <Link
              href={`/etablissements/${id}/prestataires/nouveau`}
              className={buttonVariants({ variant: "board", size: "board" })}
            >
              <Plus className="size-3.5" aria-hidden />
              Ajouter un prestataire
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        {prestataires.length === 0 ? (
          /* État vide, pas état d'erreur : il dit ce que l'écran fera, d'où
             viendront les données, et ouvre une porte (charte § 6). */
          <section className="carte-board px-7 py-8 sm:px-8">
            <div className="flex max-w-[560px] flex-col gap-3">
              <h2 className="board-titre m-0 text-[22px]">
                Votre annuaire est vide
              </h2>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Commencez par ceux qui interviennent déjà : l&apos;organisme qui
                vérifie vos installations électriques, celui qui contrôle vos
                extincteurs, votre ascensoriste. Vous retrouverez leur contact
                sans le rechercher, et vous pourrez leur envoyer un lien de
                dépôt de rapport sans ressaisir leur adresse.
              </p>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Chaque prestataire porte ses pièces de vigilance. L&apos;écran
                vous dira lesquelles arrivent à échéance, et quand.
              </p>
              <div className="mt-2">
                <Link
                  href={`/etablissements/${id}/prestataires/nouveau`}
                  className={buttonVariants({
                    variant: "board",
                    size: "board",
                  })}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Ajouter un prestataire
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {prestataires.map((p) => (
              <PrestataireCard key={p.id} etablissementId={id} prestataire={p} />
            ))}
          </div>
        )}

        {/* Ce qui fonde l'obligation, replié en pied : on le lit une fois, on
            ne le relit pas à chaque visite. */}
        <section className="carte-board px-7 py-6 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Pourquoi cette page
          </p>
          <h2 className="board-titre m-0 mt-2 text-[22px]">
            Votre obligation de vigilance
          </h2>
          <p className="m-0 mt-3 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Pour tout contrat d&apos;au moins <strong>5 000 € HT</strong>, vous
            vous faites remettre <strong>tous les six mois</strong>{" "}
            l&apos;attestation
            de vigilance de votre prestataire, et vous en gardez trace.
          </p>
          <div className="mt-4">
            {/* L'URL pointait sur LEGIARTI000037389145, qui rend 404, et
                l'extrait attribué à « L. 8222-1 · D. 8222-5 » n'était le texte
                ni de l'un ni de l'autre : il fondait ensemble le seuil de
                R. 8222-1 et le rythme de D. 8222-5. Trois articles relus à la
                source le 2026-08-28 ; la pastille cite celui qui impose la
                vérification, le complément dit d'où viennent le montant et le
                rythme. */}
            <LegalBadge
              charte="board"
              reference="Art. L. 8222-1 CT"
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024197683"
              extrait="Toute personne vérifie lors de la conclusion d'un contrat dont l'objet porte sur une obligation d'un montant minimum en vue de l'exécution d'un travail, de la fourniture d'une prestation de services ou de l'accomplissement d'un acte de commerce, et périodiquement jusqu'à la fin de l'exécution du contrat, que son cocontractant s'acquitte : 1° des formalités mentionnées aux articles L. 8221-3 et L. 8221-5 […]"
            >
              <p>
                Le seuil de <strong>5 000 € HT</strong> est fixé par
                R. 8222-1 ; le rythme <strong>semestriel</strong> et la liste
                des pièces à se faire remettre, par D. 8222-5.
              </p>
            </LegalBadge>
          </div>
        </section>
      </div>
    </main>
  );
}
