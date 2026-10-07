function Leaf({ x, y, angle = 0, accent = false }: { x: number; y: number; angle?: number; accent?: boolean }) {
  return <path className={`story-tree-leaf${accent ? " accent" : ""}`} transform={`translate(${x} ${y}) rotate(${angle})`} d="M0 0C-2-9 2-18 11-23C14-12 10-3 0 0Z" />;
}

export default function StoryTree() {
  return <figure className="story-tree">
    <svg viewBox="0 0 320 270" role="img" aria-label="A story grows like a tree: one beginning at the roots, choices along the branches, and three possible endings at the tips.">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="story-tree-ground" d="M114 238Q159 231 207 239" />
        <g className="story-tree-wood">
          <path strokeWidth="1.5" d="M160 224Q149 236 132 239M162 224Q170 237 188 240M161 227L158 241" />
          <path strokeWidth="4.5" d="M161 228C164 207 164 190 155 171C148 155 148 140 152 127" />
          <path strokeWidth="3" d="M155 171C143 155 120 148 103 131C85 113 62 104 53 80M158 178C174 156 202 151 220 133C236 117 258 101 263 79" />
          <path strokeWidth="2.3" d="M152 127C155 108 143 95 145 78C146 62 157 51 160 37" />
          <path strokeWidth="1.5" d="M104 132C106 117 103 103 94 91L88 75M77 109C60 109 50 113 39 103" />
          <path strokeWidth="1.5" d="M147 98C132 86 118 81 116 64M150 65C163 61 177 51 181 39M220 133C211 117 211 102 218 85M243 112C258 116 272 110 279 99" />
          <path strokeWidth="1.2" d="M94 92Q77 90 73 77M123 83Q122 96 127 102M217 94Q234 84 236 70M257 96Q248 87 247 76" />
        </g>
        <path className="story-tree-route" strokeWidth="2.2" d="M161 228C164 207 164 190 155 171C148 155 148 140 152 127C155 108 143 95 145 78C146 62 157 51 160 37" />
      </g>
      <g>
        <Leaf x={46} y={106} angle={-85} />
        <Leaf x={62} y={97} angle={-73} />
        <Leaf x={78} y={108} angle={55} />
        <Leaf x={88} y={77} angle={-38} />
        <Leaf x={101} y={110} angle={28} />
        <Leaf x={117} y={68} angle={-53} />
        <Leaf x={124} y={94} angle={-100} />
        <Leaf x={143} y={84} angle={-44} accent />
        <Leaf x={150} y={64} angle={-53} accent />
        <Leaf x={172} y={53} angle={15} accent />
        <Leaf x={151} y={113} angle={42} accent />
        <Leaf x={213} y={116} angle={-48} />
        <Leaf x={220} y={89} angle={-22} />
        <Leaf x={237} y={73} angle={8} />
        <Leaf x={254} y={103} angle={39} />
        <Leaf x={271} y={108} angle={65} />
        <Leaf x={235} y={121} angle={74} />
      </g>
      <g className="story-tree-tips">
        <circle cx="53" cy="80" r="3" />
        <circle className="accent" cx="160" cy="37" r="3.5" />
        <circle cx="263" cy="79" r="3" />
      </g>
      <g className="story-tree-labels">
        <text x="51" y="44">Ending A</text>
        <text className="accent" x="160" y="18">Ending B</text>
        <text x="266" y="43">Ending C</text>
        <text className="story-tree-origin" x="160" y="264">The beginning</text>
      </g>
    </svg>
  </figure>;
}
