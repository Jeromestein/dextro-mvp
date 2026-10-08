"use client";
export default function ReaderError({ reset }: { reset: () => void }) {
  return <main className="route-message"><h1>The story could not load</h1><p>Please try again in a moment.</p><button className="button" onClick={reset}>Try again</button></main>;
}
