import { AppTopbar } from "@/components/layout/AppTopbar";
import { DemandeAide } from "@/components/assistance/DemandeAide";
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
import { InvitationTypePoint } from "@/components/carnet-sanitaire/InvitationTypePoint";
import { requireEtablissement } from "@/lib/auth/scope";
import { getCarnetSanitaire } from "@/lib/carnet-sanitaire/queries";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";
import {
  LABEL_RESEAU,
  LABEL_TYPE_POINT,
  libelleSeuils,
  SEUIL_LEGIONELLE_UFC_PAR_L,
  resultatAnalyse,
} from "@/lib/carnet-sanitaire/schema";
import { cleJourCivil, formaterDateCourteFr } from "@/lib/dates";
import { BoutonRetirer } from "@/components/carnet-sanitaire/BoutonRetirer";
import {
  ceQueRojerFait,
  ENJEU_CARNET,
  quiEstVise,
} from "@/components/carnet-sanitaire/textes";
import { eauChaudeSuivieParLeCalendrier } from "@/lib/carnet-sanitaire/suivi-calendrier";
import { formaterMesure, formaterNombreFr } from "@/lib/rendu/mesures";
import { etatDernierReleve, libelleReleveAncien } from "@/lib/carnet-sanitaire/etat-releve";
import {
  supprimerAnalyseLegionelle,
  supprimerPointReleve,
  supprimerReleve,
} from "@/lib/carnet-sanitaire/actions";

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
  const { user, etablissement } = await requireEtablissement(id);
  // 2026-10-17, sous-lot F : l'installation déclarée au parc fait porter la
  // surveillance par le calendrier — la page le dit (`ceQueRojerFait`).
  const installationDeclaree = await eauChaudeSuivieParLeCalendrier({
    etablissementId: etablissement.id,
    etablissement: { entreprise: { userId: user.id } },
  });
  const carnet = await getCarnetSanitaire(id);
  const batiments = await listerBatimentsDeLEtablissement(id);
  const now = new Date();

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
          enjeu={ENJEU_CARNET}
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
            surveillance.{" "}
            {quiEstVise(etablissement.estERP, installationDeclaree)}{" "}
            {ceQueRojerFait(etablissement.estERP, installationDeclaree)}
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
                !derniereAnalyse
                  ? undefined
                  : resultatAnalyse(derniereAnalyse.valeurUfcParL) === "limite_atteinte"
                    ? "Écart relevé"
                    : resultatAnalyse(derniereAnalyse.valeurUfcParL) === "sans_valeur"
                      ? "Valeur non saisie"
                      : undefined
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
                // L'âge du relevé avant sa valeur : une mesure de plus d'un
                // mois ne s'affiche jamais « dans la plage » (contrôle
                // visuel du 2026-10-13, `etat-releve.ts`).
                const etat = etatDernierReleve(dernier, now);
                return (
                  <li key={p.id} className="carte-board">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-7 pb-3 pt-6 sm:px-8">
                      <div>
                        <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                          {p.nom}
                        </p>
                        <p className="board-eyebrow m-0 mt-1 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                          {p.typePoint ? LABEL_TYPE_POINT[p.typePoint] : LABEL_RESEAU[p.typeReseau]}
                          {p.localisation && ` · ${p.localisation}`}
                          {" · "}
                          {libelleSeuils(p, (c) => formaterMesure(c, "°C", 0, 1))}
                        </p>
                        <InvitationTypePoint typePoint={p.typePoint} />
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
                                // L'écart reste visible sur un relevé ancien :
                                // c'est un fait de cette mesure, que la
                                // pastille d'âge ne doit pas effacer.
                                color:
                                  dernier?.conforme === false
                                    ? "var(--board-signal-ink)"
                                    : "var(--board-ink)",
                              }}
                            >
                              {formaterMesure(tempActuelle, "°C", 1)}
                            </p>
                            {etat.nature === "ancien" ? (
                              <StatusPill
                                charte="board"
                                size="sm"
                                status="non_applicable"
                                label={libelleReleveAncien(etat.joursDepuis)}
                              />
                            ) : etat.nature !== "sansReleve" ? (
                              <StatusPill
                                charte="board"
                                size="sm"
                                status={etat.nature === "dansLaPlage" ? "a_jour" : "non_conforme"}
                                label={etat.nature === "dansLaPlage" ? "Dans la plage" : undefined}
                              />
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-7 pb-5 sm:px-8">
                      <GraphTemperatures
                        releves={p.releves}
                        seuilMinCelsius={p.seuilMinCelsius}
                        seuilMaxCelsius={p.seuilMaxCelsius}
                      />
                    </div>

                    <div className="border-t border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
                      <AjoutReleveForm
                        etablissementId={id}
                        pointReleveId={p.id}
                        seuilMinCelsius={p.seuilMinCelsius}
                        seuilMaxCelsius={p.seuilMaxCelsius}
                      />
                    </div>

                    {/* Corriger (2026-10-12, audit des modules, B6) : aucune
                        saisie du carnet ne se corrigeait, et un point jamais
                        relevé bloquait « À jour » au tableau de bord pour
                        toujours. Les relevés listés sont ceux du graphique. */}
                    {p.releves.length > 0 && (
                      <details className="border-t border-[color:var(--board-slate-line)] px-7 py-4 sm:px-8">
                        <summary className="cursor-pointer text-[12.5px] font-medium text-[color:var(--board-slate-mid)]">
                          Relevés du graphique ({p.releves.length}) : corriger, supprimer
                        </summary>
                        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                          {p.releves.map((r) => (
                            <li
                              key={r.id}
                              className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-[color:var(--board-slate-ink)]"
                            >
                              <span className="font-mono tabular-nums">
                                {formatDate(r.dateReleve)} · {formaterMesure(r.temperatureCelsius, "°C", 1)}
                              </span>
                              <AjoutReleveForm
                                etablissementId={id}
                                pointReleveId={p.id}
                                seuilMinCelsius={p.seuilMinCelsius}
                                seuilMaxCelsius={p.seuilMaxCelsius}
                                releve={{
                                  id: r.id,
                                  dateReleve: cleJourCivil(r.dateReleve),
                                  temperatureCelsius: r.temperatureCelsius,
                                  operateur: r.operateur,
                                  commentaire: r.commentaire,
                                }}
                              />
                              <BoutonRetirer
                                libelle="Supprimer"
                                titre={`Supprimer le relevé du ${formatDate(r.dateReleve)} ?`}
                                detail="La mesure quitte le carnet, le graphique, le tableau de bord et l'export de contrôle. Les autres relevés du point restent."
                                agir="Supprimer le relevé"
                                action={supprimerReleve.bind(null, id, r.id)}
                              />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    <div className="flex flex-wrap items-start gap-x-5 gap-y-2 border-t border-[color:var(--board-slate-line)] px-7 py-4 sm:px-8">
                      <AjoutPointReleveForm
                        etablissementId={id}
                        batiments={batiments}
                        point={{
                          id: p.id,
                          nom: p.nom,
                          localisation: p.localisation,
                          batimentId: p.batimentId,
                          typeReseau: p.typeReseau,
                          typePoint: p.typePoint,
                          seuilMinCelsius: p.seuilMinCelsius,
                          seuilMaxCelsius: p.seuilMaxCelsius,
                        }}
                      />
                      <BoutonRetirer
                        libelle="Retirer ce point"
                        titre={`Retirer le point « ${p.nom} » du carnet ?`}
                        detail="Le point ne compte plus au tableau de bord ni dans l'export de contrôle, et ses relevés ne s'affichent plus. Ils restent enregistrés en base."
                        agir="Retirer le point"
                        action={supprimerPointReleve.bind(null, id, p.id)}
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

          {/* La dernière analyse dépasse le seuil : un risque sanitaire, et
              une intervention qu'aucun écran ne fait (2026-10-24). */}
          {derniereAnalyse && resultatAnalyse(derniereAnalyse.valeurUfcParL) === "limite_atteinte" ? (
            <DemandeAide
              variante="encart"
              accroche="Seuil de légionelles atteint : faites-vous accompagner pour le diagnostic du réseau et les mesures à prendre."
              libelle="Être accompagné"
              categorie="diagnostic"
              contexte="Analyse légionelles au-dessus du seuil"
              etablissementId={id}
            />
          ) : null}

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
                      {/* Le rapport de laboratoire déposé, rouvert par sa route
                          (2026-09-27) : il s'écrivait et ne se relisait nulle part. */}
                      {a.rapportCle && (
                        <a
                          href={`/api/analyses-legionelles/${a.id}/rapport`}
                          target="_blank"
                          rel="noopener"
                          className="mt-2 inline-block text-[12.5px] font-medium text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline"
                        >
                          Ouvrir le rapport
                          {a.rapportNom ? ` (${a.rapportNom})` : ""}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {a.valeurUfcParL !== null && (
                        <p
                          className="m-0 font-mono text-[22px] font-semibold tabular-nums"
                          style={{
                            color:
                              resultatAnalyse(a.valeurUfcParL) === "limite_atteinte"
                                ? "var(--board-signal-ink)"
                                : "var(--board-ink)",
                          }}
                        >
                          {/* nombre, pas une date : séparateurs de milliers */}
                          {formaterNombreFr(a.valeurUfcParL)}
                          {/* L'espace est dans le TEXTE, insécable : une
                              marge CSS (`ml-1`) la montrait sans l'écrire, et
                              « 320UFC/L » ressortait à la copie comme à la
                              lecture d'écran (contrôle visuel du 2026-10-13).
                              Littérale et non `ESPACE_UNITE` : le balayage des
                              espaces avalées ne lit que les littéraux. */}
                          {"\u00A0"}
                          <span className="text-[11px] font-medium text-[color:var(--board-slate-mid)]">
                            UFC/L
                          </span>
                        </p>
                      )}
                      <StatusPill
                        charte="board"
                        size="sm"
                        status={
                          {
                            sous_limite: "a_jour",
                            limite_atteinte: "non_conforme",
                            sans_valeur: "non_applicable",
                          }[resultatAnalyse(a.valeurUfcParL)] as "a_jour" | "non_conforme" | "non_applicable"
                        }
                        label={
                          {
                            sous_limite: `< ${formaterMesure(SEUIL_LEGIONELLE_UFC_PAR_L, "UFC/L")}`,
                            limite_atteinte: `≥ ${formaterMesure(SEUIL_LEGIONELLE_UFC_PAR_L, "UFC/L")} — action`,
                            sans_valeur: "Valeur non saisie",
                          }[resultatAnalyse(a.valeurUfcParL)]
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-start gap-x-5 gap-y-2 border-t border-[color:var(--board-slate-line)] pt-4">
                    <AjoutAnalyseForm
                      etablissementId={id}
                      analyse={{
                        id: a.id,
                        dateAnalyse: cleJourCivil(a.dateAnalyse),
                        laboratoire: a.laboratoire,
                        valeurUfcParL: a.valeurUfcParL,
                        commentaire: a.commentaire,
                        rapportNom: a.rapportCle ? (a.rapportNom ?? "déposé") : null,
                      }}
                    />
                    <BoutonRetirer
                      libelle="Supprimer"
                      titre={`Supprimer l'analyse du ${formatDate(a.dateAnalyse)} ?`}
                      detail="L'analyse quitte le carnet, le tableau de bord et l'export de contrôle, avec son rapport de laboratoire s'il a été déposé. L'analyse suivante du calendrier se recompte sur la précédente."
                      agir="Supprimer l'analyse"
                      action={supprimerAnalyseLegionelle.bind(null, id, a.id)}
                    />
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
