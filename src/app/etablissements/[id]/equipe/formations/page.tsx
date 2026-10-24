import Image from "next/image";
import Link from "next/link";
import { FilAriane } from "@/components/navigation/FilAriane";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import { LigneCompacte } from "@/components/etats-permanents/LigneCompacte";
import { RevueEnPlace } from "@/components/etats-permanents/RevueEnPlace";
import { OngletsEquipe } from "@/components/salaries/OngletsEquipe";
import { requireEtablissement } from "@/lib/auth/scope";
import { ancreEtatPermanent } from "@/lib/etats-permanents/ancre";
import {
  compteParLEquipe,
  formationsEnAttenteDeReponse,
  lignesFormationAffichees,
} from "@/lib/etats-permanents/par-l-equipe";
import { marquesAConfirmerDuRendu } from "@/lib/dashboard/queries";
import { registrePrudent, retenueParPrudence } from "@/lib/calendrier/prudence";
import { etatsPermanentsDuDossier } from "@/lib/etats-permanents/queries";
import { dessinDe, etatCourtDe, versFiche } from "@/lib/etats-permanents/vers-fiche";
import { lienPourRepondre } from "@/lib/etablissements/guide-par-module";
import { listerEcheancesAnnoncables } from "@/lib/calendrier/queries";
import { CHAMP_ETAT, ENCRE_ETAT, classerVerification, libelleEtatCourtCapitale } from "@/lib/calendrier/etats";
import { formaterDateFr } from "@/lib/dates";
import {
  fraicheurCalendrier,
  phraseFraicheur,
  SUJET_FORMATIONS_AU_CALENDRIER,
} from "@/lib/calendrier/fraicheur";
import { AvertissementFraicheur } from "@/components/calendrier/AvertissementFraicheur";
import { instantDuRendu } from "@/lib/dates/instant-du-rendu";
import { listerEquipe } from "@/lib/salaries/queries";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { chargerFaitsActivite } from "@/lib/etablissements/faits-activite-queries";
import { titresSansPorteur } from "@/lib/salaries/titres-sans-porteur";
import { dessinDuTitre } from "@/lib/salaries/illustration-titre";
import { listerQuandCaArrive } from "@/lib/quand-ca-arrive/lignes";
import { obligationParId } from "@/lib/referentiels/conformite";
import { estFormation } from "@/lib/referentiels/conformite/types";

export const metadata = {
  title: "Formations — Rojer",
};

/**
 * Équipe › Formations (décision de la propriétaire du 2026-10-24).
 *
 * Une VUE, sans stockage neuf : ce que le dossier doit en formation de ses
 * salariés, rassemblé depuis les lectures qui existent déjà, chacune filtrée
 * par la seule marque `estFormation` :
 *   1. à mettre en place — les états permanents marqués, qui ont quitté
 *      « Ce qui doit être en place » (`par-l-equipe.ts`), déclarés ici avec la
 *      même fiche ;
 *   2. au calendrier — les lignes datées, d'établissement comme de salarié ;
 *   3. quand un fait survient — les obligations événementielles, sans état ;
 *   4. les titres qui manquent aux personnes (ADR-043), renvoyés à leur fiche.
 *
 * La manutention se suit pour l'établissement, pas par personne (option
 * simple, décision du 2026-10-24) : la fiche le dit en sur-titre.
 */
