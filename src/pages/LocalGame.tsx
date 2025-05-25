import React, { useState, useEffect } from "react";
import { GameCard, Suit, Rank } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

// Define card types
type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
};

// Define a set or run
type Meld = {
  id: string;
  cards: Card[];
  type: "set" | "run";
};

// Define player
type Player = {
  id: string;
  name: string;
  hand: Card[];
  points: number;
};

// Define game state
type GameState = {
  deck: Card[];
  players: Player[];
  currentPlayerIndex: number;
  discardPile: Card[];
  melds: Meld[];
  gamePhase: "initial" | "draw" | "meld" | "discard" | "gameOver";
  winner: string | null;
};

// Card values
const CARD_VALUES: Record<Rank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
};

// Create a standard deck of cards
const createDeck = (): Card[] => {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks: Rank[] = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        value: CARD_VALUES[rank],
      });
    }
  }

  return shuffleDeck(deck);
};

// Shuffle deck
const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Check if cards form a valid set (same rank, different suits)
const isValidSet = (cards: Card[]): boolean => {
  if (cards.length < 3) return false;
  const rank = cards[0].rank;
  const suits = new Set<Suit>();

  for (const card of cards) {
    if (card.rank !== rank) return false;
    if (suits.has(card.suit)) return false;
    suits.add(card.suit);
  }

  return true;
};

// Check if cards form a valid run (consecutive ranks, same suit)
const isValidRun = (cards: Card[]): boolean => {
  if (cards.length < 3) return false;

  // Sort cards by value
  const sortedCards = [...cards].sort((a, b) => a.value - b.value);
  const suit = sortedCards[0].suit;

  // Check if all cards have the same suit
  if (!sortedCards.every((card) => card.suit === suit)) return false;

  // Check if ranks are consecutive
  for (let i = 1; i < sortedCards.length; i++) {
    if (sortedCards[i].value !== sortedCards[i - 1].value + 1) {
      return false;
    }
  }

  return true;
};

