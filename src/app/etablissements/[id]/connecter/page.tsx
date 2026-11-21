import Link from "next/link";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { BlocConfig } from "@/components/mcp/BlocConfig";
import { WhyCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { requireEtablissement } from "@/lib/auth/scope";
import { SurOrdinateur } from "@/components/layout/SurOrdinateur";
import { DETAIL_OUTIL_PRODUIT } from "@/components/mcp/outils-produit";
import { MESSAGE_CONNECTEUR_PRO } from "@/lib/abonnements/connecteur";
import { assistantsAutorises, connecteurOuvertPour } from "@/lib/connecteur/assistants";
import { OUTILS_COMPTE } from "@/lib/mcp/outils-compte";
import { ressourceMcp } from "@/lib/mcp/oauth";
import { formaterDateFr } from "@/lib/dates";
import { MESSAGE_URL_PUBLIQUE_ABSENTE, adressePubliqueOuNull } from "@/lib/url-publique";
import { retirerAssistantAction } from "./actions";

export const metadata = {
  title: "Connecter — Consulter votre dossier depuis un assistant",
};

/**
 * Les outils que le serveur sert à un porteur (`OUTILS_COMPTE`), décrits côté
 * produit. La liste et son nombre viennent du serveur : recopiés à la main,
 * ils avaient divergé (« Cinq outils » au-dessus de trois lignes).
 */
const OUTILS = OUTILS_COMPTE.map((o) => ({ nom: o.nom, titre: o.titre, detail: DETAIL_OUTIL_PRODUIT[o.nom] }));

const NOMBRE_EN_LETTRES = ["Aucun", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"];

const sourcil = "board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]";
const titreSection = "board-titre m-0 mt-1.5 text-[22px]";
const chapo = "m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]";
const titreBloc = "m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]";
const texteBloc = "m-0 mt-1.5 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]";

export default async function ConnecterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, compte } = await requireEtablissement(id);
  // ADR-062 : réservé à la formule Pro ; l'adresse n'est montrée qu'en Pro.
  const [ouvert, assistants] = await Promise.all([
    connecteurOuvertPour(compte.compteId),
    assistantsAutorises(user.id, compte.compteId),
  ]);
  const publique = adressePubliqueOuNull();
  const adresse = publique ? ressourceMcp(publique) : null;
  const retirer = retirerAssistantAction.bind(null, id);

  return (
    <main className="flex flex-1 flex-col">
      <EnTetePage
        item="connecter"
        description="Consultez vos dossiers depuis un assistant comme Claude, en lecture seule : il lit vos données, il ne peut rien y modifier."
      />

      <SurOrdinateur raison="La connexion se règle dans l'assistant : il faut y coller une adresse.">
        <div className="flex flex-1 flex-col gap-7 bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-7 pb-20">
          <section className="carte-board px-7 py-8 sm:px-8">
            <p className={sourcil}>Formule Pro</p>
            <h2 className="board-titre m-0 mt-2.5 max-w-[24ch] text-[22px]">
              Poser vos questions à un assistant, sur vos propres données
            </h2>
            <p className="m-0 mt-4 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-ink)]">
              Branchez Rojer à un assistant comme Claude, et demandez-lui « où en est mon DUERP ? » ou « quelles
              vérifications sont en retard ? » sans naviguer dans l&apos;application. L&apos;assistant lit, il
              n&apos;écrit jamais. Chaque personne du compte branche son propre assistant, avec son propre accès.
            </p>
            {ouvert ? null : (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <p className="m-0 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {MESSAGE_CONNECTEUR_PRO}
                </p>
                <Link
                  href="/compte/abonnement"
                  className="font-semibold text-[color:var(--board-blue-ink)] underline decoration-[color:var(--board-blue-soft)] underline-offset-4"
                >
                  Voir mon abonnement →
                </Link>
              </div>
            )}
          </section>

          {/* CE QUI SORT — la question à se poser avant de brancher */}
          <WhyCard
            charte="board"
            kicker="À savoir avant de brancher"
            titre="Ce que l'assistant lit sort de Rojer."
            enjeu="Les informations renvoyées par les outils sont envoyées à l'assistant que vous utilisez, et suivent alors ses propres règles de traitement et de conservation — pas celles de Rojer."
            tonalite="alerte"
          >
            <p className="m-0">
              C&apos;est votre décision : vous autorisez l&apos;assistant une fois, depuis Rojer, et vous pouvez
              retirer cet accès à tout moment, ci-dessous. Tant que vous ne branchez rien, rien ne sort.
            </p>
            <p className="m-0 mt-3">
              Cette page ne change rien au fonctionnement de Rojer :{" "}
              <strong>aucun contenu de votre dossier n&apos;est traité, reformulé ou classé par une IA</strong>{" "}dans
              l&apos;application. Vos documents restent produits par des règles déterministes, à partir de vos
              saisies. Ce qui est proposé ici est un accès en lecture depuis un outil extérieur, pas une
              fonctionnalité d&apos;analyse.
            </p>
          </WhyCard>

          {ouvert ? (
            <section>
              <header className="mb-4">
                <p className={sourcil}>Mise en place</p>
                <h2 className={titreSection}>Brancher l&apos;assistant</h2>
                <p className={chapo}>
                  Une adresse à coller, puis une connexion à Rojer depuis l&apos;assistant : vous vous identifiez avec
                  votre compte Rojer et vous autorisez l&apos;accès. Aucune clé à recopier.
                </p>
              </header>

              <div className="carte-board flex flex-col gap-7 px-7 py-6 sm:px-8">
                {adresse ? (
                  <>
                    <div>
                      <h3 className={titreBloc}>Claude (web, application de bureau, mobile)</h3>
                      <p className={`${texteBloc} mb-3.5`}>
                        Paramètres → Connecteurs → Ajouter un connecteur personnalisé. Nommez-le « Rojer », collez
                        cette adresse, puis cliquez sur Connecter : Claude vous envoie sur Rojer pour vous identifier
                        et autoriser l&apos;accès.
                      </p>
                      <BlocConfig titre="Adresse du connecteur" langue="url" contenu={adresse} />
                    </div>
                    <div>
                      <h3 className={titreBloc}>Claude Code</h3>
                      <p className={`${texteBloc} mb-3.5`}>
                        Dans un terminal, puis <code className="font-mono">/mcp</code> dans Claude Code pour vous
                        identifier.
                      </p>
                      <BlocConfig titre="Terminal" langue="shell" contenu={`claude mcp add --transport http rojer ${adresse}`} />
                    </div>
                    <p className="m-0 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      Pour vérifier, demandez à l&apos;assistant : « quels établissements suis-tu ? ». Il doit
                      répondre par les établissements de votre compte.
                    </p>
                  </>
                ) : (
                  <p className={texteBloc}>{MESSAGE_URL_PUBLIQUE_ABSENTE}</p>
                )}
              </div>
            </section>
          ) : null}

          <section>
            <header className="mb-4">
              <p className={sourcil}>Vos accès</p>
              <h2 className={titreSection}>Assistants autorisés</h2>
              <p className={chapo}>
                Ceux que vous avez autorisés sur ce compte. Retirer un assistant coupe son accès : il devra être
                autorisé de nouveau pour lire le dossier.
              </p>
            </header>
            {assistants.length === 0 ? (
              <p className="carte-board m-0 px-7 py-5 text-[13.5px] text-[color:var(--board-slate-mid)] sm:px-8">
                Aucun assistant autorisé pour l&apos;instant.
              </p>
            ) : (
              <ul className="carte-board m-0 list-none p-0">
                {assistants.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-5 border-t border-[color:var(--board-slate-line)] px-7 py-4 first:border-t-0 sm:px-8"
                  >
                    <div className="min-w-0">
                      <p className="m-0 text-[15px] font-semibold text-[color:var(--board-ink)]">{a.nom}</p>
                      {a.autoriseLe ? (
                        <p className="m-0 mt-0.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
                          Autorisé le {formaterDateFr(a.autoriseLe)}
                        </p>
                      ) : null}
                    </div>
                    <form action={retirer}>
                      <input type="hidden" name="consentement" value={a.id} />
                      <Button type="submit" variant="boardClair" size="board">
                        Retirer
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* CE QUI EST LISIBLE */}
          <section>
            <header className="mb-4">
              <p className={sourcil}>Périmètre</p>
              <h2 className={titreSection}>Ce que l&apos;assistant peut lire</h2>
              <p className={chapo}>
                {NOMBRE_EN_LETTRES[OUTILS.length] ?? OUTILS.length} outils, tous en lecture seule, limités aux
                établissements de votre compte. L&apos;assistant ne peut ni modifier une donnée, ni consulter le dossier
                d&apos;un autre compte.
              </p>
            </header>

            <ol className="carte-board m-0 list-none p-0">
              {OUTILS.map((outil, idx) => (
                <li
                  key={outil.nom}
                  className="flex items-start gap-5 border-t border-[color:var(--board-slate-line)] px-7 py-5 first:border-t-0 sm:px-8"
                >
                  <span className="shrink-0 font-mono text-[17px] tabular-nums text-[color:var(--board-slate-soft)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className={titreBloc}>{outil.titre}</h3>
                      <span className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                        {outil.nom}
                      </span>
                    </div>
                    <p className={texteBloc}>{outil.detail}</p>
                  </div>
                  {/* Le glacier, pas le vert : « lecture » dit un mode d'accès,
                      et le vert du board dit « fait ». */}
                  <span
                    aria-hidden
                    className="pastille-board shrink-0 bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                  >
                    lecture
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <footer className="border-t border-[color:var(--board-slate-line)] pt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Accès en lecture seule · les données lues quittent Rojer.{" "}
            <Link href={`/etablissements/${id}/guide`} className="text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]">
              Consulter le guide →
            </Link>
          </footer>
        </div>
      </SurOrdinateur>
    </main>
  );
}
