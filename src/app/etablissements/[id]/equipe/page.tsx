import Link from "next/link";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { BarreDeListe } from "@/components/ui-kit/BarreDeListe";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SalarieCard } from "@/components/salaries/SalarieCard";
import { requireEtablissement } from "@/lib/auth/scope";
import { listerEquipe, libellesTitresDeclares } from "@/lib/salaries/queries";
import { cataloguerTitres } from "@/lib/salaries/catalogue";
import { texteInformation } from "@/lib/salaries/droits";
import { TexteInformation } from "@/components/salaries/TexteInformation";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import { FAITS_ACTIVITE } from "@/lib/etablissements/faits-activite";
import { chargerFaitsActivite } from "@/lib/etablissements/faits-activite-queries";
import { FormationsAOrganiser } from "@/components/salaries/FormationsAOrganiser";
import { ancreEtatPermanent } from "@/lib/etats-permanents/ancre";
import {
  aOrganiserALEtablissement,
  lignesFormationAffichees,
  pourquoiALEtablissement,
} from "@/lib/etats-permanents/par-l-equipe";
import { etatCourtDe, versFiche } from "@/lib/etats-permanents/vers-fiche";
import { titresSansPorteur } from "@/lib/salaries/titres-sans-porteur";
import { etatsPermanentsDuDossier } from "@/lib/etats-permanents/queries";

/**
 * L'annuaire de l'équipe — le troisième porteur d'échéance (ADR-023).
 *
 * Cet écran a une particularité que les deux autres annuaires n'ont pas, et
 * elle commande sa rédaction : **rien ici n'est déduit**. Le moteur sait qu'un
 * ascenseur déclaré appelle une vérification annuelle ; il ne sait pas qui,
 * dans l'effectif, opère au voisinage de pièces nues sous tension. Depuis
 * l'ADR-041, l'établissement déclare QUE des travailleurs le font (faits
 * d'activité, écran `equipe/risques`) ; qui, c'est le titre déclaré sur la
 * fiche de chacun. L'écran doit donc dire clairement que la couverture vient de
 * ce que l'employeur déclare, sans quoi une page vide se lirait « rien à faire ».
 */
