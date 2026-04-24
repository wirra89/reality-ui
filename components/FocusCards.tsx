"use client";

// components/FocusCards.tsx

export type FocusCard = {
  icon: string;
  title: string;
  desc: string;
  active?: boolean;
};

type FocusCardsProps = {
  cards: FocusCard[];
};

export default function FocusCards({ cards }: FocusCardsProps) {
  return (
    <div className="flex gap-2">
      {cards.map((card, i) => (
        <div
          key={i}
          className="flex-1 rounded-[18px] px-2.5 py-3"
          style={
            card.active
              ? {
                  background: "linear-gradient(135deg, #C96480, #A84468)",
                  border: "1px solid transparent",
                  boxShadow: "0 6px 20px rgba(232,130,154,0.40)",
                }
              : {
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 2px 10px rgba(180,80,100,0.08)",
                }
          }
        >
          <span className="text-xl mb-1.5 block">{card.icon}</span>
          <p
            className="text-xs font-bold mb-0.5 leading-tight"
            style={{ color: card.active ? "white" : "var(--color-text)" }}
          >
            {card.title}
          </p>
          <p
            className="text-[10px] leading-snug"
            style={{ color: card.active ? "rgba(255,255,255,0.85)" : "var(--color-text-mid)" }}
          >
            {card.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
