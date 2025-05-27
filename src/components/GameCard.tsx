import React from "react";
import { cn } from "@/lib/utils";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface CardProps {
  suit: Suit;
  rank: Rank;
  faceUp?: boolean;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  style?: React.CSSProperties;
  isJoker?: boolean;
}

const suitSymbols = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const getColor = (suit: Suit): string => {
  return suit === "hearts" || suit === "diamonds" ? "card-red" : "card-black";
};

export const GameCard: React.FC<CardProps> = ({
  suit,
  rank,
  faceUp = true,
  onClick,
  selected = false,
  className,
  style,
  isJoker = false,
}) => {
  return (
    <div
      className={cn(
        "playing-card select-none relative",
        faceUp
          ? isJoker
            ? "bg-white text-black border-2 border-gold"
            : getColor(suit)
          : "card-back",
        selected && "ring-2 ring-blue-500 ring-offset-2",
        onClick && "cursor-pointer hover:shadow-xl transition-all duration-200",
        className,
      )}
      style={{
        transform: selected ? "translateY(-20px)" : undefined,
        width: style?.width || "85px",
        height: style?.height || "119px",
        ...style,
      }}
      onClick={onClick}
    >
      {faceUp ? (
        <div className="absolute inset-0 p-1 flex flex-col justify-between overflow-hidden">
          {isJoker ? (
            // Joker card design with external image
            <>
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <div className="text-sm font-bold">J</div>
                </div>
              </div>
              <div className="flex-grow flex items-center justify-center">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Joker_black_02.svg/1407px-Joker_black_02.svg.png"
                  alt="Joker"
                  className="w-12 h-12 object-contain"
                  style={{ maxWidth: "80%", maxHeight: "80%" }}
                />
              </div>
              <div className="flex justify-between items-end">
                <div className="text-right ml-auto">
                  <div className="text-sm font-bold">J</div>
                </div>
              </div>
            </>
          ) : (
            // Regular card design
            <>
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <div className="text-sm font-bold leading-none">{rank}</div>
                  <div className="text-sm leading-none">{suitSymbols[suit]}</div>
                </div>
              </div>
              <div className="flex-grow flex items-center justify-center">
                <div className="text-2xl">{suitSymbols[suit]}</div>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-right ml-auto transform rotate-180">
                  <div className="text-sm font-bold leading-none">{rank}</div>
                  <div className="text-sm leading-none">{suitSymbols[suit]}</div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 border border-white/20">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <div className="text-sm text-white font-bold">TR</div>
          </div>
        </div>
      )}
    </div>
  );
};
