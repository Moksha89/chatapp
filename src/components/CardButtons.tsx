"use client";

import { ranks, type Rank } from "@/lib/blackjack";

export function CardButtons({ onSelect }: { onSelect: (rank: Rank) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-[repeat(13,minmax(0,1fr))]">
      {ranks.map((rank) => (
        <button key={rank} type="button" onClick={() => onSelect(rank)} className="rounded-2xl border border-gold/30 bg-gradient-to-b from-zinc-900 to-black px-4 py-4 text-2xl font-black text-white shadow-gold transition hover:-translate-y-0.5 hover:border-gold hover:text-gold active:translate-y-0">
          {rank}
        </button>
      ))}
    </div>
  );
}