const LocalGame: React.FC = () => {
  const { toast } = useToast();
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize game state
    const deck = createDeck();
    const players: Player[] = [
      { id: "player1", name: "Player 1", hand: [], points: 0 },
      { id: "player2", name: "Player 2", hand: [], points: 0 },
    ];

    // Deal 10 cards to each player
    for (let i = 0; i < 10; i++) {
      for (let p = 0; p < players.length; p++) {
        if (deck.length > 0) {
          const card = deck.pop()!;
          players[p].hand.push(card);
        }
      }
    }

    // Initial discard pile with one card
    const discardPile: Card[] = [];
    if (deck.length > 0) {
      discardPile.push(deck.pop()!);
    }

    return {
      deck,
      players,
      currentPlayerIndex: 0,
      discardPile,
      melds: [],
      gamePhase: "draw",
      winner: null,
    };
  });

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Handle card selection
  const handleCardClick = (card: Card) => {
    if (gameState.gamePhase === "gameOver") return;

    setSelectedCards((prev) => {
      const isSelected = prev.some((c) => c.id === card.id);

      if (isSelected) {
        return prev.filter((c) => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  };

  // Draw card from deck
  const drawFromDeck = () => {
    if (gameState.gamePhase !== "draw") {
      toast({
        title: "Invalid move",
        description: "You can only draw a card during the draw phase.",
        variant: "destructive",
      });
      return;
    }

    if (gameState.deck.length === 0) {
      toast({
        title: "Deck empty",
        description: "The deck is empty. Game is reset.",
        variant: "destructive",
      });
      resetGame();
      return;
    }

    setGameState((prev) => {
      const newState = { ...prev };
      const card = newState.deck.pop()!;
      newState.players[newState.currentPlayerIndex].hand.push(card);
      newState.gamePhase = "meld";
      return newState;
    });
  };

  // Draw card from discard pile
  const drawFromDiscardPile = () => {
    if (gameState.gamePhase !== "draw") {
      toast({
        title: "Invalid move",
        description: "You can only draw a card during the draw phase.",
        variant: "destructive",
      });
      return;
    }

    if (gameState.discardPile.length === 0) {
      toast({
        title: "Discard pile empty",
        description: "The discard pile is empty. Draw from the deck instead.",
        variant: "destructive",
      });
      return;
    }

    setGameState((prev) => {
      const newState = { ...prev };
      const card = newState.discardPile.pop()!;
      newState.players[newState.currentPlayerIndex].hand.push(card);
      newState.gamePhase = "meld";
      return newState;
    });
  };

  // Create a meld from selected cards
  const createMeld = () => {
    if (gameState.gamePhase !== "meld") {
      toast({
        title: "Invalid move",
        description: "You can only create melds during the meld phase.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCards.length < 3) {
      toast({
        title: "Invalid meld",
        description: "A meld must contain at least 3 cards.",
        variant: "destructive",
      });
      return;
    }

    let meldType: "set" | "run" | null = null;

    if (isValidSet(selectedCards)) {
      meldType = "set";
    } else if (isValidRun(selectedCards)) {
      meldType = "run";
    }

    if (!meldType) {
      toast({
        title: "Invalid meld",
        description: "Selected cards do not form a valid set or run.",
        variant: "destructive",
      });
      return;
    }

    setGameState((prev) => {
      const newState = { ...prev };

      // Remove cards from player's hand
      const playerHand = newState.players[newState.currentPlayerIndex].hand;
      newState.players[newState.currentPlayerIndex].hand = playerHand.filter(
        (card) => !selectedCards.some((c) => c.id === card.id),
      );

      // Add meld
      newState.melds.push({
        id: `meld-${Date.now()}`,
        cards: selectedCards,
        type: meldType,
      });

      return newState;
    });

    setSelectedCards([]);
  };

  // Discard a card
  const discardCard = () => {
    if (gameState.gamePhase !== "meld") {
      toast({
        title: "Invalid move",
        description: "You can only discard a card after drawing.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCards.length !== 1) {
      toast({
        title: "Invalid discard",
        description: "You must select exactly one card to discard.",
        variant: "destructive",
      });
      return;
    }

    const cardToDiscard = selectedCards[0];

    setGameState((prev) => {
      const newState = { ...prev };

      // Remove card from player's hand
      const playerHand = newState.players[newState.currentPlayerIndex].hand;
      newState.players[newState.currentPlayerIndex].hand = playerHand.filter(
        (card) => card.id !== cardToDiscard.id,
      );

      // Add card to discard pile
      newState.discardPile.push(cardToDiscard);

      // Check if player has won
      if (newState.players[newState.currentPlayerIndex].hand.length === 0) {
        newState.gamePhase = "gameOver";
        newState.winner = newState.players[newState.currentPlayerIndex].name;
      } else {
        // Move to next player
        newState.currentPlayerIndex =
          (newState.currentPlayerIndex + 1) % newState.players.length;
        newState.gamePhase = "draw";
      }

      return newState;
    });

    setSelectedCards([]);
  };

  // Reset the game
  const resetGame = () => {
    setSelectedCards([]);

    setGameState(() => {
      const deck = createDeck();
      const players: Player[] = [
        { id: "player1", name: "Player 1", hand: [], points: 0 },
        { id: "player2", name: "Player 2", hand: [], points: 0 },
      ];

      // Deal 10 cards to each player
      for (let i = 0; i < 10; i++) {
        for (let p = 0; p < players.length; p++) {
          if (deck.length > 0) {
            const card = deck.pop()!;
            players[p].hand.push(card);
          }
        }
      }

      // Initial discard pile with one card
      const discardPile: Card[] = [];
      if (deck.length > 0) {
        discardPile.push(deck.pop()!);
      }

      return {
        deck,
        players,
        currentPlayerIndex: 0,
        discardPile,
        melds: [],
        gamePhase: "draw",
        winner: null,
      };
    });
  };

  // Show winner message
  useEffect(() => {
    if (gameState.winner) {
      toast({
        title: "Game Over",
        description: `${gameState.winner} wins the game!`,
      });
    }
  }, [gameState.winner, toast]);

  return (
    <div className="min-h-screen bg-brown-900 flex flex-col p-4 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tunisian Rami - Local Game</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetGame}>
            New Game
          </Button>
          <Link to="/">
            <Button variant="outline">Main Menu</Button>
          </Link>
        </div>
      </div>

      {gameState.winner ? (
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-8 mb-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{gameState.winner} Wins!</h2>
          <Button onClick={resetGame} size="lg">
            Play Again
          </Button>
        </div>
      ) : (
        <div className="text-center mb-4 bg-black/30 backdrop-blur-md rounded-xl p-4">
          <h2 className="text-xl font-semibold">{currentPlayer.name}'s Turn</h2>
          <p className="text-white/70">
            Phase:{" "}
            {gameState.gamePhase.charAt(0).toUpperCase() +
              gameState.gamePhase.slice(1)}
          </p>
        </div>
      )}

      {/* Game board */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Melds area */}
        <div className="lg:col-span-3 bg-black/30 backdrop-blur-md rounded-xl p-4 overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Melds on Table</h3>

          {gameState.melds.length === 0 ? (
            <div className="text-white/50 text-center p-8">
              No melds yet. Create a valid set or run.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {gameState.melds.map((meld) => (
                <div key={meld.id} className="bg-black/20 p-3 rounded-lg">
                  <div className="text-sm text-white/70 mb-2">
                    {meld.type === "set" ? "Set" : "Run"}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {meld.cards.map((card) => (
                      <div key={card.id} className="flex-shrink-0">
                        <GameCard
                          suit={card.suit}
                          rank={card.rank}
                          faceUp={true}
                          style={{ width: "70px", height: "98px" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Draw and discard area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4">Draw & Discard</h3>

            <div className="flex justify-around gap-4">
              <div className="text-center">
                <div
                  className="playing-card card-back mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={drawFromDeck}
                  style={{ width: "80px", height: "112px" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/80 text-sm">
                      {gameState.deck.length} cards
                    </span>
                  </div>
                </div>
                <Button
                  className="mt-2"
                  onClick={drawFromDeck}
                  disabled={gameState.gamePhase !== "draw"}
                >
                  Draw
                </Button>
              </div>

              <div className="text-center">
                {gameState.discardPile.length > 0 ? (
                  <div
                    className="mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={drawFromDiscardPile}
                    style={{ width: "80px", height: "112px" }}
                  >
                    <GameCard
                      suit={
                        gameState.discardPile[gameState.discardPile.length - 1]
                          .suit
                      }
                      rank={
                        gameState.discardPile[gameState.discardPile.length - 1]
                          .rank
                      }
                      faceUp={true}
                      style={{ width: "80px", height: "112px" }}
                    />
                  </div>
                ) : (
                  <div
                    className="playing-card bg-black/20 mx-auto"
                    style={{ width: "80px", height: "112px" }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white/50 text-xs">Empty</span>
                    </div>
                  </div>
                )}
                <Button
                  className="mt-2"
                  onClick={drawFromDiscardPile}
                  disabled={
                    gameState.gamePhase !== "draw" ||
                    gameState.discardPile.length === 0
                  }
                >
                  Take
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={createMeld}
                disabled={
                  gameState.gamePhase !== "meld" || selectedCards.length < 3
                }
              >
                Create Meld
              </Button>
              <Button
                onClick={discardCard}
                disabled={
                  gameState.gamePhase !== "meld" || selectedCards.length !== 1
                }
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Player's hand */}
      <div className="mt-4 bg-black/30 backdrop-blur-md rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-4">
          {currentPlayer.name}'s Hand
        </h3>
        <div className="flex gap-1 justify-center flex-wrap">
          {currentPlayer.hand.map((card) => (
            <div key={card.id} className="mb-4" style={{ margin: "-10px 2px" }}>
              <GameCard
                suit={card.suit}
                rank={card.rank}
                faceUp={true}
                selected={selectedCards.some((c) => c.id === card.id)}
                onClick={() => handleCardClick(card)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LocalGame;
