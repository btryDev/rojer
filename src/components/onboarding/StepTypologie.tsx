"use client";

import {
  CATEGORIES_ERP,
  TYPE_ERP,
  TYPES_ERP_QUESTION_LOCAUX_SOMMEIL,
} from "@/lib/etablissements/schema";
import {
  LABEL_CATEGORIE_ERP,
  LABEL_TYPE_ERP,
} from "@/lib/etablissements/labels";
import type { StepProps } from "./types";

/**
 * Étape 2 sur 3 — la typologie de l'établissement (ERP / IGH / habitation).
 *
 * **Le parcours ne devine plus, il fait déclarer** (décision du 2026-09-01).
 * Il proposait auparavant huit cartes d'activité — huit types sur vingt-deux
 * — puis déduisait la catégorie d'un effectif de public saisi, table de seuils
 * à l'appui. Deux défauts, et le second est le vrai : la liste tronquée ne
 * laissait aucune place à qui n'y figurait pas, et la catégorie *déduite*
 * s'inscrivait au dossier comme si elle avait été constatée, alors qu'elle
 * était calculée à partir d'un chiffre approximatif. Un dirigeant connaît son
 * classement — il est sur son arrêté d'ouverture ou au procès-verbal de la
 * commission de sécurité — et il vaut mieux le lui demander que le recalculer
 * moins bien que lui.
 *
 * Il n'y a donc plus de mode guidé ni de mode avancé : le mode avancé
 * n'existait que pour échapper à la déduction.
 *
 * Les questions ne sont pas numérotées : elles sont posées toutes les trois en
 * même temps et se répondent dans n'importe quel ordre.
 */