export default async function EquipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, etablissement } = await requireEtablissement(id);
  const now = new Date();
  // Lectures indépendantes, en parallèle ; la dernière donne les formations
  // à organiser (ADR-047, amendée le 2026-10-24).
  const [equipe, titresDeclares, faits, dossier] = await Promise.all([
    listerEquipe(id, now),
    libellesTitresDeclares(id),
    chargerFaitsActivite(id),
    etatsPermanentsDuDossier(id, user.id),
  ]);
  const catalogue = cataloguerTitres();
  // « Formations à organiser » : dues aux salariés sans qu'on sache lesquels.
  // Une seule passe : la ligne de la section et la fiche qu'elle ouvre
  // (revue qualité du 2026-10-24 — le dessin se calculait deux fois).
  const fiches = lignesFormationAffichees(dossier.parLEquipe).map((l) => ({
    ligne: l,
    fiche: versFiche(l, {
      etablissementId: id,
      entrepriseId: etablissement.entrepriseId,
      surTitre: l.parLesTitres
        ? "Formation · d'après les titres de votre équipe"
        : "Formation à organiser pour l'établissement",
    }),
  }));
  const formations = fiches.map(({ ligne, fiche }) => ({
    obligationId: fiche.obligationId,
    ancre: ancreEtatPermanent(fiche.obligationId),
    libelle: fiche.libelle,
    pourquoi: pourquoiALEtablissement(ligne),
    etat: etatCourtDe(ligne),
    dessin: { src: fiche.illustration, fond: fiche.fond },
  }));
  const sansPorteur = faits ? titresSansPorteur(faits, equipe) : [];
  const aOrganiser = aOrganiserALEtablissement(
    dossier.parLEquipe,
    sansPorteur.reduce((n, f) => n + f.titres.length, 0),
  );
  // Les faits sans réponse, NOMMÉS : la passe Chrome du 2026-10-08 a vu le
  // bandeau compter juste et lister les cinq, réponses comprises.
  const NOM_COURT: Record<(typeof FAITS_ACTIVITE)[number]["champ"], string> = {
    manutentionManuelle: "manutention",
    travailSurEcran: "écran",
    operationsElectriques: "électricité",
    conduiteEngins: "engins",
    expositionCMR: "CMR",
    epiPresents: "EPI",
  };
  const muets = faits ? FAITS_ACTIVITE.filter((f) => faits[f.champ] === null) : [];
  const sansReponse = muets.length;

  const enRetard = equipe
    .filter((s) => s.actif)
    .reduce((n, s) => n + s.titres.filter((t) => t.etat === "enRetard").length, 0);
  // Les titres jamais déclarés et dus, en retard (ADR-043) : comptés à part,
  // parce que le geste n'est pas le même — déclarer, pas renouveler.
  const manquesEnRetard = equipe.reduce(
    (n, s) => n + s.manques.filter((m) => m.etat === "enRetard").length,
    0,
  );
  const actifs = equipe.filter((s) => s.actif).length;

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <EnTetePage
        item="equipe"
        description="Les personnes de votre effectif et les titres qu'elles détiennent : habilitation, attestation, certificat. Chaque titre a son échéance, au nom de la personne."
      />

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        {/* Les alertes et l'ajout, au-dessus de la liste qu'ils concernent :
            l'en-tête ne porte que la bascule de vue (2026-10-25). */}
        <BarreDeListe
          alertes={
            <>
              {enRetard > 0 && (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-[9px]"
                  style={{
                    background: CHAMP_ETAT.enRetard,
                    color: ENCRE_ETAT.enRetard,
                  }}
                >
                  <span className="board-titre text-[20px] tabular-nums leading-none">
                    {enRetard}
                  </span>
                  <span className="board-eyebrow text-[9.5px] tracking-[0.12em]">
                    {enRetard > 1 ? "titres à renouveler" : "titre à renouveler"}
                  </span>
                </span>
              )}
              {manquesEnRetard > 0 && (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-[9px]"
                  style={{
                    background: CHAMP_ETAT.enRetard,
                    color: ENCRE_ETAT.enRetard,
                  }}
                >
                  <span className="board-titre text-[20px] tabular-nums leading-none">
                    {manquesEnRetard}
                  </span>
                  <span className="board-eyebrow text-[9.5px] tracking-[0.12em]">
                    {/* « en retard » dit : la pastille ne compte que les retards — un
                        manque « bientôt dû » ou non daté est aussi dû, et n'y
                        est pas (relecture C4). */}
                    {manquesEnRetard > 1
                      ? "titres non déclarés, en retard"
                      : "titre non déclaré, en retard"}
                  </span>
                </span>
              )}
            </>
          }
          action={
            <Link
              href={`/etablissements/${id}/equipe/nouveau`}
              className={buttonVariants({ variant: "board", size: "board" })}
            >
              <Plus className="size-3.5" aria-hidden />
              Ajouter une personne
            </Link>
          }
        />
        {/* La porte d'entrée unique des faits d'activité (ADR-041) : tant
            qu'une question reste sans réponse, les formations qu'elle
            conditionne s'affichent « à confirmer ». */}
        {/* [2026-10-24, décision de la propriétaire] Le bloc ne s'affiche
            que tant qu'une question reste sans réponse : une fois tout répondu,
            les réponses se revoient dans le DUERP, et les formations qui en
            découlent dans la section « Formations à organiser ». */}
        {sansReponse > 0 && (
        <section className="carte-board flex flex-wrap items-center justify-between gap-4 px-7 py-5 sm:px-8">
          <div className="min-w-0 max-w-[var(--board-mesure)]">
            <p className="m-0 text-[14px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
              Évaluez les risques de vos salariés
            </p>
            <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {`${sansReponse} question${sansReponse > 1 ? "s" : ""} sans réponse : ${muets.map((f) => NOM_COURT[f.champ]).join(", ")}. Elles décident des formations, du suivi et des consignes dus à une partie de l'effectif.`}
            </p>
          </div>
          <Link
            href={`/etablissements/${id}/equipe/risques`}
            className={buttonVariants({ variant: "board", size: "boardSm" })}
          >
            Évaluer les risques →
          </Link>
        </section>
        )}

        {equipe.length === 0 ? (
          <section className="carte-board px-7 py-8 sm:px-8">
            <div className="flex max-w-[600px] flex-col gap-3">
              <h2 className="board-titre m-0 text-[22px]">
                Votre équipe n&apos;est pas encore renseignée
              </h2>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Commencez par les personnes qui détiennent un titre :
                l&apos;électricien habilité, le cariste, le titulaire du SST.
                Vous saurez quand leur titre expire, sans avoir à ouvrir un
                classeur.
              </p>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Rojer ne devine pas qui fait quoi. Rien dans un intitulé de
                poste ne dit qu&apos;une personne travaille au voisinage de
                pièces sous tension — c&apos;est vous qui le savez, et
                c&apos;est vous qui déclarez ce qu&apos;elle détient.
              </p>
              <div className="mt-2">
                <Link
                  href={`/etablissements/${id}/equipe/nouveau`}
                  className={buttonVariants({ variant: "board", size: "board" })}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Ajouter une personne
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div id="personnes" className="grid scroll-mt-6 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {equipe.map((s) => (
              <SalarieCard key={s.id} etablissementId={id} salarie={s} />
            ))}
          </div>
        )}

        <FormationsAOrganiser
          etablissementId={id}
          formations={formations}
          fiches={fiches.map((f) => f.fiche)}
          aOrganiser={aOrganiser}
          sansPorteur={sansPorteur}
          personnePresente={actifs > 0}
        />

        {/* Ce que l'écran ne couvre pas, dit par l'écran lui-même. Taire
            l'écart tromperait l'utilisateur sur sa propre couverture.

            ⚠ Ce bloc a menti pendant une journée, et la leçon vaut d'être
            gardée : il énumérait en dur « SST, CACES, autorisation de conduite,
            formations à la sécurité » comme non encodés, alors que le lot 7
            venait d'en encoder trois — et la liste réelle du catalogue
            s'affichait DEUX LIGNES PLUS HAUT, dérivée du référentiel. Un
            paragraphe écrit à la main sous une liste qui se calcule vieillit
            tout seul, et il vieillit en affirmant le contraire de ce qu'on lit
            juste au-dessus. Ce qui reste ci-dessous est donc formulé sans
            énumération figée. */}
        {/* Le pied de l'écran Équipe (2026-10-24, retour de la propriétaire :
            deux cartes pour deux phrases). ~~« Ce que couvre cet écran », en
            carte : la liste des titres, le CACES, le suivi nominatif~~ — reste
            la limite, sans quoi un silence se lirait comme une couverture.
            ~~« Informer les personnes suivies », en carte~~ — reste en une
            ligne : l'obligation est réelle (art. 13 RGPD, L. 1222-4 du Code du
            travail) et incombe à l'employeur ; la carte n'apparaît que s'il y a
            quelqu'un à informer. */}
        {/* Une ligne, qui se replie sur un écran étroit (2026-10-24). */}
        <footer className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-[color:var(--board-slate-line)] pt-4 text-[12px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {actifs > 0 && (
            <span>
              {actifs} personne{actifs > 1 ? "s" : ""} dans l&apos;effectif
              {equipe.length > actifs &&
                `, ${equipe.length - actifs} sortie${equipe.length - actifs > 1 ? "s" : ""} conservée${equipe.length - actifs > 1 ? "s" : ""} pour la preuve`}
              {" · "}
            </span>
          )}
          <span>
            {/* Le compte est celui du CATALOGUE, pas des titres déclarés ici
                (revue indépendante du 2026-10-24). */}
            {catalogue.length === 1
              ? actifs > 0 ? "un seul titre au catalogue" : "Un seul titre au catalogue"
              : `${catalogue.length} titres au catalogue`}
            , suivez par vos moyens habituels ceux qui n&apos;y figurent pas
            {equipe.length > 0 && " · "}
          </span>
          {equipe.length > 0 && (
            <TexteInformation
              texte={texteInformation({
                raisonSociale: etablissement.raisonDisplay,
                // Les titres RÉELLEMENT déclarés ici, jamais le catalogue : un
                // document d'information qui décrit un traitement qui n'a pas
                // lieu est faux, et il est remis à des personnes.
                titresSuivis: titresDeclares,
              })}
            />
          )}
        </footer>
      </div>
    </main>
  );
}
