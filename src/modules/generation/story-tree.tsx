type Point = readonly [number, number];
type Branch = readonly [Point, Point, Point, Point];
type Growth = "lower" | "middle" | "upper";

function pointOn(branch: Branch, t: number): Point {
  const u = 1 - t;
  const coordinate = (axis: 0 | 1) =>
    u ** 3 * branch[0][axis] + 3 * u ** 2 * t * branch[1][axis]
    + 3 * u * t ** 2 * branch[2][axis] + t ** 3 * branch[3][axis];
  // Keep SVG attributes identical across server and browser math implementations.
  return [Number(coordinate(0).toFixed(3)), Number(coordinate(1).toFixed(3))];
}

function curve(branch: Branch) {
  return `C${branch[1]} ${branch[2]} ${branch[3]}`;
}

function branchPath(branch: Branch) {
  return `M${branch[0]}${curve(branch)}`;
}

const trunk: Branch = [[160, 232], [165, 212], [166, 190], [155, 170]];
const left: Branch = [trunk[3], [123, 148], [73, 127], [53, 80]];
const middleLower: Branch = [trunk[3], [143, 146], [157, 126], [148, 102]];
const middleUpper: Branch = [middleLower[3], [142, 77], [154, 54], [163, 35]];
const right: Branch = [pointOn(trunk, 0.82), [185, 154], [253, 135], [265, 80]];
const roots = "M132 243Q151 240 160 232Q168 240 184 243M160 232Q161 240 160 246";
const route = `M160 246Q161 240 160 232${curve(trunk)}${curve(middleLower)}${curve(middleUpper)}`;

function Leaf({ branch, at, angle, length = 22, stem = 5, growth }: {
  branch: Branch;
  at: number;
  angle: number;
  length?: number;
  stem?: number;
  growth?: Growth;
}) {
  const anchor = pointOn(branch, at);
  const width = length * 0.27;
  const tip = -stem - length;

  return <g className={`story-tree-sprig${growth ? " accent" : ""}`} data-growth={growth} transform={`translate(${anchor}) rotate(${angle})`}>
    <path className="story-tree-petiole" d={`M0 0Q-1 ${-stem / 2} 0 ${-stem}`} />
    <path className="story-tree-leaf" d={`M0 ${-stem}C${-width} ${-stem - length * 0.3} ${-width * 0.8} ${tip + length * 0.22} 1.5 ${tip}C${width * 1.2} ${tip + length * 0.32} ${width} ${-stem - length * 0.24} 0 ${-stem}Z`} />
    <path className="story-tree-vein" d={`M0 ${-stem}Q1 ${-stem - length * 0.45} 1.5 ${tip + 3}`} />
  </g>;
}

export default function StoryTree() {
  return <figure className="story-tree">
    <svg viewBox="0 0 320 270" role="img" aria-label="A story grows like a tree: one beginning at the roots, choices along the branches, and three possible endings at the tips.">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="story-tree-ground" d="M114 242Q159 235 207 243" />
        <g className="story-tree-wood">
          <path strokeWidth="1.3" d={roots} />
          <path strokeWidth="3.8" d={branchPath(trunk)} />
          <path strokeWidth="2.2" d={`${branchPath(left)}${branchPath(right)}`} />
          <path strokeWidth="1.8" d={`${branchPath(middleLower)}${curve(middleUpper)}`} />
        </g>
        <path className="story-tree-route" pathLength={1} strokeWidth="1.8" d={route} />
      </g>
      <g>
        <Leaf branch={left} at={0.24} angle={-95} length={24} />
        <Leaf branch={left} at={0.43} angle={8} length={25} stem={6} />
        <Leaf branch={left} at={0.59} angle={-82} />
        <Leaf branch={left} at={0.72} angle={-5} />
        <Leaf branch={left} at={0.9} angle={-68} length={19} stem={4} />
        <Leaf branch={middleLower} at={0.65} angle={65} length={23} stem={6} growth="lower" />
        <Leaf branch={middleUpper} at={0.15} angle={-32} length={21} growth="middle" />
        <Leaf branch={middleUpper} at={0.5} angle={-28} length={20} growth="upper" />
        <Leaf branch={middleUpper} at={0.7} angle={52} length={21} growth="upper" />
        <Leaf branch={right} at={0.28} angle={105} stem={6} />
        <Leaf branch={right} at={0.45} angle={-18} />
        <Leaf branch={right} at={0.6} angle={80} />
        <Leaf branch={right} at={0.74} angle={0} />
        <Leaf branch={right} at={0.88} angle={72} length={20} />
      </g>
      <g className="story-tree-tips">
        <circle cx={left[3][0]} cy={left[3][1]} r="2.7" />
        <circle className="accent" cx={middleUpper[3][0]} cy={middleUpper[3][1]} r="3" />
        <circle cx={right[3][0]} cy={right[3][1]} r="2.7" />
      </g>
      <g className="story-tree-labels">
        <text x="51" y="44">Ending A</text>
        <text className="accent" x="163" y="18">Ending B</text>
        <text x="266" y="43">Ending C</text>
        <text className="story-tree-origin" x="160" y="264">The beginning</text>
      </g>
    </svg>
  </figure>;
}
