export function Lighthouse({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 400"
      fill="none"
      role="img"
      aria-label="An illustrated lighthouse overlooking the sea at dusk"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#cad5ce" />
          <stop offset="1" stopColor="#e6dfc9" />
        </linearGradient>
        <linearGradient id="sea" x2="0" y2="1">
          <stop stopColor="#526f69" />
          <stop offset="1" stopColor="#253f3a" />
        </linearGradient>
      </defs>
      <path fill="url(#sky)" d="M0 0h640v400H0z" />
      <circle cx="470" cy="90" r="41" fill="#f9f0d8" />
      <path
        d="M0 227c65-21 89-8 139-18s115-24 173-8 100 23 158 9 107-5 170 9v181H0Z"
        fill="url(#sea)"
      />
      <path
        d="m0 311 61-35 81 11 83-55 89 31 41-4 63 77 92 13 130 51H0"
        fill="#344b3f"
      />
      <path d="m0 318 73-15 87 9 67-58 52 30 24 68-147 48H0" fill="#536650" />
      <path d="m275 102-19 160h72l-20-160Z" fill="#f8eed9" />
      <path d="m293 102 5 160h30l-20-160Z" fill="#c9c2a9" />
      <path d="M270 78h44v29h-44z" fill="#314841" />
      <path d="M278 84h27v17h-27z" fill="#f5bc6a" />
      <path d="m265 78 27-19 27 19Z" fill="#333e33" />
      <path d="M292 60V47" stroke="#333e33" strokeWidth="3" />
      <path d="M263 108h58M268 105v8m46-8v8" stroke="#354a41" strokeWidth="4" />
      <path
        d="M282 139h11v19h-11zM278 191h12v18h-12zM283 234h15v28h-15z"
        fill="#536254"
      />
      <path d="m279 89-221 77v-60Z" fill="#fff2c4" opacity=".24" />
      <path d="m306 89 211 44v25Z" fill="#fff2c4" opacity=".18" />
      <path
        d="M409 261h67m-383-18h62m350 61h98m-220 39h50m-322 33h52m163-143h42m123-6h35"
        stroke="#d5d9c4"
        strokeWidth="2"
        opacity=".35"
      />
      <path
        d="m81 81 8-4 7 4m27 26 8-4 7 4m-37 22 6-3 5 3"
        stroke="#5a6d5d"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
