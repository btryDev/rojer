import { AppTopbar } from "@/components/layout/AppTopbar";
import {
  LegalBadge,
  PastilleFiche,
  StatusPill,
  WhyCard,
} from "@/components/ui-kit";
import { AjoutPointReleveForm } from "@/components/carnet-sanitaire/AjoutPointReleveForm";
import { AjoutReleveForm } from "@/components/carnet-sanitaire/AjoutReleveForm";
import { AjoutAnalyseForm } from "@/components/carnet-sanitaire/AjoutAnalyseForm";
import { GraphTemperatures } from "@/components/carnet-sanitaire/GraphTemperatures";
import { requireEtablissement } from "@/lib/auth/scope";
import { getCarnetSanitaire } from "@/lib/carnet-sanitaire/queries";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";
import {
  LABEL_RESEAU,
  SEUIL_LEGIONELLE_UFC_PAR_L,
} from "@/lib/carnet-sanitaire/schema";
import { formaterDateCourteFr } from "@/lib/dates";

export const metadata = {
  title: "Carnet sanitaire eau",
};

function formatDate(d: Date): string {
  return formaterDateCourteFr(d);
}

export default async function CarnetSanitairePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  const carnet = await getCarnetSanitaire(id);
  const batiments = await listerBatimentsDeLEtablissement(id);

  const nbPoints = carnet?.pointsReleve.length ?? 0;
  const nbReleves =
    carnet?.pointsReleve.reduce((acc, p) => acc + p.releves.length, 0) ?? 0;
  const releveDernier = carnet?.pointsReleve
    .flatMap((p) => p.releves)
    .sort((a, b) => b.dateReleve.getTime() - a.dateReleve.getTime())[0];

  const derniereAnalyse = carnet?.analyses[0];

  return (
    <>
      <AppTopbar
        title="Carnet sanitaire eau"
        subtitle="Surveillance des légionelles — due aux établissements recevant du public dont l'eau chaude collective alimente des points d'usage à risque."
        crumbs={[
          { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
          { label: "Carnet sanitaire" },
        ]}
      />

      {/* Écran d'application plein : la gouttière règle la largeur utile,
          pas un `max-w-*` centré (charte § 5). */}
      <main className="flex flex-1 flex-col gap-7 bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-7 pb-20">
        {/* Why */}
        <WhyCard
          charte="board"
          kicker="Pourquoi ce carnet"
          titre="Légionellose — risque mortel, risque contrôlable."
          enjeu="Les légionelles se développent dans les réseaux d'eau chaude sanitaire mal tenus en température. Ce carnet garde la trace de vos relevés et de vos analyses : c'est le « fichier sanitaire des installations » que l'arrêté fait tenir à la disposition de l'agence régionale de santé."
          tonalite="info"
        >
          {/* « Obligatoire pour tout établissement avec ECS » A VÉCU ICI JUSQU'AU
              2026-09-20, et c'était faux trois fois : l'arrêté ne vise ni un
              établissement de travail seul, ni une installation individuelle,
              ni un réseau sans point d'usage à risque. Les mots sont ceux
              des articles 1er et 2 (`corpus/arrete-2010-02-01-legionelles.ts`).
              Le produit ne détient aucun des deux faits qui décident — le
              caractère collectif de l'installation, la présence d'un point
              d'usage à risque — : il DIT le champ, il ne tranche pas pour le
              dirigeant. Et il dit ce qu'il FAIT, en clair et non en
              commentaire : c'est l'adresse (`declareA`) des entrées
              `non_couvert` du corpus. */}
          <p className="m-0 mt-3 max-w-[72ch] text-[13px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            <strong>Êtes-vous concerné ?</strong>{" "}
            L&apos;arrêté du 1er février
            2010 vise les « installations collectives de production, de
            stockage et de distribution d&apos;eau chaude sanitaire qui
            alimentent des points d&apos;usage à risque » dans les
            établissements recevant du public (art. 1er), un point d&apos;usage
            à risque étant « tout point d&apos;usage accessible au public et
            pouvant produire des aérosols d&apos;eau chaude sanitaire
            susceptible d&apos;être contaminée par les légionelles ; il
            s&apos;agit notamment des douches, des douchettes, des bains à
            remous ou à jets » (art. 2). Pour les établissements autres que de
            santé, son annexe 2 fixe au minimum un relevé de température par
            mois et une analyse de légionelles par an, à chaque point de
            surveillance. Rojer ne sait pas si c&apos;est votre cas, et ne le
            décide pas à votre place : il n&apos;inscrit rien à votre
            calendrier tant que vous n&apos;avez pas ouvert de carnet, puis
            vous rappelle l&apos;analyse suivante un an après la dernière
            saisie.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {/* L'extrait affiché ici était FABRIQUÉ : ni « bonne
                surveillance », ni « carnet sanitaire », ni « toutes les
                opérations réalisées » ne figurent dans l'arrêté. Il
                reformulait le texte avec le vocabulaire du produit, entre
                guillemets, sous une prop documentée « cité textuellement ».
                Personne ne pouvait le voir : l'URL d'à côté ne rendait aucun
                contenu, donc la citation ne pouvait être confrontée à rien.
                C'est en réparant le lien que le faux est apparu.
                Verbatim de l'article 3, version en vigueur au 2023-01-01,
                relevé le 2026-08-28. */}
            <LegalBadge
              charte="board"
              reference="Arrêté du 1er février 2010, art. 3"
              href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000021795143/"
              extrait="Le responsable des installations assure la traçabilité de cette surveillance. Il consigne les modalités et les résultats de cette surveillance avec les éléments descriptifs des réseaux d'eau chaude sanitaire et ceux relatifs à leur maintenance dans un fichier sanitaire des installations, qui est tenu à disposition du directeur général de l'agence régionale de santé."
            >
              <p>
                Le texte dit <strong>« fichier sanitaire des installations »</strong>.
                « Carnet sanitaire » est le nom que cet outil donne à son
                module, pas celui de l&apos;arrêté — et le destinataire du
                fichier est l&apos;ARS.
              </p>
            </LegalBadge>
            {/* ICI SE TENAIT « Art. R. 1321-23 CSP », ET IL EST PARTI LE
                2026-09-02. Ouvert à la source ce jour-là
                (`referentiels/corpus/csp-eau-potable.ts`), l'article ne
                s'adresse pas au dirigeant : son destinataire est la
                « personne responsable de la production ou de la distribution
                d'eau », c'est-à-dire l'exploitant du réseau PUBLIC au sens du
                1° de R. 1321-43. Un restaurant, un commerce ou un bureau
                raccordé à ce réseau tient un réseau INTÉRIEUR (3° du même
                article) et n'est pas cette personne.

                CE QUI A PRODUIT LA CITATION EST UN HOMONYME, et il vaut d'être
                nommé pour que le détour ne se refasse pas : le 3° de cet
                article impose « un fichier sanitaire » — le recueil des
                analyses de qualité de l'eau distribuée —, quand l'arrêté du
                1er février 2010 affiché juste au-dessus impose « un fichier
                sanitaire DES INSTALLATIONS », qui consigne les températures et
                les légionelles des réseaux d'eau chaude du bâtiment. Deux
                documents, deux destinataires. C'est le second que ce module
                sert, et son verbatim est déjà sur cet écran : l'écran ne perd
                rien.

                LA RÉSERVE, QUI NE CHANGE PAS LA DÉCISION. Un établissement
                alimenté par sa PROPRE ressource — puits, forage — devient la
                personne responsable de la production, et l'article lui est
                alors pleinement opposable. Le produit ne détient aucun
                attribut disant d'où vient l'eau : le badge était donc affiché
                à tous, c'est-à-dire à raison pour une minorité qu'on ne sait
                pas identifier et à tort pour tous les autres. Et même pour
                celle-là il ne servait rien — un numéro sans extrait ni
                destinataire, sur un module qui traite les légionelles, pas la
                qualité de l'eau produite. Servir ce cas suppose de savoir
                d'où vient l'eau ; c'est un attribut, donc une migration, et
                la question reste ouverte au corpus. */}
          </div>
        </WhyCard>

        {/* Résumé — quatre chiffres dans une seule carte. Le filet vertical
            qui les sépare est plein : le board n'a pas de pointillé, il
            sépare par un trait ou pas du tout. */}
        {carnet && (
          <div className="carte-board grid grid-cols-2 divide-x divide-[color:var(--board-slate-line)] sm:grid-cols-4">
            <Stat label="Points de relevé" value={nbPoints} />
            <Stat label="Relevés enregistrés" value={nbReleves} />
            <Stat
              label="Dernier relevé"
              value={releveDernier ? formatDate(releveDernier.dateReleve) : "—"}
              mono
            />
            <Stat
              label="Dernière analyse légionelle"
              value={
                derniereAnalyse
                  ? formatDate(derniereAnalyse.dateAnalyse)
                  : "—"
              }
              mono
              mention={
                derniereAnalyse?.conforme === false ? "Écart relevé" : undefined
              }
            />
          </div>
        )}

        {/* Points de relevé */}
        <section className="flex flex-col gap-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                01 · Points de relevé
              </p>
              <h2 className="board-titre m-0 mt-1.5 text-[22px]">
                Vos installations
              </h2>
              <p className="m-0 mt-1.5 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Déclarez chaque point où vous mesurez la température (points de
                puisage les plus éloignés du ballon, points sensibles).
              </p>
            </div>
            <AjoutPointReleveForm etablissementId={id} batiments={batiments} />
          </header>

          {!carnet || nbPoints === 0 ? (
            <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-6 text-center">
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Aucun point de relevé configuré. Commencez par ajouter vos
                principaux points de puisage pour démarrer le suivi.
              </p>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-5 p-0">
              {carnet.pointsReleve.map((p) => {
                const dernier = p.releves[0] ?? null;
                const tempActuelle = dernier?.temperatureCelsius ?? null;
                const dansLaPlage = dernier?.conforme ?? null;
                return (
                  <li key={p.id} className="carte-board">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-7 pb-3 pt-6 sm:px-8">
                      <div>
                        <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                          {p.nom}
                        </p>
                        <p className="board-eyebrow m-0 mt-1 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                          {LABEL_RESEAU[p.typeReseau]}
                          {p.localisation && ` · ${p.localisation}`}
                          {" · seuil "}
                          {p.typeReseau === "EFS" ? "max" : "min"}{" "}
                          {p.seuilMinCelsius}°C
                        </p>
                        {/* Qui a relevé, et quand. Le formulaire demande ce
                            nom depuis toujours ; jusqu'au 2026-08-28 son seul
                            lecteur était l'export ZIP remis à un tiers — d'où
                            il a été retiré, aucun texte ne l'exigeant. Le
                            champ s'est alors retrouvé collecté sans finalité,
                            ce qui tient plus mal sous la minimisation que
                            l'usage interne auquel il était destiné. Il le
                            retrouve ici : l'exploitant sait à qui demander
                            quand une mesure surprend. Le nom ne ressort
                            toujours pas de l'établissement. */}
                        {dernier && (
                          <p className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                            Dernier relevé le {formatDate(dernier.dateReleve)}
                            {dernier.operateur
                              ? ` · par ${dernier.operateur}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {tempActuelle !== null && (
                          <div className="flex flex-col items-end gap-1.5">
                            {/* Rien ne peint « dans la plage » : le board n'a
                                pas de couleur qui veuille dire « conforme »,
                                et une mesure attendue n'est pas un fait
                                accompli. La mesure porte l'encre courante ;
                                seul l'écart prend le signal. */}
                            <p
                              className="m-0 font-mono text-[22px] font-semibold tabular-nums"
                              style={{
                                color: dansLaPlage
                                  ? "var(--board-ink)"
                                  : "var(--board-signal-ink)",
                              }}
                            >
                              {tempActuelle.toFixed(1)}°
                            </p>
                            <StatusPill
                              charte="board"
                              size="sm"
                              status={dansLaPlage ? "a_jour" : "non_conforme"}
                              label={dansLaPlage ? "Dans la plage" : undefined}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-7 pb-5 sm:px-8">
                      <GraphTemperatures
                        releves={p.releves}
                        seuilMinCelsius={p.seuilMinCelsius}
                        typeReseau={p.typeReseau}
                      />
                    </div>

                    <div className="border-t border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
                      <AjoutReleveForm
                        etablissementId={id}
                        pointReleveId={p.id}
                        seuilMinCelsius={p.seuilMinCelsius}
                        typeReseau={p.typeReseau}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Analyses légionelles */}
        <section className="flex flex-col gap-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                02 · Analyses légionelles
              </p>
              <h2 className="board-titre m-0 mt-1.5 text-[22px]">
                Prélèvements et résultats laboratoire
              </h2>
              <p className="m-0 mt-1.5 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                L&apos;arrêté du 1er février 2010 fixe au minimum une analyse par
                an et par point de surveillance (annexes 1 et 2).
              </p>
            </div>
            <AjoutAnalyseForm etablissementId={id} />
          </header>

          {!carnet || carnet.analyses.length === 0 ? (
            <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-6 text-center">
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Aucune analyse enregistrée. Conservez les rapports de
                laboratoire pour pouvoir les présenter en cas de contrôle.
              </p>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {carnet.analyses.map((a) => (
                <li key={a.id} className="carte-board px-7 py-6 sm:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                        Analyse du {formatDate(a.dateAnalyse)}
                        {a.laboratoire && (
                          <span className="font-normal text-[color:var(--board-slate-mid)]">
                            {" "}
                            · {a.laboratoire}
                          </span>
                        )}
                      </p>
                      {a.commentaire && (
                        <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                          {a.commentaire}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {a.valeurUfcParL !== null && (
                        <p
                          className="m-0 font-mono text-[22px] font-semibold tabular-nums"
                          style={{
                            color: a.conforme
                              ? "var(--board-ink)"
                              : "var(--board-signal-ink)",
                          }}
                        >
                          {/* nombre, pas une date : séparateurs de milliers */}
                          {a.valeurUfcParL.toLocaleString("fr-FR")}
                          <span className="ml-1 text-[11px] font-medium text-[color:var(--board-slate-mid)]">
                            UFC/L
                          </span>
                        </p>
                      )}
                      <StatusPill
                        charte="board"
                        size="sm"
                        status={a.conforme ? "a_jour" : "non_conforme"}
                        label={
                          a.conforme
                            ? `< ${SEUIL_LEGIONELLE_UFC_PAR_L} UFC/L`
                            : `≥ ${SEUIL_LEGIONELLE_UFC_PAR_L} UFC/L — action`
                        }
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  mono = false,
  mention,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  /** Ce que le chiffre appelle, en toutes lettres. Le papier ne peignait
   *  que la valeur en rouge ; une signalétique qui tient à une couleur
   *  disparaît en niveaux de gris et pour qui n'y voit pas (interdit 10). */
  mention?: string;
}) {
  return (
    <div className="px-6 py-5">
      <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {label}
      </p>
      <p
        className={
          (mono
            ? "m-0 mt-1.5 font-mono text-[15px] "
            : "m-0 mt-1.5 text-[24px] ") +
          "font-semibold tabular-nums"
        }
        style={{
          color: mention ? "var(--board-signal-ink)" : "var(--board-ink)",
        }}
      >
        {value}
      </p>
      {mention && (
        <div className="mt-2">
          <PastilleFiche ton="retard">{mention}</PastilleFiche>
        </div>
      )}
    </div>
  );
}
