import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { GameCard, Suit, Rank } from "@/components/GameCard";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Types for multiplayer game
type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  isJoker?: boolean;
};

type Meld = {
  id: string;
  cards: Card[];
  type: "set" | "run";
  playerId: string;
};

type Player = {
  id: string;
  name: string;
  isReady: boolean;
  isConnected: boolean;
  hand: Card[];
  points: number;
  hasLaidInitial51: boolean;
};

type GameRoom = {
  id: string;
  host: string;
  players: Player[];
  state: "waiting" | "playing" | "ended";
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  melds: Meld[];
  winner: string | null;
  roundScores: Record<string, number>;
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

const Multiplayer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Simulated game room for demonstration
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedMeld, setSelectedMeld] = useState<Meld | null>(null);
  const [yourTurn, setYourTurn] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);

  // Simulate creating a new game
  const handleCreateGame = () => {
    if (!playerName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    // Generate a random game ID
    const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Simulate API call delay
    setTimeout(() => {
      // Create a player ID
      const newPlayerId =
        "player_" + Math.random().toString(36).substring(2, 9);

      // Create a simulated game room
      const newGameRoom: GameRoom = {
        id: newGameId,
        host: newPlayerId,
        players: [
          {
            id: newPlayerId,
            name: playerName,
            isReady: true,
            isConnected: true,
            hand: [],
            points: 0,
            hasLaidInitial51: false,
          },
        ],
        state: "waiting",
        currentPlayerIndex: 0,
        deck: [],
        discardPile: [],
        melds: [],
        winner: null,
        roundScores: {},
        currentRound: 1,
      };

      setGameRoom(newGameRoom);
      setPlayerId(newPlayerId);
      setGameId(newGameId);
      setIsCreating(false);
      setShowSetup(false);

      // Notify user
      toast({
        title: "Game created",
        description: `Share code ${newGameId} with friends to join`,
      });

      // Simulate another player joining after a delay
      setTimeout(() => {
        if (Math.random() > 0.3) {
          // 70% chance a player will join
          simulatePlayerJoining();
        }
      }, 10000);
    }, 1500);
  };

  // Simulate joining an existing game
  const handleJoinGame = () => {
    if (!gameId.trim() || !playerName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both game code and your name.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    // Simulate API call delay
    setTimeout(() => {
      // Check if game exists (using random for simulation)
      const gameExists = Math.random() > 0.2; // 80% chance game exists

      if (!gameExists) {
        toast({
          title: "Game not found",
          description:
            "The game code you entered doesn't exist or has expired.",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }

      // Create a player ID
      const newPlayerId =
        "player_" + Math.random().toString(36).substring(2, 9);

      // Create a simulated game room with existing players
      const existingPlayers = [
        {
          id: "host_" + Math.random().toString(36).substring(2, 9),
          name: "Host Player",
          isReady: true,
          isConnected: true,
          hand: [],
          points: 0,
          hasLaidInitial51: false,
        },
      ];

      // Add more players randomly
      if (Math.random() > 0.5) {
        existingPlayers.push({
          id: "player_" + Math.random().toString(36).substring(2, 9),
          name: "Random Player",
          isReady: Math.random() > 0.5,
          isConnected: true,
          hand: [],
          points: 0,
          hasLaidInitial51: false,
        });
      }

      // Add the joining player
      existingPlayers.push({
        id: newPlayerId,
        name: playerName,
        isReady: false,
        isConnected: true,
        hand: [],
        points: 0,
        hasLaidInitial51: false,
      });

      const newGameRoom: GameRoom = {
        id: gameId,
        host: existingPlayers[0].id,
        players: existingPlayers,
        state: "waiting",
        currentPlayerIndex: 0,
        deck: [],
        discardPile: [],
        melds: [],
        winner: null,
        roundScores: {},
        currentRound: 1,
      };

      setGameRoom(newGameRoom);
      setPlayerId(newPlayerId);
      setIsJoining(false);
      setShowSetup(false);

      toast({
        title: "Joined game",
        description: `You've joined game ${gameId}`,
      });
    }, 1500);
  };

  // Simulate another player joining
  const simulatePlayerJoining = () => {
    if (!gameRoom) return;

    // Simulate a new player joining
    const newPlayer: Player = {
      id: "player_" + Math.random().toString(36).substring(2, 9),
      name: "Player " + Math.floor(Math.random() * 100),
      isReady: false,
      isConnected: true,
      hand: [],
      points: 0,
      hasLaidInitial51: false,
    };

    setGameRoom((prevRoom) => {
      if (!prevRoom) return null;
      return {
        ...prevRoom,
        players: [...prevRoom.players, newPlayer],
      };
    });

    toast({
      title: "Player joined",
      description: `${newPlayer.name} has joined the game`,
    });
  };

  // Toggle ready status
  const toggleReady = () => {
    if (!gameRoom || !playerId) return;

    setGameRoom((prevRoom) => {
      if (!prevRoom) return null;

      // Find and update the player
      const updatedPlayers = prevRoom.players.map((player) => {
        if (player.id === playerId) {
          return { ...player, isReady: !player.isReady };
        }
        return player;
      });

      return {
        ...prevRoom,
        players: updatedPlayers,
      };
    });

    // Check if all players are ready and start game if host
    setTimeout(() => {
      if (gameRoom && playerId === gameRoom.host) {
        const allReady = gameRoom.players.every((player) => player.isReady);
        if (allReady && gameRoom.players.length >= 2) {
          startGame();
        }
      }
    }, 500);
  };

  // Start the game (host only)
  const startGame = () => {
    if (!gameRoom || playerId !== gameRoom.host) return;

    toast({
      title: "Starting game",
      description: "Dealing cards and setting up the game...",
    });

    // Simulate game starting delay
    setTimeout(() => {
      setGameRoom((prevRoom) => {
        if (!prevRoom) return null;

        return {
          ...prevRoom,
          state: "playing",
        };
      });

      simulateGameplay();
    }, 2000);
  };

  // Simulate some basic gameplay for demonstration
  const simulateGameplay = () => {
    // Set a random player's turn
    setYourTurn(Math.random() > 0.5);

    // Simulate occasional connection issues
    setTimeout(() => {
      if (Math.random() > 0.7) {
        setConnectionIssue(true);

        setTimeout(() => {
          setConnectionIssue(false);
        }, 5000);
      }
    }, 15000);
  };

  // Copy game code to clipboard
  const copyGameCode = () => {
    if (!gameRoom) return;

    navigator.clipboard
      .writeText(gameRoom.id)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        toast({
          title: "Copy failed",
          description: "Couldn't copy the game code to clipboard",
          variant: "destructive",
        });
      });
  };

  // Leave the game and return to setup
  const leaveGame = () => {
    // Confirm before leaving
    if (window.confirm("Are you sure you want to leave this game?")) {
      setGameRoom(null);
      setPlayerId("");
      setShowSetup(true);
      setSelectedCards([]);
      setSelectedMeld(null);

      toast({
        title: "Left game",
        description: "You've left the multiplayer game",
      });
    }
  };

  // If in setup mode, show the join/create game interface
  if (showSetup) {
    return (
      <div className="min-h-screen bg-brown-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-black/20 backdrop-blur-md rounded-xl p-8 border border-white/10 shadow-2xl">
            <Link
              to="/"
              className="inline-block mb-6 text-white/80 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block mr-2"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Back to Menu
            </Link>

            <h1 className="text-3xl font-bold text-white mb-6 text-shadow">
              Multiplayer Game
            </h1>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="playerName" className="text-white">
                  Your Name
                </Label>
                <Input
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4">
                <div className="p-4 bg-black/30 rounded-lg border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Create New Game
                  </h2>
                  <Button
                    onClick={handleCreateGame}
                    className="w-full"
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating..." : "Create Game"}
                  </Button>
                </div>

                <div className="p-4 bg-black/30 rounded-lg border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Join Existing Game
                  </h2>
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="gameId" className="text-white">
                      Game Code
                    </Label>
                    <Input
                      id="gameId"
                      value={gameId}
                      onChange={(e) => setGameId(e.target.value.toUpperCase())}
                      placeholder="Enter game code"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      maxLength={6}
                    />
                  </div>
                  <Button
                    onClick={handleJoinGame}
                    className="w-full"
                    disabled={isJoining}
                  >
                    {isJoining ? "Joining..." : "Join Game"}
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowRules(true)}
                  className="text-white bg-white/10 border-white/20 hover:bg-white/20 hover:text-white"
                >
                  Game Rules
                </Button>
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
                  <RulesContent />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If in game, show the game lobby or game interface
  return (
    <div className="min-h-screen bg-brown-900 flex flex-col p-4 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tunisian Rami - Online Game</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRules(true)}
            className="text-white bg-white/10 border-white/20"
          >
            Rules
          </Button>
          <Button
            variant="outline"
            onClick={leaveGame}
            className="text-white bg-white/10 border-white/20"
          >
            Leave Game
          </Button>
        </div>
      </div>

      {connectionIssue && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Issues</AlertTitle>
          <AlertDescription>
            We're having trouble connecting to the game server. Trying to
            reconnect...
          </AlertDescription>
        </Alert>
      )}

      {/* Game code and invite */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="md:flex items-center gap-3">
            <div className="text-white/70 text-sm">Game Code:</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold">
                {gameRoom?.id}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyGameCode}
                className="text-white bg-white/10 border-white/20 h-8"
              >
                {copySuccess ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {gameRoom?.state === "waiting" && playerId === gameRoom.host && (
            <Button
              onClick={startGame}
              disabled={
                gameRoom.players.length < 2 ||
                !gameRoom.players.every((p) => p.isReady)
              }
              className="mt-2 md:mt-0"
            >
              Start Game
            </Button>
          )}
        </div>
      </div>

      {/* Game state: waiting for players */}
      {gameRoom?.state === "waiting" && (
        <div className="flex-grow bg-black/30 backdrop-blur-md rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Waiting for Players
          </h2>

          <div className="max-w-2xl mx-auto">
            <div className="bg-black/20 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium mb-4">Players</h3>
              <div className="space-y-3">
                {gameRoom.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center bg-black/20 p-3 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${player.isConnected ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="font-medium">{player.name}</span>
                      {player.id === gameRoom.host && (
                        <Badge className="bg-amber-600">Host</Badge>
                      )}
                      {player.id === playerId && (
                        <Badge className="bg-blue-600">You</Badge>
                      )}
                    </div>
                    <div>
                      {player.isReady ? (
                        <Badge className="bg-green-600">Ready</Badge>
                      ) : (
                        <Badge className="bg-slate-600">Not Ready</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              {gameRoom.players.length < 2 ? (
                <div className="text-amber-300 mb-4">
                  Waiting for at least one more player to join...
                </div>
              ) : (
                <>
                  {!gameRoom.players.every((p) => p.isReady) ? (
                    <div className="text-amber-300 mb-4">
                      Waiting for all players to be ready...
                    </div>
                  ) : (
                    <div className="text-green-400 mb-4">
                      All players ready! Game can start.
                    </div>
                  )}
                </>
              )}

              {gameRoom.players.find((p) => p.id === playerId)?.isReady ? (
                <Button
                  onClick={toggleReady}
                  variant="outline"
                  className="text-white bg-red-600/70 hover:bg-red-700 border-red-500"
                >
                  Not Ready
                </Button>
              ) : (
                <Button
                  onClick={toggleReady}
                  variant="outline"
                  className="text-white bg-green-600/70 hover:bg-green-700 border-green-500"
                >
                  I'm Ready
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game state: playing */}
      {gameRoom?.state === "playing" && (
        <div className="flex-grow bg-black/30 backdrop-blur-md rounded-xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">
              {yourTurn ? "Your Turn" : `Waiting for other player's turn...`}
            </h2>

            {yourTurn ? (
              <div className="flex justify-center mt-2 gap-2">
                <Button disabled={!yourTurn}>Draw Card</Button>
                <Button disabled={!yourTurn}>Discard</Button>
              </div>
            ) : (
              <div className="animate-pulse text-amber-300 mt-2">
                Other player is making their move...
              </div>
            )}
          </div>

          <div className="bg-black/20 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium mb-3">Players</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {gameRoom.players.map((player) => (
                <div
                  key={player.id}
                  className={`${player.id === gameRoom.players[gameRoom.currentPlayerIndex].id ? "bg-amber-900/40 border-amber-500" : "bg-black/30"} p-3 rounded-md border border-white/10`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-2 h-2 rounded-full ${player.isConnected ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
                    <span className="font-medium">{player.name}</span>
                    {player.id === playerId && (
                      <Badge className="bg-blue-600 text-xs">You</Badge>
                    )}
                  </div>
                  <div className="text-sm text-white/70">
                    Cards: {player.id === playerId ? "14" : "?"}
                  </div>
                  <div className="text-sm text-white/70">
                    Points: {player.points}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium mb-3">Game Board</h3>
            <div className="text-center text-white/70 italic">
              This is a simulated online multiplayer interface. In a full
              implementation, this would show the game board with melds,
              draw/discard piles, and other game elements.
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-4 mt-8">
            <h3 className="text-lg font-medium mb-3">Your Hand</h3>
            <div className="flex justify-center">
              <div className="flex gap-1 flex-wrap justify-center">
                {/* Simulated hand - would be real cards in full implementation */}
                {Array.from({ length: 14 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0"
                    style={{ margin: "-10px 2px" }}
                  >
                    <GameCard
                      suit="hearts"
                      rank="K"
                      faceUp={true}
                      isJoker={index === 7}
                      style={{ width: "70px", height: "98px" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tunisian Rami Rules</DialogTitle>
            <DialogDescription>
              Learn how to play the traditional Tunisian Rami card game
            </DialogDescription>
          </DialogHeader>
          <RulesContent />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Rules content component
const RulesContent = () => (
  <div className="space-y-4 text-left">
    <div>
      <h3 className="text-lg font-bold">Objective</h3>
      <p>
        Be the first player to get rid of all your cards by forming valid
        combinations.
      </p>
    </div>

    <div>
      <h3 className="text-lg font-bold">Players & Deck</h3>
      <p>2 to 4 players play with 108 cards:</p>
      <ul className="list-disc pl-5">
        <li>2 full decks of 52 cards</li>
        <li>4 Jokers</li>
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-bold">Card Values</h3>
      <ul className="list-disc pl-5">
        <li>Ace: 1 point</li>
        <li>Number cards (2-10): Face value</li>
        <li>Face cards (J, Q, K): 10 points each</li>
        <li>Joker: Value of the card it substitutes</li>
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-bold">Valid Combinations</h3>
      <ul className="list-disc pl-5">
        <li>
          <strong>Sets:</strong> 3 or 4 cards of the same rank but different
          suits (e.g., 7♥, 7♠, 7♣)
        </li>
        <li>
          <strong>Runs:</strong> 3 or more consecutive cards of the same suit
          (e.g., 4♥, 5♥, 6♥)
        </li>
        <li>
          <strong>Jokers:</strong> Can substitute any card, limit of 1 joker per
          meld
        </li>
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-bold">Gameplay</h3>
      <ol className="list-decimal pl-5">
        <li>Each player is dealt 14 cards.</li>
        <li>
          On your turn:
          <ul className="list-disc pl-5">
            <li>Draw a card from either the deck or the discard pile</li>
            <li>
              If drawing from discard pile, you must use that card in a meld
              immediately
            </li>
            <li>Form and lay down valid combinations (optional)</li>
            <li>
              Add cards to existing combinations (optional, after first meld)
            </li>
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
      <h3 className="text-lg font-bold">"Rami Ndhif" (Clean Win)</h3>
      <p>
        If a player lays down all cards (including drawn card) in one turn with
        no previous melds, they get a "clean win" and opponents get double
        points.
      </p>
    </div>

    <div>
      <h3 className="text-lg font-bold">Winning</h3>
      <p>
        The first player to get rid of all their cards wins the round. Points in
        opponents' hands are added to their scores. When a player reaches 100
        points, the game ends and the player with the lowest score wins.
      </p>
    </div>
  </div>
);

export default Multiplayer;