export default async function FormationsEquipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, etablissement } = await requireEtablissement(id);
  const aujourdhui = instantDuRendu();
  // L'âge du calendrier, avec sa liste : un calendrier jamais calculé rendrait
  // une liste vide, lue comme « rien à prévoir » (`fraicheur-sorties.test.ts`).
  const [dossier, echeances, equipe, equipements, fraicheur, marques, faits] = await Promise.all([
    etatsPermanentsDuDossier(id, user.id),
    listerEcheancesAnnoncables(id, undefined),
    listerEquipe(id, aujourdhui),
    listerEquipementsDeLEtablissement(id),
    fraicheurCalendrier(id),
    // La prudence du calendrier (D26) : une ligne retenue faute de réponse
    // se dit « à confirmer », pas « en retard » — le même registre que la
    // page Calendrier vers laquelle on renvoie.
    marquesAConfirmerDuRendu(id),
    chargerFaitsActivite(id),
  ]);
  const prudence = retenueParPrudence(marques.parObligation);

  // 1. À mettre en place.
  const lignes = lignesFormationAffichees(dossier.parLEquipe);
  const enAttente = formationsEnAttenteDeReponse(dossier.parLEquipe);
  const compte = compteParLEquipe(lignes);
  const lignesFiche = lignes.map((l) =>
    versFiche(l, {
      etablissementId: id,
      entrepriseId: etablissement.entrepriseId,
      surTitre: l.parLesTitres
        ? "Formations · d'après les titres de vos salariés"
        : "Formations · à organiser pour l'établissement",
    }),
  );
  const phrasesAConfirmer = lignes.flatMap((l) => l.questionsSansReponse);

  // 2. Au calendrier.
  const datees = echeances
    .filter((v) => {
      const o = obligationParId(v.obligationId);
      return o !== undefined && estFormation(o);
    })
    .map((v) => ({ v, etat: registrePrudent(classerVerification(v, aujourdhui), v, prudence) }))
    .filter(({ etat }) => etat !== "archivee" && etat !== "faite");

  // 3. Quand un fait survient.
  const evenementielles = listerQuandCaArrive(
    etablissement,
    equipements.map((eq) => ({
      id: eq.id,
      libelle: eq.libelle,
      categorie: eq.categorie,
      caracteristiques: (eq.caracteristiques ?? null) as Record<string, unknown> | null,
    })),
  )
    .flatMap((g) => g.lignes)
    .filter((l) => estFormation(l.obligation));

  // 4. Les titres de formation qui manquent aux personnes.
  const manques = equipe.flatMap((s) =>
    s.manques
      .filter((m) => {
        const o = obligationParId(m.obligationId);
        return o !== undefined && estFormation(o);
      })
      .map((m) => ({ ...m, salarie: s })),
  );

  // 5. Ce que le DUERP signale et que personne ne porte (décision de la
  // propriétaire du 2026-10-24) : « oui » à la conduite d'engins, et aucun
  // salarié présent n'a de formation à la conduite déclarée. Rojer ne sait
  // pas qui conduit — il ne sait que personne ne l'est.
  const detenus = new Set(
    equipe.filter((s) => s.actif).flatMap((s) => s.titres.map((t) => t.obligationId)),
  );
  const sansPorteur = faits ? titresSansPorteur(faits, detenus) : [];

  const rien =
    sansPorteur.length === 0 &&
    lignes.length === 0 && datees.length === 0 && evenementielles.length === 0 && manques.length === 0;

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <FilAriane
          crumbs={[
            { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
            { href: `/etablissements/${id}/equipe`, label: LABEL_ITEM.equipe },
            { label: "Formations" },
          ]}
        />
        <h1 className="board-titre m-0 text-[clamp(22px,2.2vw,27px)]">Équipe</h1>
        <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Les formations que le Code du travail rend dues à vos salariés : celles
          à mettre en place, celles qui reviennent au calendrier, celles qu&apos;un
          événement déclenche, et les titres qui manquent à une personne.
        </p>
        <div className="mt-5">
          <OngletsEquipe etablissementId={id} actif="formations" aDeclarer={compte.total - compte.enPlace} />
        </div>
      </header>

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        <AvertissementFraicheur
          phrase={phraseFraicheur(fraicheur, SUJET_FORMATIONS_AU_CALENDRIER)}
          hrefCalendrier={`/etablissements/${id}/calendrier`}
        />
        {/* Les réponses qui décident des formations restent modifiables d'ici
            (revue du 2026-10-24) : le bloc d'Équipe disparaît une fois tout
            répondu. */}
        <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
          {enAttente > 0
            ? `${enAttente === 1 ? "Une formation peut s'ajouter" : `${enAttente} formations peuvent s'ajouter`} selon vos réponses sur le travail de vos salariés. `
            : "Vos réponses sur le travail de vos salariés décident de ces formations. "}
          <Link
            href={`/etablissements/${id}/equipe/risques`}
            className="font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
          >
            {enAttente > 0 ? "Répondre aux questions" : "Revoir vos réponses"}
          </Link>
        </p>
        {rien ? (
          <section className="carte-board px-7 py-8 sm:px-8">
            <h2 className="board-titre m-0 text-[22px]">Aucune formation pour ce dossier</h2>
            <p className="m-0 mt-3 max-w-[600px] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Parmi les obligations que Rojer suit pour votre établissement, aucune
              formation n&apos;est due pour l&apos;instant. Vos réponses sur le
              travail de vos salariés peuvent en faire apparaître.
            </p>
          </section>
        ) : null}

        {sansPorteur.length > 0 && (
          // L'ambre, pas le rose : rien ici n'a d'échéance passée, c'est un
          // titre que personne ne porte (charte, interdits 3 et 4).
          <section className="rounded-[30px] bg-[color:var(--board-amber-wash)] px-7 py-6 shadow-[inset_0_0_0_1px_var(--board-amber)] sm:px-8">
            <h2 className="board-titre m-0 text-[20px]">
              Votre DUERP le signale, personne n&apos;a le titre
            </h2>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Rojer ne sait pas qui, dans l&apos;équipe, fait la tâche. Il sait
              seulement qu&apos;aucune personne présente n&apos;a ce titre
              déclaré. Déclarez-le sur la fiche de qui est concerné, depuis
              « Ajouter un titre ».
            </p>
            <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
              {sansPorteur.map((f) => (
                <li key={f.champ} className="flex gap-4 rounded-[22px] bg-[color:var(--board-card)] px-5 py-4">
                  {(() => {
                    const d = dessinDuTitre(f.titres[0].obligation.id);
                    return (
                      <span
                        aria-hidden
                        className="grid size-[52px] flex-none place-items-center rounded-[18px]"
                        style={{ background: d.fond }}
                      >
                        <Image src={d.src} alt="" width={40} height={40} />
                      </span>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                  <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
                    Vous avez répondu oui : « {f.question} »{" "}
                    <Link
                      href={`/etablissements/${id}/equipe/risques#${f.champ}`}
                      className="font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
                    >
                      Modifier la réponse
                    </Link>
                  </p>
                  <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0">
                    {f.titres.map((t) => (
                      <li key={t.obligation.id}>
                        <p className="m-0 text-[14px] font-semibold text-[color:var(--board-ink)]">
                          {t.obligation.libelle}
                        </p>
                        {t.condition && (
                          <p className="m-0 mt-0.5 max-w-[68ch] text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                            {/^ils? /.test(t.condition) ? "Dû s'" : "Dû si "}
                            {t.condition}.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/etablissements/${id}/equipe`}
                    className="mt-3 inline-block text-[12.5px] font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
                  >
                    Choisir la personne dans l&apos;équipe
                  </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {lignes.length > 0 && (
          <RevueEnPlace etablissementId={id} lignes={lignesFiche} parcours={false}>
            <section className="carte-board px-7 py-6 sm:px-8">
              <h2 className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                À mettre en place
              </h2>
              <p className="m-0 mt-2 text-[13px] text-[color:var(--board-slate-mid)]">
                {compte.enPlace} sur {compte.total} déclarées. Touchez une ligne pour la déclarer.
              </p>
              <ul className="m-0 mt-3 grid list-none gap-1.5 p-0 sm:grid-cols-2">
                {lignes.map((l) => (
                  <LigneCompacte
                    key={l.obligation.id}
                    obligationId={l.obligation.id}
                    ancre={ancreEtatPermanent(l.obligation.id)}
                    libelle={l.obligation.libelle}
                    {...dessinDe(l)}
                    etat={etatCourtDe(l)}
                    aConfirmer={l.aConfirmer !== null || l.questionsSansReponse.length > 0}
                  />
                ))}
              </ul>
              {phrasesAConfirmer.length > 0 && (
                <p className="m-0 mt-3 text-[12.5px] text-[color:var(--board-slate-mid)]">
                  Certaines lignes sont à confirmer : une question reste sans réponse.{" "}
                  {(() => {
                    const lien = lienPourRepondre(phrasesAConfirmer, id);
                    return (
                      <Link href={lien.href} className="font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4">
                        {lien.libelle}
                      </Link>
                    );
                  })()}
                </p>
              )}
            </section>
          </RevueEnPlace>
        )}

        {datees.length > 0 && (
          <section className="carte-board px-7 py-6 sm:px-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                Au calendrier
              </h2>
              <Link
                href={`/etablissements/${id}/calendrier?formation=1`}
                className="text-[12.5px] font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
              >
                Voir au calendrier
              </Link>
            </div>
            <ul className="m-0 mt-3 flex list-none flex-col p-0">
              {datees.map(({ v, etat }) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--board-slate-line)] py-3 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] font-medium text-[color:var(--board-ink)]">
                      {v.libelleObligation}
                    </p>
                    <p className="m-0 mt-0.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
                      {v.salarie
                        ? `${v.salarie.prenom} ${v.salarie.nom}`
                        : "Pour l'établissement"}
                      {etat !== "aPlanifier" ? ` · ${formaterDateFr(v.datePrevue)}` : ""}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold"
                    style={{ background: CHAMP_ETAT[etat], color: ENCRE_ETAT[etat] }}
                  >
                    {libelleEtatCourtCapitale(etat)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {manques.length > 0 && (
          <section className="carte-board px-7 py-6 sm:px-8">
            <h2 className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Titres à déclarer
            </h2>
            <ul className="m-0 mt-3 flex list-none flex-col p-0">
              {manques.map((m) => (
                <li
                  key={`${m.salarie.id}-${m.obligationId}`}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--board-slate-line)] py-3 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] font-medium text-[color:var(--board-ink)]">{m.libelle}</p>
                    <p className="m-0 mt-0.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
                      {m.salarie.prenom} {m.salarie.nom}
                    </p>
                  </div>
                  <Link
                    href={`/etablissements/${id}/equipe/${m.salarie.id}`}
                    className="text-[12.5px] font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
                  >
                    Ouvrir la fiche
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {evenementielles.length > 0 && (
          <section className="carte-board px-7 py-6 sm:px-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                Quand un événement survient
              </h2>
              <Link
                href={`/etablissements/${id}/etats-permanents/en-cas-de`}
                className="text-[12.5px] font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
              >
                Voir « En cas de… »
              </Link>
            </div>
            <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
              {evenementielles.map((l) => (
                <li key={l.obligation.id} className="text-[13.5px] leading-[1.45] text-[color:var(--board-ink)]">
                  <span className="font-semibold">{l.quand}</span>
                  <span className="text-[color:var(--board-slate-mid)]"> → </span>
                  {l.quoi}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
