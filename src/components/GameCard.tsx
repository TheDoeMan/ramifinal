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
        "playing-card select-none",
        faceUp
          ? isJoker
            ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white"
            : getColor(suit)
          : "card-back",
        selected && "ring-2 ring-blue-500 ring-offset-2",
        onClick && "cursor-pointer",
        className,
      )}
      style={{
        transform: selected ? "translateY(-20px)" : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {faceUp ? (
        <div className="absolute inset-0 p-2 flex flex-col justify-between">
          {isJoker ? (
            // Joker card design
            <>
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <div className="text-lg font-bold">J</div>
                </div>
              </div>
              <div className="flex-grow flex items-center justify-center">
                <div className="text-3xl font-bold">JOKER</div>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-right ml-auto">
                  <div className="text-lg font-bold">J</div>
                </div>
              </div>
            </>
          ) : (
            // Regular card design
            <>
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <div className="text-lg font-bold">{rank}</div>
                  <div className="text-xl">{suitSymbols[suit]}</div>
                </div>
              </div>
              <div className="flex-grow flex items-center justify-center">
                <div className="text-4xl">{suitSymbols[suit]}</div>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-right ml-auto">
                  <div className="text-lg font-bold">{rank}</div>
                  <div className="text-xl">{suitSymbols[suit]}</div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <div className="text-2xl text-white">TR</div>
          </div>
        </div>
      )}
    </div>
  );
};
