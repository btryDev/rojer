import { CadreIllustration } from "./motifs";

/**
 * Trois classeurs debout, dos tournés vers vous : les documents que vous
 * devez tenir — ceux que Rojer produit, et les autres. L'étiquette du
 * dernier se pose.
 */
export function IllustrationDocuments() {
  const classeur = (
    gauche: string,
    droite: string,
    dessus: string,
    origine: string,
    anime: boolean,
  ) => (
    <g>
      <polygon points={droite} />
      <polygon points={dessus} />
      <polygon points={gauche} />
      <g transform={`matrix(0.866,0.5,0,1,${origine})`}>
        <g className={anime ? "ep-pop" : undefined} style={anime ? { animationDelay: "0.8s" } : undefined}>
          <rect x="7" y="20" width="26" height="56" rx="2" fill="#0a0a0a" stroke="none" />
          <path d="M12,36H28M12,46H28M12,56H24" fill="none" stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </g>
        <circle cx="20" cy="140" r="6" fill="none" vectorEffect="non-scaling-stroke" />
      </g>
    </g>
  );
  return (
    <CadreIllustration viewBox="0 -195 290 345" className="w-[clamp(190px,19vw,270px)]">
      {classeur(
        "20.1,65 54.7,85 54.7,-85 20.1,-105",
        "184.6,10 54.7,85 54.7,-85 184.6,-160",
        "150,-180 184.6,-160 54.7,-85 20.1,-105",
        "20.1,-105",
        false,
      )}
      {classeur(
        "59.9,88 94.6,108 94.6,-62 59.9,-82",
        "224.5,33 94.6,108 94.6,-62 224.5,-137",
        "189.8,-157 224.5,-137 94.6,-62 59.9,-82",
        "59.9,-82",
        false,
      )}
      {classeur(
        "99.8,111 134.4,131 134.4,-39 99.8,-59",
        "264.3,56 134.4,131 134.4,-39 264.3,-114",
        "229.7,-134 264.3,-114 134.4,-39 99.8,-59",
        "99.8,-59",
        true,
      )}
    </CadreIllustration>
  );
}
