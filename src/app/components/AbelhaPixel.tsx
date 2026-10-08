import { memo, type CSSProperties } from "react";

// ============================================================================
// ABELHA DIGITAL — silhueta binarizada em pixel art (arte original)
// ============================================================================
// Desenhada num grid 22×16, olhando para a DIREITA. "#" = pixel aceso. Os
// vãos de 1 coluna no abdômen são as listras; o buraco na cabeça é o olho.
// As asas são formas cheias, mas só o contorno é desenhado (ficam "vazadas")
// e alternam entre dois quadros para vibrar.
//
// Usada pequena (~48px) na abelha rara do site principal e grande na entrada
// do hub (src/bott/Entrada.tsx). Cor = `currentColor`.

const LARGURA = 22;
const ALTURA = 16;

const CORPO = [
  "......................",
  "......................",
  "......................",
  "......................",
  "......................",
  "..................#..#",
  ".................#..#.",
  ".................#.#..",
  "...#.##.##..##...##...",
  "..##.##.##.####.##.#..",
  ".###.##.##.#########..",
  "####.##.##.##########.",
  ".###.##.##.####..##...",
  "..##.##.##..##........",
  "...#.##.##..#.#.......",
  "...........#...#......",
];

// Quadro A: asas erguidas. Quadro B: asas baixas, varridas para trás.
const ASAS_A = [
  [
    ".........####.........",
    "........######........",
    ".......########.......",
    ".......########.......",
    "........#######.......",
    ".........#####........",
    "..........####........",
    "...........###........",
  ],
  [
    "......................",
    "......................",
    "....####..............",
    "...######.............",
    "...######.............",
    "....######............",
    "......#####...........",
    "........####..........",
  ],
];

const ASAS_B = [
  [
    "......................",
    "......................",
    "......................",
    "......................",
    ".....######...........",
    "...##########.........",
    "..############........",
    "....##########........",
  ],
];

type Pixel = [number, number];

function pixelsDe(mapa: string[]): Pixel[] {
  const out: Pixel[] = [];
  mapa.forEach((linha, y) => {
    for (let x = 0; x < linha.length; x++) if (linha[x] === "#") out.push([x, y]);
  });
  return out;
}

/** Só a borda da forma (pixels com algum vizinho de fora). */
function contornoDe(mapa: string[]): Pixel[] {
  const cheio = (x: number, y: number) => mapa[y]?.[x] === "#";
  return pixelsDe(mapa).filter(
    ([x, y]) => !(cheio(x - 1, y) && cheio(x + 1, y) && cheio(x, y - 1) && cheio(x, y + 1))
  );
}

/** Junta pixels vizinhos na mesma linha em um <rect> só. */
function retangulos(pixels: Pixel[]): { x: number; y: number; w: number }[] {
  const ordenados = [...pixels].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const out: { x: number; y: number; w: number }[] = [];
  for (const [x, y] of ordenados) {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.y === y && ultimo.x + ultimo.w === x) ultimo.w++;
    else out.push({ x, y, w: 1 });
  }
  return out;
}

const R_CORPO = retangulos(pixelsDe(CORPO));
const R_ASAS_A = retangulos(ASAS_A.flatMap(contornoDe));
const R_ASAS_B = retangulos(ASAS_B.flatMap(contornoDe));

const CSS = `
@keyframes abp-bate{0%,49.9%{opacity:1}50%,100%{opacity:0}}
.abp-a{animation:abp-bate var(--abp-asa,70ms) linear infinite}
.abp-b{animation:abp-bate var(--abp-asa,70ms) linear infinite;animation-delay:calc(var(--abp-asa,70ms) * -0.5)}
`;

function Rects({ rs }: { rs: { x: number; y: number; w: number }[] }) {
  return (
    <>
      {rs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} />
      ))}
    </>
  );
}

/**
 * `largura` em px (a altura segue a proporção do grid). `asaMs` = período da
 * batida de asa. `parada` = asas congeladas no quadro A.
 */
export const AbelhaPixel = memo(function AbelhaPixel({
  largura = 48,
  asaMs = 70,
  parada = false,
  style,
}: {
  largura?: number;
  asaMs?: number;
  parada?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      width={largura}
      height={(largura * ALTURA) / LARGURA}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible", ...style, ["--abp-asa" as string]: `${asaMs}ms` }}
    >
      <style>{CSS}</style>
      <g className={parada ? undefined : "abp-a"}>
        <Rects rs={R_ASAS_A} />
      </g>
      {!parada && (
        <g className="abp-b">
          <Rects rs={R_ASAS_B} />
        </g>
      )}
      <Rects rs={R_CORPO} />
    </svg>
  );
});
