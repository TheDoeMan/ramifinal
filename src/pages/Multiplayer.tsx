import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
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
import { AlertCircle, Copy, CheckCircle } from "lucide-react";

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

// Create two standard decks of cards plus jokers (108 cards total)
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

  // Create 2 full decks
  for (let d = 0; d < 2; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          id: `${rank}-${suit}-${d}`,
          suit,
          rank,
          value: CARD_VALUES[rank],
        });
      }
    }
  }

  // Add 4 jokers
  for (let j = 0; j < 4; j++) {
    deck.push({
      id: `joker-${j}`,
      suit: "hearts", // Default suit, will be visually different
      rank: "A", // Default rank, will be visually different
      value: 0, // Value will be determined by what it substitutes
      isJoker: true,
    });
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

// Generate a unique ID for the player
const generatePlayerId = () => {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Generate a unique room code (6 characters)
const generateRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding characters that look similar
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Session storage helpers
const saveGameToSession = (gameRoom: GameRoom) => {
  try {
    sessionStorage.setItem(`game_${gameRoom.id}`, JSON.stringify(gameRoom));
    // Also store the last active game ID
    sessionStorage.setItem("lastActiveGame", gameRoom.id);
  } catch (error) {
    console.error("Error saving game to session storage:", error);
  }
};

const getGameFromSession = (gameId: string): GameRoom | null => {
  try {
    const gameData = sessionStorage.getItem(`game_${gameId}`);
    return gameData ? JSON.parse(gameData) : null;
  } catch (error) {
    console.error("Error retrieving game from session storage:", error);
    return null;
  }
};

const getAllGamesFromSession = (): GameRoom[] => {
  try {
    const games: GameRoom[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("game_")) {
        const gameId = key.replace("game_", "");
        const game = getGameFromSession(gameId);
        if (game) {
          games.push(game);
        }
      }
    }
    return games;
  } catch (error) {
    console.error("Error retrieving all games from session storage:", error);
    return [];
  }
};

const Multiplayer = () => {
  const { toast } = useToast();
  const [gameId, setGameId] = useState("");
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem("playerName") || "";
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [playerId, setPlayerId] = useState<string>("");
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedMeld, setSelectedMeld] = useState<Meld | null>(null);
  const [yourTurn, setYourTurn] = useState(false);

  // Check for existing games on component mount
  useEffect(() => {
    // Save player name to localStorage when it changes
    if (playerName) {
      localStorage.setItem("playerName", playerName);
    }

    // Check if there's a last active game in the session
    const lastGameId = sessionStorage.getItem("lastActiveGame");
    if (lastGameId) {
      const lastGame = getGameFromSession(lastGameId);
      if (lastGame) {
        // Look for player ID in localStorage
        const storedPlayerId = localStorage.getItem(`player_${lastGameId}`);
        if (
          storedPlayerId &&
          lastGame.players.some((p) => p.id === storedPlayerId)
        ) {
          setPlayerId(storedPlayerId);
          setGameRoom(lastGame);
          setShowSetup(false);
          setGameId(lastGameId);

          // Set your turn based on current player index
          const playerIndex = lastGame.players.findIndex(
            (p) => p.id === storedPlayerId,
          );
          setYourTurn(playerIndex === lastGame.currentPlayerIndex);
        }
      }
    }
  }, []);

  // Simulate a server update - update game state in session storage
  useEffect(() => {
    if (gameRoom) {
      saveGameToSession(gameRoom);
    }
  }, [gameRoom]);

  // Periodically simulate other player activity
  useEffect(() => {
    if (gameRoom && gameRoom.state === "playing") {
      const interval = setInterval(() => {
        // 20% chance of simulating player activity
        if (Math.random() > 0.8) {
          simulateOtherPlayerTurn();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [gameRoom]);

  // Create a new game room
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

    // Generate a new game code
    const newGameId = generateRoomCode();
    const newPlayerId = generatePlayerId();

    // Initial player data
    const playerData: Player = {
      id: newPlayerId,
      name: playerName,
      isReady: true,
      isConnected: true,
      hand: [],
      points: 0,
      hasLaidInitial51: false,
    };

    // Initial game room data
    const gameRoomData: GameRoom = {
      id: newGameId,
      host: newPlayerId,
      players: [playerData],
      state: "waiting",
      currentPlayerIndex: 0,
      deck: [],
      discardPile: [],
      melds: [],
      winner: null,
      roundScores: {},
      currentRound: 1,
    };

    // Save player ID to localStorage for session resumption
    localStorage.setItem(`player_${newGameId}`, newPlayerId);

    // Save game to session storage
    saveGameToSession(gameRoomData);

    setPlayerId(newPlayerId);
    setGameId(newGameId);
    setGameRoom(gameRoomData);
    setShowSetup(false);
    setIsCreating(false);

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
    }, 5000);
  };

  // Join an existing game
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

    // Check if game exists in session storage
    const existingGame = getGameFromSession(gameId);

    if (!existingGame) {
      // For demo purposes, create a simulated game if not found
      const simulatedGameId = gameId;
      const newPlayerId = generatePlayerId();

      // Create a host player
      const hostPlayer: Player = {
        id: "host_" + Math.random().toString(36).substring(2, 9),
        name: "Host Player",
        isReady: true,
        isConnected: true,
        hand: [],
        points: 0,
        hasLaidInitial51: false,
      };

      // Add more players randomly
      const existingPlayers: Player[] = [hostPlayer];
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
      const joinPlayer: Player = {
        id: newPlayerId,
        name: playerName,
        isReady: false,
        isConnected: true,
        hand: [],
        points: 0,
        hasLaidInitial51: false,
      };
      existingPlayers.push(joinPlayer);

      const newGameRoom: GameRoom = {
        id: simulatedGameId,
        host: hostPlayer.id,
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

      // Save player ID to localStorage for session resumption
      localStorage.setItem(`player_${simulatedGameId}`, newPlayerId);

      // Save game to session storage
      saveGameToSession(newGameRoom);

      setPlayerId(newPlayerId);
      setGameRoom(newGameRoom);
      setIsJoining(false);
      setShowSetup(false);

      toast({
        title: "Joined game",
        description: `You've joined game ${simulatedGameId}`,
      });
      return;
    }

    // If game exists, join it
    if (existingGame.state === "playing") {
      toast({
        title: "Game in progress",
        description: "This game has already started. You cannot join it now.",
        variant: "destructive",
      });
      setIsJoining(false);
      return;
    }

    // Check if game is full (max 4 players)
    if (existingGame.players.length >= 4) {
      toast({
        title: "Game is full",
        description: "This game already has the maximum number of players (4).",
        variant: "destructive",
      });
      setIsJoining(false);
      return;
    }

    // Generate player ID and add to game
    const newPlayerId = generatePlayerId();
    const playerData: Player = {
      id: newPlayerId,
      name: playerName,
      isReady: false,
      isConnected: true,
      hand: [],
      points: 0,
      hasLaidInitial51: false,
    };

    // Add player to the game
    existingGame.players.push(playerData);

    // Save player ID to localStorage for session resumption
    localStorage.setItem(`player_${gameId}`, newPlayerId);

    // Save updated game to session storage
    saveGameToSession(existingGame);

    setPlayerId(newPlayerId);
    setGameRoom(existingGame);
    setIsJoining(false);
    setShowSetup(false);

    toast({
      title: "Joined game",
      description: `You've joined game ${gameId}`,
    });
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
      const updatedRoom = {
        ...prevRoom,
        players: [...prevRoom.players, newPlayer],
      };
      saveGameToSession(updatedRoom);
      return updatedRoom;
    });

    toast({
      title: "Player joined",
      description: `${newPlayer.name} has joined the game`,
    });

    // Simulate player ready after a delay
    setTimeout(() => {
      setGameRoom((prevRoom) => {
        if (!prevRoom) return null;
        const updatedPlayers = prevRoom.players.map((p) =>
          p.id === newPlayer.id ? { ...p, isReady: true } : p,
        );
        const updatedRoom = {
          ...prevRoom,
          players: updatedPlayers,
        };
        saveGameToSession(updatedRoom);
        return updatedRoom;
      });
    }, 3000);
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

      const updatedRoom = {
        ...prevRoom,
        players: updatedPlayers,
      };

      saveGameToSession(updatedRoom);
      return updatedRoom;
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

    // Check if there are at least 2 players
    if (gameRoom.players.length < 2) {
      toast({
        title: "Not enough players",
        description: "You need at least 2 players to start the game.",
        variant: "destructive",
      });
      return;
    }

    // Check if all players are ready
    const allReady = gameRoom.players.every((player) => player.isReady);
    if (!allReady) {
      toast({
        title: "Players not ready",
        description: "All players must be ready to start the game.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Starting game",
      description: "Dealing cards and setting up the game...",
    });

    // Generate the deck and deal cards
    const deck = createDeck();
    const updatedPlayers = gameRoom.players.map((player) => {
      const hand: Card[] = [];
      // Deal 14 cards to each player
      for (let i = 0; i < 14; i++) {
        if (deck.length > 0) {
          const card = deck.pop()!;
          hand.push(card);
        }
      }
      return { ...player, hand };
    });

    // Create initial discard pile with one card
    const discardPile: Card[] = [];
    if (deck.length > 0) {
      discardPile.push(deck.pop()!);
    }

    // Update game state
    setGameRoom((prevRoom) => {
      if (!prevRoom) return null;

      const updatedRoom = {
        ...prevRoom,
        state: "playing",
        players: updatedPlayers,
        deck,
        discardPile,
        currentPlayerIndex: 0,
      };

      saveGameToSession(updatedRoom);
      return updatedRoom;
    });

    // If it's your turn, update state
    if (playerId === gameRoom.players[0].id) {
      setYourTurn(true);
    }
  };

  // Simulate other player making a turn
  const simulateOtherPlayerTurn = () => {
    if (!gameRoom || gameRoom.state !== "playing") return;

    // Only simulate if it's not your turn
    if (!yourTurn) return;

    setGameRoom((prevRoom) => {
      if (!prevRoom) return null;

      // Move to next player
      const nextPlayerIndex =
        (prevRoom.currentPlayerIndex + 1) % prevRoom.players.length;

      const updatedRoom = {
        ...prevRoom,
        currentPlayerIndex: nextPlayerIndex,
      };

      saveGameToSession(updatedRoom);
      return updatedRoom;
    });

    // If it's now your turn, update state
    const nextPlayerIndex =
      (gameRoom.currentPlayerIndex + 1) % gameRoom.players.length;
    setYourTurn(gameRoom.players[nextPlayerIndex].id === playerId);
  };

  // Copy game code to clipboard
  const copyGameCode = () => {
    if (!gameRoom) return;

    navigator.clipboard
      .writeText(gameRoom.id)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast({
          title: "Code copied",
          description: "Game code copied to clipboard",
        });
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
      if (gameRoom) {
        // Remove player from the game
        const updatedPlayers = gameRoom.players.filter(
          (p) => p.id !== playerId,
        );

        // If this is the last player, remove the game
        if (updatedPlayers.length === 0) {
          sessionStorage.removeItem(`game_${gameRoom.id}`);
        } else {
          // If host is leaving, transfer host status
          let updatedHost = gameRoom.host;
          if (playerId === gameRoom.host && updatedPlayers.length > 0) {
            updatedHost = updatedPlayers[0].id;
          }

          const updatedRoom = {
            ...gameRoom,
            players: updatedPlayers,
            host: updatedHost,
          };

          saveGameToSession(updatedRoom);
        }

        // Remove player ID from localStorage
        localStorage.removeItem(`player_${gameRoom.id}`);
      }

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
      <div
        className="min-h-screen bg-brown-900 flex items-center justify-center p-4"
        style={{
          backgroundImage:
            "url(https://cdn.builder.io/api/v1/image/assets%2F547c7d5bd6fb430fa6db21f988ef40a9%2F61eb53c0582a4f6ab622b80bdc878549)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
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
                    disabled={isCreating || !playerName.trim()}
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
                    disabled={isJoining || !gameId.trim() || !playerName.trim()}
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
            </div>
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
            <RulesContent />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // If in game, show the game lobby or game interface
  return (
    <div
      className="min-h-screen bg-brown-900 flex flex-col p-4 text-white"
      style={{
        backgroundImage:
          "url(https://cdn.builder.io/api/v1/image/assets%2F547c7d5bd6fb430fa6db21f988ef40a9%2F61eb53c0582a4f6ab622b80bdc878549)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
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
                {copySuccess ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
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
                {gameRoom &&
                  gameRoom.players.map((player) => (
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
              {gameRoom && gameRoom.players.length < 2 ? (
                <div className="text-amber-300 mb-4">
                  Waiting for at least one more player to join...
                </div>
              ) : (
                <>
                  {gameRoom && !gameRoom.players.every((p) => p.isReady) ? (
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

              {gameRoom &&
              playerId &&
              gameRoom.players.find((p) => p.id === playerId)?.isReady ? (
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
              {gameRoom &&
                gameRoom.players.map((player) => (
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
                      Cards:{" "}
                      {player.id === playerId ? player.hand?.length || 0 : "?"}
                    </div>
                    <div className="text-sm text-white/70">
                      Points: {player.points}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {gameRoom &&
            playerId &&
            gameRoom.players.find((p) => p.id === playerId)?.hand && (
              <div className="bg-black/20 rounded-lg p-4 mt-8">
                <h3 className="text-lg font-medium mb-3">Your Hand</h3>
                <div className="flex justify-center">
                  <div className="flex gap-1 flex-wrap justify-center">
                    {gameRoom.players
                      .find((p) => p.id === playerId)
                      ?.hand.map((card, index) => (
                        <div
                          key={card.id || index}
                          className="flex-shrink-0"
                          style={{ margin: "-10px 2px" }}
                        >
                          <GameCard
                            suit={card.suit}
                            rank={card.rank}
                            faceUp={true}
                            isJoker={card.isJoker}
                            style={{ width: "70px", height: "98px" }}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
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
