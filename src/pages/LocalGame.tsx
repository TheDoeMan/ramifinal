import React, { useState, useEffect } from "react";
import { GameCard, Suit, Rank } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  playerId: string;
};

// Define player
type Player = {
  id: string;
  name: string;
  hand: Card[];
  points: number;
  hasMelded: boolean;
  meldPoints: number;
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
  roundScores: { [playerId: string]: number };
  currentRound: number;
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

// Required points for the first meld
const FIRST_MELD_POINTS = 51;

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

// Calculate total points in a set of cards
const calculatePoints = (cards: Card[]): number => {
  return cards.reduce((total, card) => total + card.value, 0);
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

// Check if a player can add to an existing meld
const canAddToMeld = (meld: Meld, card: Card): boolean => {
  if (meld.type === "set") {
    // Can add to a set if the card has the same rank but different suit
    return (
      card.rank === meld.cards[0].rank &&
      !meld.cards.some((c) => c.suit === card.suit)
    );
  } else if (meld.type === "run") {
    // Can add to a run if the card is consecutive and same suit
    const suit = meld.cards[0].suit;
    if (card.suit !== suit) return false;

    const values = meld.cards.map((c) => c.value).sort((a, b) => a - b);
    const minValue = values[0];
    const maxValue = values[values.length - 1];

    // Can add to beginning or end of run
    return card.value === minValue - 1 || card.value === maxValue + 1;
  }
  return false;
};

const LocalGame: React.FC = () => {
  const { toast } = useToast();
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedMeld, setSelectedMeld] = useState<Meld | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize game state
    const deck = createDeck();
    const players: Player[] = [
      {
        id: "player1",
        name: "Player 1",
        hand: [],
        points: 0,
        hasMelded: false,
        meldPoints: 0,
      },
      {
        id: "player2",
        name: "Player 2",
        hand: [],
        points: 0,
        hasMelded: false,
        meldPoints: 0,
      },
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
      roundScores: {},
      currentRound: 1,
    };
  });

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Handle card selection
  const handleCardClick = (card: Card) => {
    if (gameState.gamePhase === "gameOver") return;

    // If a meld is selected, try to add this card to the meld
    if (selectedMeld && gameState.gamePhase === "meld") {
      if (canAddToMeld(selectedMeld, card)) {
        addCardToMeld(selectedMeld, card);
        return;
      } else {
        setSelectedMeld(null);
        toast({
          title: "Invalid addition",
          description: "This card cannot be added to the selected meld.",
          variant: "destructive",
        });
        return;
      }
    }

    setSelectedCards((prev) => {
      const isSelected = prev.some((c) => c.id === card.id);

      if (isSelected) {
        return prev.filter((c) => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  };

  // Handle meld selection for adding cards
  const handleMeldClick = (meld: Meld) => {
    if (gameState.gamePhase !== "meld") return;

    // Can only add to your own melds before first meld
    if (!currentPlayer.hasMelded && meld.playerId !== currentPlayer.id) {
      toast({
        title: "Cannot modify opponent's melds",
        description:
          "You must lay down your first meld before adding to opponent's melds.",
        variant: "destructive",
      });
      return;
    }

    if (selectedMeld && selectedMeld.id === meld.id) {
      setSelectedMeld(null);
    } else {
      setSelectedMeld(meld);
      setSelectedCards([]);
    }
  };

  // Add a card to an existing meld
  const addCardToMeld = (meld: Meld, card: Card) => {
    if (gameState.gamePhase !== "meld") return;

    setGameState((prev) => {
      const newState = { ...prev };

      // Find the meld to update
      const meldIndex = newState.melds.findIndex((m) => m.id === meld.id);
      if (meldIndex === -1) return newState;

      // Remove card from player's hand
      const playerHand = newState.players[newState.currentPlayerIndex].hand;
      newState.players[newState.currentPlayerIndex].hand = playerHand.filter(
        (c) => c.id !== card.id,
      );

      // Add card to the meld
      if (newState.melds[meldIndex].type === "run") {
        // For runs, we need to maintain order
        const values = [...newState.melds[meldIndex].cards, card]
          .map((c) => c.value)
          .sort((a, b) => a - b);

        const cardValue = card.value;
        if (cardValue < values[1]) {
          // Add to beginning
          newState.melds[meldIndex].cards.unshift(card);
        } else {
          // Add to end
          newState.melds[meldIndex].cards.push(card);
        }
      } else {
        // For sets, just add the card
        newState.melds[meldIndex].cards.push(card);
      }

      return newState;
    });

    setSelectedMeld(null);
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
      // If deck is empty, shuffle the discard pile except the top card
      if (gameState.discardPile.length <= 1) {
        toast({
          title: "Game over",
          description: "No more cards available. Ending the round.",
          variant: "destructive",
        });
        endRound();
        return;
      }

      setGameState((prev) => {
        const newState = { ...prev };
        const topCard = newState.discardPile.pop()!;
        newState.deck = shuffleDeck(newState.discardPile);
        newState.discardPile = [topCard];

        const card = newState.deck.pop()!;
        newState.players[newState.currentPlayerIndex].hand.push(card);
        newState.gamePhase = "meld";

        return newState;
      });
    } else {
      setGameState((prev) => {
        const newState = { ...prev };
        const card = newState.deck.pop()!;
        newState.players[newState.currentPlayerIndex].hand.push(card);
        newState.gamePhase = "meld";
        return newState;
      });
    }
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

    // Check if this is the player's first meld and if it meets the minimum points
    const pointsInMeld = calculatePoints(selectedCards);
    const player = gameState.players[gameState.currentPlayerIndex];

    if (!player.hasMelded && pointsInMeld < FIRST_MELD_POINTS) {
      toast({
        title: "First meld requirements not met",
        description: `Your first meld must be at least ${FIRST_MELD_POINTS} points. This meld is only ${pointsInMeld} points.`,
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

      // Update player's meld status if this is their first meld
      if (!newState.players[newState.currentPlayerIndex].hasMelded) {
        newState.players[newState.currentPlayerIndex].hasMelded = true;
        newState.players[newState.currentPlayerIndex].meldPoints = pointsInMeld;
      }

      // Add meld
      newState.melds.push({
        id: `meld-${Date.now()}`,
        cards: selectedCards,
        type: meldType,
        playerId: currentPlayer.id,
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
        // End the round with a winner
        return endRoundWithWinner(newState);
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

  // End round with a winner
  const endRoundWithWinner = (currentState: GameState): GameState => {
    const newState = { ...currentState };
    const winner = newState.players[newState.currentPlayerIndex];

    // Calculate points for remaining cards in opponents' hands
    let roundScores = { ...newState.roundScores };

    newState.players.forEach((player) => {
      if (player.id !== winner.id) {
        const points = calculatePoints(player.hand);
        player.points += points;

        // Update round scores
        roundScores[player.id] = (roundScores[player.id] || 0) + points;
        roundScores[winner.id] = roundScores[winner.id] || 0; // Winner gets 0 points
      }
    });

    newState.roundScores = roundScores;

    // Check if we have an overall winner
    const gameWinner = newState.players.find((p) => p.points >= 100)
      ? null
      : winner.name;

    if (gameWinner) {
      newState.gamePhase = "gameOver";
      newState.winner = gameWinner;
    } else {
      // Start new round
      startNewRound(newState);
    }

    return newState;
  };

  // End the round without a winner
  const endRound = () => {
    setGameState((prev) => {
      const newState = { ...prev };

      // Calculate points for all players
      let roundScores = { ...newState.roundScores };

      newState.players.forEach((player) => {
        const points = calculatePoints(player.hand);
        player.points += points;

        // Update round scores
        roundScores[player.id] = (roundScores[player.id] || 0) + points;
      });

      newState.roundScores = roundScores;

      // Check if we have an overall winner based on lowest points
      if (newState.currentRound >= 3) {
        const lowestPoints = Math.min(...newState.players.map((p) => p.points));
        const winners = newState.players.filter(
          (p) => p.points === lowestPoints,
        );

        if (winners.length === 1) {
          newState.gamePhase = "gameOver";
          newState.winner = winners[0].name;
          return newState;
        }
      }

      // Start new round
      return startNewRound(newState);
    });
  };

  // Start a new round
  const startNewRound = (currentState: GameState): GameState => {
    const newState = { ...currentState };

    // Increment round counter
    newState.currentRound += 1;

    // Create new deck
    const deck = createDeck();

    // Reset player hands and meld status
    newState.players.forEach((player) => {
      player.hand = [];
      player.hasMelded = false;
      player.meldPoints = 0;
    });

    // Deal 10 cards to each player
    for (let i = 0; i < 10; i++) {
      for (let p = 0; p < newState.players.length; p++) {
        if (deck.length > 0) {
          const card = deck.pop()!;
          newState.players[p].hand.push(card);
        }
      }
    }

    // Set up discard pile
    const discardPile: Card[] = [];
    if (deck.length > 0) {
      discardPile.push(deck.pop()!);
    }

    // Reset game state for new round
    newState.deck = deck;
    newState.discardPile = discardPile;
    newState.melds = [];
    newState.currentPlayerIndex = 0;
    newState.gamePhase = "draw";

    return newState;
  };

  // Reset the entire game
  const resetGame = () => {
    setSelectedCards([]);
    setSelectedMeld(null);

    setGameState(() => {
      const deck = createDeck();
      const players: Player[] = [
        {
          id: "player1",
          name: "Player 1",
          hand: [],
          points: 0,
          hasMelded: false,
          meldPoints: 0,
        },
        {
          id: "player2",
          name: "Player 2",
          hand: [],
          points: 0,
          hasMelded: false,
          meldPoints: 0,
        },
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
        roundScores: {},
        currentRound: 1,
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
          <Button variant="outline" onClick={() => setShowRules(true)}>
            Rules
          </Button>
          <Button variant="outline" onClick={resetGame}>
            New Game
          </Button>
          <Link to="/">
            <Button variant="outline">Main Menu</Button>
          </Link>
        </div>
      </div>

      {/* Game status */}
      {gameState.winner ? (
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-8 mb-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{gameState.winner} Wins!</h2>
          <div className="mb-6">
            <h3 className="text-xl mb-2">Final Scores:</h3>
            <div className="flex justify-center gap-8">
              {gameState.players.map((player) => (
                <div key={player.id} className="text-center">
                  <div className="font-bold">{player.name}</div>
                  <div
                    className={
                      player.name === gameState.winner
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {player.points} points
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={resetGame} size="lg">
            Play Again
          </Button>
        </div>
      ) : (
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-2 md:mb-0">
              <h2 className="text-xl font-semibold">
                {currentPlayer.name}'s Turn
              </h2>
              <p className="text-white/70">
                Phase:{" "}
                {gameState.gamePhase.charAt(0).toUpperCase() +
                  gameState.gamePhase.slice(1)}
              </p>
            </div>

            <div className="flex gap-4 items-center">
              <div className="text-center">
                <div className="text-sm text-white/70">Round</div>
                <div className="font-bold">{gameState.currentRound}</div>
              </div>

              {gameState.players.map((player) => (
                <div key={player.id} className="text-center">
                  <div className="text-sm text-white/70">{player.name}</div>
                  <div className="font-bold">{player.points} pts</div>
                  {!player.hasMelded && player.id === currentPlayer.id && (
                    <Badge className="bg-amber-600 text-white text-xs">
                      Need {FIRST_MELD_POINTS}+ pts to meld
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
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
              {gameState.melds.map((meld) => {
                const isSelected = selectedMeld?.id === meld.id;
                const ownerName =
                  gameState.players.find((p) => p.id === meld.playerId)?.name ||
                  "Unknown";

                return (
                  <div
                    key={meld.id}
                    className={`bg-black/20 p-3 rounded-lg border-2 ${
                      isSelected ? "border-blue-500" : "border-transparent"
                    } cursor-pointer transition-all`}
                    onClick={() => handleMeldClick(meld)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-white/70">
                        {meld.type === "set" ? "Set" : "Run"} -{" "}
                        {calculatePoints(meld.cards)} points
                      </div>
                      <div className="text-xs text-white/60">{ownerName}</div>
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
                    {isSelected && (
                      <div className="mt-2 text-blue-300 text-sm">
                        Select a card from your hand to add to this {meld.type}
                      </div>
                    )}
                  </div>
                );
              })}
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
                  gameState.gamePhase !== "meld" ||
                  selectedCards.length < 3 ||
                  selectedMeld !== null
                }
              >
                Create Meld
              </Button>
              <Button
                onClick={discardCard}
                disabled={
                  gameState.gamePhase !== "meld" ||
                  selectedCards.length !== 1 ||
                  selectedMeld !== null
                }
              >
                Discard
              </Button>
              {selectedMeld && (
                <Button
                  onClick={() => setSelectedMeld(null)}
                  variant="destructive"
                >
                  Cancel Selection
                </Button>
              )}
            </div>

            {selectedCards.length >= 3 &&
              gameState.gamePhase === "meld" &&
              !selectedMeld && (
                <div className="mt-4 p-2 bg-black/20 rounded-lg">
                  <div className="text-sm mb-1">
                    Selected cards worth: {calculatePoints(selectedCards)}{" "}
                    points
                  </div>
                  {!currentPlayer.hasMelded && (
                    <div className="text-xs text-amber-300">
                      First meld requires at least {FIRST_MELD_POINTS} points
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Player's hand */}
      <div className="mt-4 bg-black/30 backdrop-blur-md rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-4">
          {currentPlayer.name}'s Hand ({calculatePoints(currentPlayer.hand)}{" "}
          points)
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

      {/* Rules dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tunisian Rami Rules</DialogTitle>
            <DialogDescription>
              Learn how to play the traditional Tunisian Rami card game
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-left">
            <div>
              <h3 className="text-lg font-bold">Objective</h3>
              <p>
                Be the first player to get rid of all your cards by forming
                valid combinations.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold">Card Values</h3>
              <ul className="list-disc pl-5">
                <li>Ace: 1 point</li>
                <li>Number cards (2-10): Face value</li>
                <li>Face cards (J, Q, K): 10 points each</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold">Valid Combinations</h3>
              <ul className="list-disc pl-5">
                <li>
                  <strong>Sets:</strong> 3 or 4 cards of the same rank but
                  different suits (e.g., 7♥, 7♠, 7♣)
                </li>
                <li>
                  <strong>Runs:</strong> 3 or more consecutive cards of the same
                  suit (e.g., 4♥, 5♥, 6♥)
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold">Gameplay</h3>
              <ol className="list-decimal pl-5">
                <li>Each player is dealt 10 cards.</li>
                <li>
                  On your turn:
                  <ul className="list-disc pl-5">
                    <li>
                      Draw a card from either the deck or the discard pile
                    </li>
                    <li>Form and lay down valid combinations (optional)</li>
                    <li>Add cards to existing combinations (optional)</li>
                    <li>Discard one card to end your turn</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-bold">First Meld Requirement</h3>
              <p>Your first meld must be worth at least 51 points.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold">Winning</h3>
              <p>
                The first player to get rid of all their cards wins the round.
                Points in opponents' hands are added to their scores. The player
                with the lowest score after multiple rounds wins the game.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalGame;