export function StepTypologie({
  state,
  update,
  errors,
  blocage,
}: StepProps) {
  /**
   * L'erreur d'un champ : le refus de passage d'étape s'il vise ce champ,
   * sinon celle du serveur.
   *
   * Le refus était rendu par le shell, en bas de colonne — six cents pixels
   * sous le `<select>` visé, après trois cartes. On lisait « Précisez… » en
   * regardant la carte « habitation », sans rien pour dire lequel des quatre
   * contrôles manquait.
   */
  const messagePour = (champ: string) =>
    (blocage?.champ === champ ? blocage.message : undefined) ??
    errors?.[champ];

  /**
   * La question des locaux à sommeil n'est posée qu'à quatre types (décision
   * du 2026-09-09, cf. `TYPES_ERP_QUESTION_LOCAUX_SOMMEIL`). Elle apparaît donc
   * SOUS le type, dans la même étape, et pas ailleurs : elle a besoin de la
   * réponse au type pour savoir si elle doit exister.
   */
  const poseLocauxSommeil = (
    TYPES_ERP_QUESTION_LOCAUX_SOMMEIL as readonly string[]
  ).includes(state.typeErp);

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <p className="board-eyebrow m-0 mb-2 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Type d&apos;établissement
        </p>
        <h2 className="board-titre m-0 text-[clamp(22px,2.2vw,27px)]">
          Quelques questions pour cadrer les obligations applicables.
        </h2>
        <p className="m-0 mt-2.5 max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {/* « et deux précisions » : il y en a quatre — type et catégorie
              d'ERP, nature de l'immeuble IGH, famille d'habitation. Le
              chapeau comptait les précisions du seul « oui » à l'ERP.
              Compter à la main un nombre que trois blocs plus bas
              contredisent revient à annoncer un parcours plus court qu'il
              ne l'est ; on dit donc la règle, pas le total. */}
          Trois questions. Chaque « oui » en ouvre une ou deux de plus. Votre
          classement figure sur votre arrêté d&apos;ouverture ou au
          procès-verbal de la commission de sécurité — nous ne le devinons
          pas à votre place.
        </p>
      </div>

      {/* ─── Accueil du public (ERP) ──────────────────────── */}
          <section className="carte-board flex flex-col gap-6 px-7 py-6 sm:px-8">
            <div>
              <h3 className="board-titre m-0 text-[22px]">
                Accueillez-vous du public sur ce lieu ?
              </h3>
              <p className="m-0 mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Clients, patients, élèves, visiteurs… Si oui, votre
                établissement est un ERP (Établissement Recevant du
                Public) et des règles incendie spécifiques s&apos;appliquent.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <BoutonOuiNon
                actif={state.estERP}
                label="Oui"
                onClick={() =>
                  update({ estERP: true })
                }
              />
              <BoutonOuiNon
                actif={!state.estERP && (state.typeErp === "" || state.typeErp === undefined)}
                label="Non"
                onClick={() =>
                  update({
                    estERP: false,
                    typeErp: "",
                    categorieErp: "",
                    // Une réponse sur les locaux à sommeil donnée avant de
                    // décocher l'ERP n'a plus de question : la garder ferait
                    // poster un champ que le schéma refuse hors des quatre
                    // types.
                    comporteLocauxSommeilPublic: "",
                  })
                }
              />
            </div>

            {state.estERP && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <SousQuestion
                    question="Quel est votre type d'établissement ?"
                    // « Le vôtre y figure » a été faux, puis réparé du
                    // mauvais côté. La liste en proposait vingt et un pour
                    // vingt-deux au règlement, et l'écran a d'abord corrigé
                    // sa PHRASE — « le type J n'y est pas : Rojer ne le
                    // traite pas » —, en présentant comme une décision de
                    // périmètre ce qui n'était qu'une liste écrite de
                    // mémoire à l'ADR-004. Le type J est entré au modèle le
                    // 2026-09-03 avec le dépouillement de GN 1 ; la liste
                    // est désormais celle du texte, et la phrase le dit.
                    aide="Les vingt-deux types du règlement de sécurité, dans l'ordre de l'article GN 1 : d'abord les établissements installés dans un bâtiment, puis les établissements spéciaux."
                  />
                  <select
                    id="typeErp"
                    aria-label="Type d'ERP"
                    value={state.typeErp}
                    onChange={(e) => {
                      const t = e.currentTarget.value;
                      update({
                        typeErp: t,
                        // Changer de type pour un type hors liste retire la
                        // question : la réponse déjà donnée part avec elle.
                        // La laisser en état ferait poster, depuis un écran qui
                        // ne montre plus rien, une déclaration sur un
                        // établissement qui n'est plus celui-là.
                        ...((
                          TYPES_ERP_QUESTION_LOCAUX_SOMMEIL as readonly string[]
                        ).includes(t)
                          ? {}
                          : { comporteLocauxSommeilPublic: "" }),
                      });
                    }}
                    /* Pleine largeur de la colonne, et non `max-w-md`.
                       448 px tranchaient « L · Salle d'audition, de conférence,
                       de réunion, de specta » sans ellipse — trois des
                       vingt-deux libellés de GN 1 dépassent. Le libellé n'est
                       pas abrégeable : `types-erp.test.ts` le tient sur le
                       verbatim du texte. */
                    className="champ-board"
                    aria-invalid={Boolean(messagePour("typeErp"))}
                  >
                    <option value="">— Sélectionner —</option>
                    {TYPE_ERP.map((t) => (
                      <option key={t} value={t}>
                        {LABEL_TYPE_ERP[t]}
                      </option>
                    ))}
                  </select>
                  {messagePour("typeErp") && (
                    <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
                      {messagePour("typeErp")}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <SousQuestion
                    question="Quelle est votre catégorie ?"
                    aide="Elle compte le public admis, pas vos salariés — un petit restaurant qui sert trois cents couverts est en 3ᵉ catégorie."
                  />
                  <select
                    id="categorieErp"
                    aria-label="Catégorie d'ERP"
                    value={state.categorieErp}
                    onChange={(e) =>
                      update({ categorieErp: e.currentTarget.value })
                    }
                    /* Même largeur que le type juste au-dessus : deux selects
                       superposés de largeurs différentes se lisent comme deux
                       champs de nature différente. */
                    className="champ-board"
                    aria-invalid={Boolean(messagePour("categorieErp"))}
                  >
                    <option value="">— Sélectionner —</option>
                    {CATEGORIES_ERP.map((c) => (
                      <option key={c} value={c}>
                        {LABEL_CATEGORIE_ERP[c]}
                      </option>
                    ))}
                  </select>
                  {messagePour("categorieErp") && (
                    <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
                      {messagePour("categorieErp")}
                    </p>
                  )}
                </div>

                {/* Locaux à sommeil — posée au parcours depuis le 2026-09-09,
                    et seulement aux types J, O, U et R. Elle est ici, sous le
                    type, parce qu'elle a besoin de sa réponse pour savoir si
                    elle doit exister : c'est la seule question du parcours dont
                    la PRÉSENCE dépend d'une autre.

                    Elle ne bloque pas : « Je ne sais pas encore » est la valeur
                    par défaut et laisse la colonne à `null`. Le recadrage du
                    2026-09-01 a sorti deux questions de technicien de ce
                    parcours ; celle-ci y revient sans en reprendre le défaut,
                    parce qu'elle ne barre la route de personne.

                    Le libellé et l'aide sont ceux de la fiche établissement,
                    au mot près. Deux formulations pour une même question, ce
                    sont deux questions pour qui les lit — et la réponse donnée
                    ici est celle que la fiche rouvrira. */}
                {poseLocauxSommeil && (
                  <div className="flex flex-col gap-3">
                    <SousQuestion
                      question="Votre établissement héberge-t-il du public pour la nuit ?"
                      aide="Chambres d'hôtel, chambres d'hôtes, gîte, hébergement — des locaux où le public dort. Un logement de fonction occupé par vous ou par un salarié ne compte pas : le texte vise le sommeil du public. Si oui, s'ajoutent un contrat annuel d'entretien de la détection incendie, des consignes et des plans affichés, et une visite de la commission de sécurité tous les cinq ans (arrêté du 25 juin 1980, art. PE 4, PE 33, PE 35 et PE 37)."
                    />
                    <select
                      id="comporteLocauxSommeilPublic"
                      aria-label="Hébergement du public pour la nuit"
                      value={state.comporteLocauxSommeilPublic}
                      onChange={(e) =>
                        update({
                          comporteLocauxSommeilPublic: e.currentTarget.value,
                        })
                      }
                      className="champ-board"
                      aria-invalid={Boolean(
                        messagePour("comporteLocauxSommeilPublic"),
                      )}
                    >
                      <option value="">Je ne sais pas encore</option>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                    {messagePour("comporteLocauxSommeilPublic") && (
                      <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
                        {messagePour("comporteLocauxSommeilPublic")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ─── IGH ─────────────────────────────────────────── */}
          <section className="carte-board flex flex-col gap-6 px-7 py-6 sm:px-8">
            <div>
              <h3 className="board-titre m-0 text-[22px]">
                Votre bâtiment fait-il plus de 28 mètres de hauteur ?
              </h3>
              <p className="m-0 mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Environ 9 étages et plus. Ce cas (IGH) est très rare en
                TPE/PME — si vous êtes au rez-de-chaussée ou dans un
                immeuble de quelques étages, répondez « Non ».
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <BoutonOuiNon
                actif={state.estIGH}
                label="Oui"
                onClick={() => update({ estIGH: true })}
              />
              <BoutonOuiNon
                actif={!state.estIGH}
                label="Non"
                onClick={() => update({ estIGH: false })}
              />
            </div>
            {/* La sous-question « Quelle est la nature de l'immeuble ? » a été
                retirée le 2026-09-03. Elle proposait les dix classes de
                l'article R. 146-4 du CCH et n'ouvrait aucune obligation : les
                vérifications de l'arrêté du 30 décembre 2011 sont à la charge
                des « propriétaires » et ne varient pas par classe, et GH 66
                dispose que le classement retient l'usage PRINCIPAL de
                l'immeuble — la classe d'une tour ne décrit donc pas le plateau
                qu'on y occupe. Voir `corpus/arrete-2011-12-30-igh.ts`. */}
          </section>

          {/* ─── Habitation ──────────────────────────────────── */}
          <section className="carte-board flex flex-col gap-4 px-7 py-6 sm:px-8">
            <div>
              <h3 className="board-titre m-0 text-[22px]">
                Gérez-vous un immeuble d&apos;habitation ?
              </h3>
              <p className="m-0 mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Uniquement si vous êtes propriétaire ou syndic d&apos;un
                logement collectif (ramonage, VMC-Gaz…). Rare pour les
                commerces et restaurants.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <BoutonOuiNon
                actif={state.estHabitation}
                label="Oui"
                onClick={() => update({ estHabitation: true })}
              />
              <BoutonOuiNon
                actif={!state.estHabitation}
                label="Non"
                onClick={() => update({ estHabitation: false })}
              />
            </div>
            {/* La sous-question « À quelle famille l'immeuble appartient-il ? »
                a été retirée le 2026-09-03, avec l'aide qui la présentait comme
                décisive — « ne le devinez pas : il change les obligations qui
                vous seront présentées ». C'était faux, et mesurable : les cinq
                familles et l'absence de réponse rendaient le même jeu
                d'obligations. L'arrêté du 31 janvier 1986 le dit aussi, article
                par article — son unique obligation périodique, l'article 101,
                vise « le propriétaire » sans mentionner de famille. Voir
                `corpus/arrete-1986-habitation.ts`. */}
          </section>
    </div>
  );
}

/**
 * L'amorce d'une sous-question, sous le filet qui la sépare de la question
 * principale. Elle reste un paragraphe et non un titre : une carte board ne
 * porte jamais deux niveaux de titrage (charte, interdit 11).
 */
function SousQuestion({
  question,
  aide,
}: {
  question: string;
  aide?: string;
}) {
  return (
    <div className="border-t border-[color:var(--board-slate-line)] pt-5">
      <p className="m-0 text-[14px] font-semibold leading-[1.35] tracking-[-0.01em] text-[color:var(--board-ink)]">
        {question}
      </p>
      {aide ? (
        <p className="m-0 mt-1.5 max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {aide}
        </p>
      ) : null}
    </div>
  );
}

function BoutonOuiNon({
  actif,
  label,
  onClick,
}: {
  actif: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={
        "min-w-[100px] rounded-full px-5 py-2 text-[12.5px] font-semibold tracking-[-0.01em] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)] " +
        (actif
          ? "bg-[color:var(--board-ink)] text-white"
          : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)] hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)]")
      }
    >
      {label}
    </button>
  );
}
