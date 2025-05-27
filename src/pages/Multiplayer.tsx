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
import { AlertCircle, Copy, CheckCircle } from "lucide-react";
// Try Firebase first, fallback to local session manager
import {
  createGameSession as createFirebaseSession,
  joinGameSession as joinFirebaseSession,
  getGameSession as getFirebaseSession,
  updatePlayerStatus as updateFirebasePlayerStatus,
  leaveGameSession as leaveFirebaseSession,
  startGameSession as startFirebaseSession,
  startSessionMonitoring as startFirebaseMonitoring,
  checkForExistingSession as checkFirebaseSession,
  type GameSession,
  type SessionPlayer,
} from "@/utils/firebaseSessionManager";

import {
  createGameSession as createLocalSession,
  joinGameSession as joinLocalSession,
  getGameSession as getLocalSession,
  updatePlayerStatus as updateLocalPlayerStatus,
  leaveGameSession as leaveLocalSession,
  startGameSession as startLocalSession,
  startSessionMonitoring as startLocalMonitoring,
  checkForExistingSession as checkLocalSession,
} from "@/utils/sessionManager";

// Detect if Firebase is properly configured
const isFirebaseConfigured = () => {
  // Firebase is now properly configured with actual credentials
  return true;
};

// Session manager functions that automatically choose Firebase or local
const createGameSession = isFirebaseConfigured() ? createFirebaseSession : createLocalSession;
const joinGameSession = isFirebaseConfigured() ? joinFirebaseSession : joinLocalSession;
const getGameSession = isFirebaseConfigured() ? getFirebaseSession : getLocalSession;
const updatePlayerStatus = isFirebaseConfigured() ? updateFirebasePlayerStatus : updateLocalPlayerStatus;
const leaveGameSession = isFirebaseConfigured() ? leaveFirebaseSession : leaveLocalSession;
const startGameSession = isFirebaseConfigured() ? startFirebaseSession : startLocalSession;
const startSessionMonitoring = isFirebaseConfigured() ? startFirebaseMonitoring : startLocalMonitoring;
const checkForExistingSession = isFirebaseConfigured() ? checkFirebaseSession : checkLocalSession;

// Types for multiplayer game
type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  isJoker?: boolean;
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

// Create a complete 108-card deck (2 standard decks + 4 jokers)
const createDeck = (): Card[] => {
  const cards: Card[] = [];
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  // Add two complete decks (104 cards)
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    suits.forEach(suit => {
      ranks.forEach(rank => {
        cards.push({
          id: `${suit}_${rank}_${deckNum}`,
          suit,
          rank,
          value: CARD_VALUES[rank],
          isJoker: false
        });
      });
    });
  }

  // Add 4 jokers
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `joker_${i}`,
      suit: "spades", // Default suit for jokers
      rank: "A", // Default rank for jokers
      value: 0, // Jokers adapt their value
      isJoker: true
    });
  }

  // Shuffle the deck
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
};

// Deal cards for game start
const dealCards = (deck: Card[], playerCount: number) => {
  const players: Card[][] = Array(playerCount).fill(null).map(() => []);
  const cardsPerPlayer = 14;

  // Deal 14 cards to each player
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < playerCount; p++) {
      if (deck.length > 0) {
        players[p].push(deck.pop()!);
      }
    }
  }

  return players;
};

// Game phase types for turn enforcement
type GamePhase = 'draw' | 'meld' | 'discard';

// Turn state to track what actions are allowed
type TurnState = {
  currentPhase: GamePhase;
  hasDrawn: boolean;
  drawnFromDiscard: boolean;
  drawnCard: Card | null;
  canEndTurn: boolean;
};

const Multiplayer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [yourTurn, setYourTurn] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [gameCards, setGameCards] = useState<{
    playerHands: Record<string, Card[]>;
    drawDeck: Card[];
    discardPile: Card[];
  } | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string>(''); // Player ID whose turn it is
  const [turnState, setTurnState] = useState<TurnState>({
    currentPhase: 'draw',
    hasDrawn: false,
    drawnFromDiscard: false,
    drawnCard: null,
    canEndTurn: false
  });

  // Check for existing session on component mount
  useEffect(() => {
    console.log("Multiplayer component mounted");
    console.log("Using session type:", isFirebaseConfigured() ? "Firebase (real-time)" : "Local (same device)");

    // Save player name to localStorage when it changes
    if (playerName) {
      localStorage.setItem("playerName", playerName);
    }

    // Check if there's a session to rejoin
    const { gameId: existingGameId, playerId: existingPlayerId } =
      checkForExistingSession();

    console.log(
      "Checking for existing session:",
      existingGameId,
      existingPlayerId,
    );

    if (existingGameId && existingPlayerId) {
      // Try to reconnect to existing session
      getGameSession(existingGameId).then((session) => {
        if (session) {
          console.log("Found existing session:", session);
          const playerExists = session.players.some(
            (p) => p.id === existingPlayerId,
          );

          if (playerExists) {
            console.log("Player exists in session, reconnecting");
            setGameId(existingGameId);
            setPlayerId(existingPlayerId);
            setGameSession(session);
            setShowSetup(false);

            // Start monitoring for session updates
            startSessionMonitoring(existingGameId, handleSessionUpdate);

            toast({
              title: "Session restored",
              description: "Reconnected to your previous game session",
            });
          } else {
            console.log("Player not found in existing session");
          }
        } else {
          console.log("No active session found with ID:", existingGameId);
        }
      });
    }
  }, []);

  // Handle session updates (called when session changes)
  const handleSessionUpdate = (updatedSession: GameSession) => {
    console.log("Session update received:", {
      id: updatedSession.id,
      players: updatedSession.players.length,
      lastUpdated: new Date(updatedSession.lastUpdated).toLocaleTimeString(),
    });

    // Add debug logs
    console.log("Session State:", updatedSession.state);
    console.log("Players:", updatedSession.players.map(p => ({
      name: p.name,
      id: p.id,
      isReady: p.isReady,
      isConnected: p.isConnected
    })));

    // Force a deep copy to ensure reactivity
    const sessionCopy = JSON.parse(JSON.stringify(updatedSession));

    // Store previous session state
    const currentSession = gameSession;

    // Always update if this is the first update
    const isFirstUpdate = !currentSession;

    // Only update if it's actually a new update or first update
    if (isFirstUpdate || sessionCopy.lastUpdated > lastUpdateTime) {
      console.log("Updating session state with:", {
        players: sessionCopy.players.map((p) => p.name),
        state: sessionCopy.state,
      });

      // Check for actual changes before showing notifications
      let hasPlayerChanges = false;
      let hasReadyChanges = false;
      let hasStateChange = false;

      if (!isFirstUpdate && currentSession) {
        // Check for new players
        if (sessionCopy.players.length > currentSession.players.length) {
          const newPlayers = sessionCopy.players.filter(
            (p) => !currentSession.players.some((cp) => cp.id === p.id),
          );

          if (newPlayers.length > 0) {
            hasPlayerChanges = true;
            newPlayers.forEach((player) => {
              console.log("New player joined:", player.name);
              toast({
                title: "Player joined",
                description: `${player.name} has joined the game`,
              });
            });
          }
        }

        // Check for ready status changes
        sessionCopy.players.forEach((player) => {
          const previousPlayerState = currentSession.players.find(
            (p) => p.id === player.id,
          );
          if (
            previousPlayerState &&
            !previousPlayerState.isReady &&
            player.isReady &&
            player.id !== playerId // Don't show notification for yourself
          ) {
            hasReadyChanges = true;
            console.log("Player became ready:", player.name);
            toast({
              title: "Player ready",
              description: `${player.name} is now ready`,
            });
          }
        });

        // Check for game state change
        if (currentSession.state === "waiting" && sessionCopy.state === "playing") {
          hasStateChange = true;
          console.log("Game state changed to playing");
          toast({
            title: "Game started",
            description: "The game is now starting!",
          });
          // Clear any countdown if game has started
          setCountdown(null);
          setIsCountingDown(false);
        }
      }

      // Update session state
      setGameSession(sessionCopy);
      setLastUpdateTime(sessionCopy.lastUpdated);

      // Auto-start countdown logic - only for host and only if there's an actual change
      const shouldStartCountdown = (
        sessionCopy.state === "waiting" &&
        sessionCopy.hostId === playerId &&
        sessionCopy.players.length >= 2 &&
        sessionCopy.players.every((p) => p.isReady) &&
        countdown === null && // Only start if no countdown is active
        (isFirstUpdate || hasPlayerChanges || hasReadyChanges) // Only start countdown on actual changes
      );

      console.log("Countdown check:", {
        state: sessionCopy.state,
        isHost: sessionCopy.hostId === playerId,
        hostId: sessionCopy.hostId,
        playerId: playerId,
        playerCount: sessionCopy.players.length,
        allReady: sessionCopy.players.every((p) => p.isReady),
        countdownActive: countdown !== null,
        shouldStart: shouldStartCountdown,
        readyStatus: sessionCopy.players.map(p => `${p.name}: ${p.isReady}`)
      });

      if (shouldStartCountdown) {
        console.log("✓ All conditions met - starting countdown");
        setIsCountingDown(true);
        setCountdown(5); // 5 second countdown
      }
    } else {
      console.log("Session update ignored - no newer data");
    }
  };

  // Single polling effect for session updates
  useEffect(() => {
    if (gameId && !showSetup && gameSession) {
      console.log("Setting up session polling for", gameSession.state);

      // Use different polling intervals based on state
      const pollInterval = gameSession.state === "waiting" ? 1000 : 2000;

      const interval = setInterval(() => {
        getGameSession(gameId).then((updatedSession) => {
          if (updatedSession && updatedSession.lastUpdated > lastUpdateTime) {
            console.log("Found newer session data during polling");
            handleSessionUpdate(updatedSession);
          }
        });
      }, pollInterval);

      return () => {
        console.log("Clearing session polling interval");
        clearInterval(interval);
      };
    }
  }, [gameId, showSetup, gameSession?.state, lastUpdateTime]);

  // Countdown effect for automatic game start
  useEffect(() => {
    if (countdown === null) return;

    console.log("⏰ Countdown effect running:", countdown);

    if (countdown <= 0) {
      // Start the game when countdown reaches zero
      console.log("🚀 Countdown reached zero - starting game");
      setIsCountingDown(false);
      setCountdown(null);

      // Call handleStartGame immediately - no delay needed
      handleStartGame();
      return;
    }

    const timer = setTimeout(() => {
      console.log("⏰ Countdown tick:", countdown - 1);
      setCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]); // Remove gameSession.id to prevent unnecessary restarts

  // Create a new game
  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Clear any existing session data first
      localStorage.removeItem("current_game_id");
      localStorage.removeItem("player_id");

      console.log("Creating new game session as", playerName);
      const { gameId: newGameId, playerId: newPlayerId } =
        await createGameSession(playerName);

      console.log("Game created:", newGameId, "Player ID:", newPlayerId);

      setGameId(newGameId);
      setPlayerId(newPlayerId);

      console.log("Setting playerId to:", newPlayerId);

      // Get initial session state
      const session = await getGameSession(newGameId);
      console.log("Initial session state:", session);

      if (session) {
        setGameSession(session);

        // Start monitoring for session updates
        startSessionMonitoring(newGameId, handleSessionUpdate);
        console.log("Started session monitoring");

        setShowSetup(false);

        toast({
          title: "Game created",
          description: `Share code ${newGameId} with friends to join`,
        });
      } else {
        throw new Error("Failed to retrieve session after creation");
      }
    } catch (error) {
      console.error("Error creating game:", error);
      toast({
        title: "Error creating game",
        description: "There was a problem creating the game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Join an existing game
  const handleJoinGame = async () => {
    if (!gameId.trim() || !playerName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both game code and your name.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // Clear any existing session data first
      localStorage.removeItem("current_game_id");
      localStorage.removeItem("player_id");

      // Convert game code to uppercase
      const formattedGameId = gameId.toUpperCase();
      console.log("Joining game", formattedGameId, "as", playerName);

      const {
        success,
        playerId: newPlayerId,
        error,
      } = await joinGameSession(formattedGameId, playerName);

      if (!success) {
        console.log("Join game failed:", error);
        toast({
          title: "Error joining game",
          description: error || "Could not join the game",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }

      console.log("Join successful, player ID:", newPlayerId);
      setPlayerId(newPlayerId!);

      console.log("Setting playerId to:", newPlayerId);

      // Get session details - retry a few times if needed
      let session = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        session = await getGameSession(formattedGameId);
        if (session && session.players.some((p) => p.id === newPlayerId)) {
          break;
        }
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      console.log("Retrieved session after joining:", session);

      if (!session) {
        console.error("Session not found after joining!");
        toast({
          title: "Error joining game",
          description: "Session data not found after joining",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }

      setGameSession(session);
      setGameId(formattedGameId);

      // Start monitoring for session updates
      startSessionMonitoring(formattedGameId, handleSessionUpdate);
      console.log("Started session monitoring");

      setShowSetup(false);

      toast({
        title: "Joined game",
        description: `You've joined game ${formattedGameId}`,
      });
    } catch (error) {
      console.error("Error joining game:", error);
      toast({
        title: "Error joining game",
        description: "There was a problem joining the game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Toggle ready status
  const handleToggleReady = async () => {
    if (!gameSession || !playerId) return;

    const currentPlayer = gameSession.players.find((p) => p.id === playerId);
    if (!currentPlayer) return;

    try {
      // Optimistically update UI first for better UX
      setGameSession((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, isReady: !p.isReady } : p,
          ),
          lastUpdated: Date.now(),
        };
      });

      // Then update the server/storage
      const success = await updatePlayerStatus(
        gameSession.id,
        playerId,
        !currentPlayer.isReady,
      );

      if (!success) {
        // Revert the optimistic update if the server update failed
        setGameSession((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            players: prev.players.map((p) =>
              p.id === playerId ? { ...p, isReady: currentPlayer.isReady } : p,
            ),
          };
        });

        throw new Error("Failed to update ready status");
      }

      // Check if this update makes all players ready
      const updatedSession = await getGameSession(gameSession.id);
      if (updatedSession) {
        handleSessionUpdate(updatedSession);
      }
    } catch (error) {
      console.error("Error toggling ready status:", error);
      toast({
        title: "Error",
        description: "Failed to update ready status",
        variant: "destructive",
      });
    }
  };

  // Start the game (host only)
  const handleStartGame = async () => {
    console.log("🎮 handleStartGame called", {
      gameSession: !!gameSession,
      playerId,
      hostId: gameSession?.hostId,
      isHost: playerId === gameSession?.hostId,
      playerCount: gameSession?.players.length,
      allReady: gameSession?.players.every((player) => player.isReady),
      currentState: gameSession?.state
    });

    if (!gameSession) {
      console.error("❌ No game session available");
      return;
    }

    if (playerId !== gameSession.hostId) {
      console.error("❌ Not the host - aborting start", { playerId, hostId: gameSession.hostId });
      return;
    }

    // Check if there are enough players
    if (gameSession.players.length < 2) {
      console.error("❌ Not enough players to start");
      toast({
        title: "Not enough players",
        description: "You need at least 2 players to start the game",
        variant: "destructive",
      });
      return;
    }

    // Check if all players are ready
    const allReady = gameSession.players.every((player) => player.isReady);
    if (!allReady) {
      console.error("❌ Not all players ready:", gameSession.players.map(p => `${p.name}: ${p.isReady}`));
      toast({
        title: "Players not ready",
        description: "All players must be ready to start the game",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("✅ All checks passed - starting game process");

      // Cancel any active countdown immediately
      setCountdown(null);
      setIsCountingDown(false);

      // Update the session in storage
      console.log("📡 Calling startGameSession...");
      const success = await startGameSession(gameSession.id, playerId);
      console.log("📡 Backend game start result:", success);

      if (success) {
        console.log("✅ Backend success - updating local state");

        // Initialize game cards
        const deck = createDeck();
        const playerCount = gameSession.players.length;
        const playerHands = dealCards(deck, playerCount);
        const handsMap: Record<string, Card[]> = {};

        gameSession.players.forEach((player, index) => {
          handsMap[player.id] = playerHands[index] || [];
        });

        // Set up game cards state
        setGameCards({
          playerHands: handsMap,
          drawDeck: deck, // Remaining cards after dealing
          discardPile: [] // Start with empty discard pile
        });

        // Initialize turn state - first player starts
        const firstPlayer = gameSession.players[0];
        setCurrentTurn(firstPlayer.id);
        setTurnState({
          currentPhase: 'draw',
          hasDrawn: false,
          drawnFromDiscard: false,
          drawnCard: null,
          canEndTurn: false
        });

        // Update local state
        setGameSession((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            state: "playing" as const,
            lastUpdated: Date.now(),
          };
          console.log("🎯 Local state updated to playing");
          return updated;
        });

        // Show success feedback
        toast({
          title: "Game started!",
          description: "The game has begun!",
        });
      } else {
        console.error("❌ Backend failed to start game");
        throw new Error("Failed to start game on backend");
      }

    } catch (error) {
      console.error("💥 Error starting game:", error);

      // Reset states on error
      setCountdown(null);
      setIsCountingDown(false);

      toast({
        title: "Error",
        description: "Failed to start the game. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Copy game code to clipboard
  const copyGameCode = () => {
    if (!gameSession) return;

    navigator.clipboard
      .writeText(gameSession.id)
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

  // Leave the game
  const handleLeaveGame = async () => {
    if (!gameSession || !playerId) return;

    // Confirm before leaving
    if (window.confirm("Are you sure you want to leave this game?")) {
      try {
        await leaveGameSession(gameSession.id, playerId);

        setGameSession(null);
        setPlayerId("");
        setShowSetup(true);

        toast({
          title: "Left game",
          description: "You've left the multiplayer game",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to leave the game",
          variant: "destructive",
        });
      }
    }
  };

  // Draw card from deck
  const handleDrawFromDeck = () => {
    if (!gameCards) return;

    // Check if it's this player's turn
    if (currentTurn !== playerId) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to draw a card",
        variant: "destructive",
      });
      return;
    }

    // Check if player can draw (must be in draw phase and hasn't drawn yet)
    if (turnState.currentPhase !== 'draw' || turnState.hasDrawn) {
      toast({
        title: "Invalid action",
        description: turnState.hasDrawn ? "You've already drawn a card this turn" : "You can only draw during the draw phase",
        variant: "destructive",
      });
      return;
    }

    // Check hand size limit (shouldn't exceed 15 cards)
    const currentHandSize = gameCards.playerHands[playerId]?.length || 0;
    if (currentHandSize >= 15) {
      toast({
        title: "Hand size limit",
        description: "You cannot have more than 15 cards in your hand",
        variant: "destructive",
      });
      return;
    }

    if (gameCards.drawDeck.length === 0) {
      toast({
        title: "Empty deck",
        description: "No more cards in the draw deck",
        variant: "destructive",
      });
      return;
    }

    setGameCards(prev => {
      if (!prev) return prev;
      
      const newDrawDeck = [...prev.drawDeck];
      const drawnCard = newDrawDeck.pop();
      
      if (!drawnCard) return prev;

      const newPlayerHands = { ...prev.playerHands };
      newPlayerHands[playerId] = [...(newPlayerHands[playerId] || []), drawnCard];

      return {
        ...prev,
        drawDeck: newDrawDeck,
        playerHands: newPlayerHands
      };
    });

    // Update turn state
    setTurnState(prev => ({
      ...prev,
      hasDrawn: true,
      drawnFromDiscard: false,
      drawnCard: gameCards.drawDeck[gameCards.drawDeck.length - 1],
      currentPhase: 'meld'
    }));

    toast({
      title: "Card drawn",
      description: "You drew a card from the deck. You may now meld or discard.",
    });
  };

  // Draw card from discard pile
  const handleDrawFromDiscard = () => {
    if (!gameCards || gameCards.discardPile.length === 0) {
      toast({
        title: "Empty discard pile",
        description: "No cards in the discard pile",
        variant: "destructive",
      });
      return;
    }

    // Check if it's this player's turn
    if (currentTurn !== playerId) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to draw a card",
        variant: "destructive",
      });
      return;
    }

    // Check if player can draw (must be in draw phase and hasn't drawn yet)
    if (turnState.currentPhase !== 'draw' || turnState.hasDrawn) {
      toast({
        title: "Invalid action",
        description: turnState.hasDrawn ? "You've already drawn a card this turn" : "You can only draw during the draw phase",
        variant: "destructive",
      });
      return;
    }

    // Check hand size limit (shouldn't exceed 15 cards)
    const currentHandSize = gameCards.playerHands[playerId]?.length || 0;
    if (currentHandSize >= 15) {
      toast({
        title: "Hand size limit",
        description: "You cannot have more than 15 cards in your hand",
        variant: "destructive",
      });
      return;
    }

    const topDiscardCard = gameCards.discardPile[gameCards.discardPile.length - 1];

    setGameCards(prev => {
      if (!prev) return prev;
      
      const newDiscardPile = [...prev.discardPile];
      const drawnCard = newDiscardPile.pop();
      
      if (!drawnCard) return prev;

      const newPlayerHands = { ...prev.playerHands };
      newPlayerHands[playerId] = [...(newPlayerHands[playerId] || []), drawnCard];

      return {
        ...prev,
        discardPile: newDiscardPile,
        playerHands: newPlayerHands
      };
    });

    // Update turn state
    setTurnState(prev => ({
      ...prev,
      hasDrawn: true,
      drawnFromDiscard: true,
      drawnCard: topDiscardCard,
      currentPhase: 'meld'
    }));

    toast({
      title: "Card taken from discard",
      description: `You took the ${topDiscardCard.rank} of ${topDiscardCard.suit}. You may now meld or discard (but not the same card).`,
    });
  };

  // Organize cards in hand
  const handleOrganizeCards = () => {
    if (!gameCards) return;

    setGameCards(prev => {
      if (!prev) return prev;
      
      const newPlayerHands = { ...prev.playerHands };
      const playerHand = newPlayerHands[playerId] || [];
      
      // Sort by suit first, then by rank value
      const sortedHand = [...playerHand].sort((a, b) => {
        const suitOrder = { hearts: 0, diamonds: 1, clubs: 2, spades: 3 };
        const rankOrder = { A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13 };
        
        if (a.isJoker && !b.isJoker) return 1;
        if (!a.isJoker && b.isJoker) return -1;
        if (a.isJoker && b.isJoker) return 0;
        
        if (a.suit !== b.suit) {
          return suitOrder[a.suit] - suitOrder[b.suit];
        }
        
        return rankOrder[a.rank] - rankOrder[b.rank];
      });
      
      newPlayerHands[playerId] = sortedHand;
      
      return {
        ...prev,
        playerHands: newPlayerHands
      };
    });

    // Clear selection after organizing
    setSelectedCards([]);

    toast({
      title: "Cards organized",
      description: "Your hand has been sorted by suit and rank",
    });
  };

  // Handle card click for selection
  const handleCardClick = (card: Card) => {
    const cardAlreadySelected = selectedCards.some(c => c.id === card.id);
    if (cardAlreadySelected) {
      setSelectedCards(prev => prev.filter(c => c.id !== card.id));
    } else {
      setSelectedCards(prev => [...prev, card]);
    }
    
    toast({
      title: cardAlreadySelected ? "Card deselected" : "Card selected",
      description: `${cardAlreadySelected ? "Deselected" : "Selected"} ${card.rank} of ${card.suit}`,
    });
  };

  // Form meld with selected cards
  const handleFormMeld = () => {
    // Check if it's this player's turn
    if (currentTurn !== playerId) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to form melds",
        variant: "destructive",
      });
      return;
    }

    // Check if player has drawn a card first
    if (!turnState.hasDrawn) {
      toast({
        title: "Must draw first",
        description: "You must draw a card before forming melds",
        variant: "destructive",
      });
      return;
    }

    if (selectedCards.length < 3) {
      toast({
        title: "Invalid meld",
        description: "You need at least 3 cards to form a meld",
        variant: "destructive",
      });
      return;
    }

    // Basic validation - check if cards form a valid set or run
    const isValidMeld = validateMeld(selectedCards);
    
    if (!isValidMeld) {
      toast({
        title: "Invalid meld",
        description: "Selected cards don't form a valid set or run",
        variant: "destructive",
      });
      return;
    }

    // Remove selected cards from hand
    setGameCards(prev => {
      if (!prev) return prev;
      
      const newPlayerHands = { ...prev.playerHands };
      const playerHand = newPlayerHands[playerId] || [];
      
      newPlayerHands[playerId] = playerHand.filter(card => 
        !selectedCards.some(selected => selected.id === card.id)
      );
      
      return {
        ...prev,
        playerHands: newPlayerHands
      };
    });

    setSelectedCards([]);

    // Update turn state to allow discarding
    setTurnState(prev => ({
      ...prev,
      currentPhase: 'discard',
      canEndTurn: true
    }));
    
    toast({
      title: "Meld formed",
      description: `Successfully formed a meld with ${selectedCards.length} cards. Now you must discard one card.`,
    });
  };

  // Discard selected card
  const handleDiscardCard = () => {
    if (!gameCards) return;

    // Check if it's this player's turn
    if (currentTurn !== playerId) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to discard a card",
        variant: "destructive",
      });
      return;
    }

    // Check if player has drawn a card first
    if (!turnState.hasDrawn) {
      toast({
        title: "Must draw first",
        description: "You must draw a card before discarding",
        variant: "destructive",
      });
      return;
    }

    if (selectedCards.length !== 1) {
      toast({
        title: "Invalid discard",
        description: "Select exactly one card to discard",
        variant: "destructive",
      });
      return;
    }

    const cardToDiscard = selectedCards[0];

    // Check if trying to discard the same card that was just drawn from discard pile
    if (turnState.drawnFromDiscard && turnState.drawnCard && 
        turnState.drawnCard.id === cardToDiscard.id) {
      toast({
        title: "Invalid discard",
        description: "You cannot discard the same card you just drew from the discard pile",
        variant: "destructive",
      });
      return;
    }

    setGameCards(prev => {
      if (!prev) return prev;
      
      const newPlayerHands = { ...prev.playerHands };
      const playerHand = newPlayerHands[playerId] || [];
      
      // Remove card from hand
      newPlayerHands[playerId] = playerHand.filter(card => card.id !== cardToDiscard.id);
      
      // Add to discard pile
      const newDiscardPile = [...prev.discardPile, cardToDiscard];
      
      return {
        ...prev,
        playerHands: newPlayerHands,
        discardPile: newDiscardPile
      };
    });

    setSelectedCards([]);

    // End turn and move to next player
    handleEndTurn();
    
    toast({
      title: "Card discarded",
      description: `Discarded ${cardToDiscard.rank} of ${cardToDiscard.suit}. Turn ended.`,
    });
  };

  // End turn
  const handleEndTurn = () => {
    if (!gameSession) return;

    // Clear any selected cards
    setSelectedCards([]);

    // Move to next player
    const currentPlayerIndex = gameSession.players.findIndex(p => p.id === currentTurn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameSession.players.length;
    const nextPlayer = gameSession.players[nextPlayerIndex];

    setCurrentTurn(nextPlayer.id);
    setTurnState({
      currentPhase: 'draw',
      hasDrawn: false,
      drawnFromDiscard: false,
      drawnCard: null,
      canEndTurn: false
    });

    toast({
      title: "Turn ended",
      description: `It's now ${nextPlayer.name}'s turn`,
    });
  };

  // Validate if selected cards form a valid meld
  const validateMeld = (cards: Card[]): boolean => {
    if (cards.length < 3) return false;

    // Sort cards by rank for easier validation
    const sortedCards = [...cards].sort((a, b) => {
      if (a.isJoker) return 1;
      if (b.isJoker) return -1;
      return a.value - b.value;
    });

    // Check for set (same rank, different suits)
    const isSet = () => {
      const nonJokers = sortedCards.filter(c => !c.isJoker);
      if (nonJokers.length === 0) return false;
      
      const firstRank = nonJokers[0].rank;
      return nonJokers.every(card => card.rank === firstRank);
    };

    // Check for run (consecutive ranks, same suit)
    const isRun = () => {
      const nonJokers = sortedCards.filter(c => !c.isJoker);
      if (nonJokers.length === 0) return false;
      
      const firstSuit = nonJokers[0].suit;
      if (!nonJokers.every(card => card.suit === firstSuit)) return false;
      
      // Check if ranks are consecutive (accounting for jokers)
      const values = nonJokers.map(c => c.value).sort((a, b) => a - b);
      const jokerCount = sortedCards.length - nonJokers.length;
      
      // Simple consecutive check - could be improved for complex joker scenarios
      for (let i = 1; i < values.length; i++) {
        if (values[i] - values[i-1] > 1 + jokerCount) return false;
      }
      
      return true;
    };

    return isSet() || isRun();
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
                  className="text-white bg-black/50 border-white/30 hover:bg-black/70"
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

  // If in game room, show the lobby or game interface
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
            className="bg-black/50 text-white border-white/30 hover:bg-black/70"
          >
            Rules
          </Button>
          <Button
            variant="outline"
            onClick={handleLeaveGame}
            className="bg-black/50 text-white border-white/30 hover:bg-black/70"
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
                {gameSession?.id}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyGameCode}
                className="bg-white/10 text-white border-white/20 h-8"
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

          {gameSession?.state === "waiting" &&
            playerId === gameSession.hostId && (
              <Button
                onClick={handleStartGame}
                className="mt-2 md:mt-0"
                disabled={
                  gameSession.players.length < 2 ||
                  !gameSession.players.every((p) => p.isReady)
                }
              >
                {isCountingDown ? `Starting in ${countdown}s...` : "Start Game"}
              </Button>
            )}
        </div>
      </div>

      {/* Game state: waiting for players */}
      {gameSession?.state === "waiting" && (
        <div className="flex-grow bg-black/30 backdrop-blur-md rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Waiting for Players
          </h2>

          <div className="max-w-2xl mx-auto">
            <div className="bg-black/20 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium mb-4">Players</h3>
              <div className="space-y-3">
                {gameSession.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center bg-black/20 p-3 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${player.isConnected ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="font-medium">{player.name}</span>
                      {player.id === gameSession.hostId && (
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
              {gameSession.players.length < 2 ? (
                <div className="text-amber-300 mb-4">
                  Waiting for at least one more player to join...
                </div>
              ) : (
                <>
                  {!gameSession.players.every((p) => p.isReady) ? (
                    <div className="text-amber-300 mb-4">
                      Waiting for all players to be ready...
                    </div>
                  ) : (
                    <div className="text-green-400 mb-4">
                      All players ready! Game can start.
                      {countdown !== null &&
                        playerId === gameSession.hostId && (
                          <div className="mt-2 text-white animate-pulse">
                            Game starting in {countdown} seconds...
                            <button
                              onClick={() => {
                                setCountdown(null);
                                setIsCountingDown(false);
                              }}
                              className="ml-2 text-sm text-red-400 hover:text-red-300 underline"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      {countdown !== null &&
                        playerId !== gameSession.hostId && (
                          <div className="mt-2 text-white animate-pulse">
                            Game starting in {countdown} seconds...
                          </div>
                        )}
                    </div>
                  )}
                </>
              )}

              {gameSession.players.find((p) => p.id === playerId)?.isReady ? (
                <Button
                  onClick={handleToggleReady}
                  variant="outline"
                  className="text-white bg-red-600/70 hover:bg-red-700 border-red-500"
                >
                  Not Ready
                </Button>
              ) : (
                <Button
                  onClick={handleToggleReady}
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
      {gameSession?.state === "playing" && (
        <div className="flex-grow space-y-4">
          {/* Game Board */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold">Game in Progress</h2>
              {gameSession && (
                <div className="text-green-400 mt-2">
                  Current Turn: {gameSession.players.find(p => p.id === currentTurn)?.name || 'Unknown'}
                  {currentTurn === playerId && (
                    <span className="ml-2 text-yellow-400">(Your Turn)</span>
                  )}
                </div>
              )}
              {currentTurn === playerId && (
                <div className="mt-1 text-sm text-yellow-300">
                  Phase: {turnState.currentPhase.charAt(0).toUpperCase() + turnState.currentPhase.slice(1)}
                  {turnState.currentPhase === 'draw' && !turnState.hasDrawn && " - Draw a card"}
                  {turnState.currentPhase === 'meld' && " - Form melds (optional) then discard"}
                  {turnState.currentPhase === 'discard' && " - Must discard one card"}
                </div>
              )}
              <div className="mt-2 text-sm text-white/70 space-x-4">
                <span>Draw Deck: {gameCards ? gameCards.drawDeck.length : 80} cards</span>
                <span>•</span>
                <span>Discard: {gameCards ? gameCards.discardPile.length : 0} cards</span>
                <span>•</span>
                <span>Your Cards: {gameCards && gameCards.playerHands[playerId] ? gameCards.playerHands[playerId].length : 14}</span>
              </div>
            </div>

            {/* Center area with deck and discard pile */}
            <div className="flex justify-center items-center gap-8 mb-8">
              {/* Draw Deck */}
              <div className="text-center">
                <div className="text-white/70 text-sm mb-2">Draw Deck</div>
                <div 
                  className="relative cursor-pointer hover:scale-105 transition-transform duration-200"
                  onClick={handleDrawFromDeck}
                >
                  {gameCards && gameCards.drawDeck.length > 0 ? (
                    <>
                      {/* Stack effect with multiple cards */}
                      <div className="absolute top-1 left-1">
                        <GameCard suit="hearts" rank="A" faceUp={false} style={{ width: "80px", height: "112px" }} />
                      </div>
                      <div className="absolute top-0.5 left-0.5">
                        <GameCard suit="hearts" rank="A" faceUp={false} style={{ width: "80px", height: "112px" }} />
                      </div>
                      <GameCard suit="hearts" rank="A" faceUp={false} style={{ width: "80px", height: "112px" }} />
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-white/50 text-xs">
                        {gameCards.drawDeck.length} cards
                      </div>
                    </>
                  ) : (
                    <div className="w-20 h-28 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
                      <span className="text-white/50 text-xs">Empty</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Discard Pile */}
              <div className="text-center">
                <div className="text-white/70 text-sm mb-2">Discard Pile</div>
                <div className="relative" style={{ minHeight: "120px" }}>
                  {gameCards && gameCards.discardPile.length > 0 ? (
                    <div className="relative">
                      {/* Show stack effect for multiple cards */}
                      {gameCards.discardPile.length > 1 && (
                        <>
                          <div className="absolute top-1 left-1 opacity-60">
                            <GameCard 
                              suit="hearts" 
                              rank="A" 
                              faceUp={true} 
                              style={{ width: "80px", height: "112px" }}
                            />
                          </div>
                          <div className="absolute top-0.5 left-0.5 opacity-80">
                            <GameCard 
                              suit="hearts" 
                              rank="A" 
                              faceUp={true} 
                              style={{ width: "80px", height: "112px" }}
                            />
                          </div>
                        </>
                      )}
                      <GameCard 
                        suit={gameCards.discardPile[gameCards.discardPile.length - 1].suit} 
                        rank={gameCards.discardPile[gameCards.discardPile.length - 1].rank} 
                        faceUp={true} 
                        isJoker={gameCards.discardPile[gameCards.discardPile.length - 1].isJoker}
                        style={{ width: "80px", height: "112px" }}
                        className="cursor-pointer hover:scale-110 hover:-translate-y-2 transition-all duration-300 ease-in-out"
                        onClick={handleDrawFromDiscard}
                      />
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-white/50 text-xs">
                        {gameCards.discardPile.length} card{gameCards.discardPile.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-28 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
                      <span className="text-white/50 text-xs">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Other Players */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {gameSession.players
                .filter((player) => player.id !== playerId)
                .map((player, index) => {
                  const playerCardCount = gameCards && gameCards.playerHands[player.id] ? gameCards.playerHands[player.id].length : 14;
                  return (
                    <div
                      key={player.id}
                      className="bg-black/20 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className={`w-2 h-2 rounded-full ${player.isConnected ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <span className="font-medium">{player.name}</span>
                        <div className="text-sm text-white/70">
                          Cards: {playerCardCount}
                        </div>
                      </div>

                      {/* Other player's hand (face down) */}
                      <div className="flex gap-1 justify-center overflow-visible" style={{ minHeight: "60px" }}>
                        {Array.from({ length: playerCardCount }).map((_, cardIndex) => (
                          <div
                            key={`${player.id}-card-${cardIndex}`}
                            className="flex-shrink-0 transition-all duration-500 ease-in-out"
                            style={{ 
                              marginLeft: cardIndex > 0 ? "-25px" : "0",
                              zIndex: cardIndex,
                              transform: `rotate(${(cardIndex - Math.floor(playerCardCount/2)) * 3}deg)`,
                              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                          >
                            <GameCard
                              suit="hearts"
                              rank="A"
                              faceUp={false}
                              style={{ 
                                width: "40px", 
                                height: "56px"
                              }}
                              className="transition-all duration-500 ease-in-out hover:translate-y-2 hover:scale-110"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Player's Hand */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Your Hand</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-black/50 text-white border-white/30 hover:bg-black/70"
                  onClick={handleOrganizeCards}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <line x1="21" x2="14" y1="4" y2="4"></line>
                    <line x1="10" x2="3" y1="4" y2="4"></line>
                    <line x1="21" x2="12" y1="12" y2="12"></line>
                    <line x1="8" x2="3" y1="12" y2="12"></line>
                    <line x1="21" x2="16" y1="20" y2="20"></line>
                    <line x1="12" x2="3" y1="20" y2="20"></line>
                    <line x1="14" x2="14" y1="2" y2="6"></line>
                    <line x1="8" x2="8" y1="10" y2="14"></line>
                    <line x1="16" x2="16" y1="18" y2="22"></line>
                  </svg>
                  Organize
                </Button>
                
                {/* Game Actions moved here */}
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-blue-600/20 text-white border-blue-500 hover:bg-blue-600/40"
                  onClick={handleFormMeld}
                  disabled={
                    currentTurn !== playerId || 
                    !turnState.hasDrawn || 
                    selectedCards.length < 3
                  }
                >
                  Form Meld
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-purple-600/20 text-white border-purple-500 hover:bg-purple-600/40"
                  disabled={
                    currentTurn !== playerId || 
                    !turnState.hasDrawn || 
                    selectedCards.length === 0
                  }
                >
                  Add to Meld
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-red-600/20 text-white border-red-500 hover:bg-red-600/40"
                  onClick={handleDiscardCard}
                  disabled={
                    currentTurn !== playerId || 
                    !turnState.hasDrawn || 
                    selectedCards.length !== 1
                  }
                >
                  Discard & End Turn
                </Button>
              </div>
            </div>

            {/* Player's cards container with proper overflow handling */}
            <div className="relative" style={{ minHeight: "160px", overflow: "visible" }}>
              <div className="flex gap-2 justify-center" style={{ paddingBottom: "40px", overflow: "visible" }}>
                {/* Player's actual hand */}
                {gameCards && gameCards.playerHands[playerId] ? 
                  gameCards.playerHands[playerId].map((card, index) => {
                    const isSelected = selectedCards.some(c => c.id === card.id);
                    return (
                      <div
                        key={card.id}
                        className={`flex-shrink-0 transition-all duration-500 hover:-translate-y-8 hover:scale-110 cursor-pointer card-deal-animation ${isSelected ? 'transform -translate-y-4 scale-105' : ''}`}
                        style={{ 
                          zIndex: isSelected ? 100 : index,
                          animationDelay: `${index * 50}ms`
                        }}
                        onClick={() => handleCardClick(card)}
                      >
                        <GameCard
                          suit={card.suit}
                          rank={card.rank}
                          faceUp={true}
                          isJoker={card.isJoker}
                          style={{ 
                            width: "85px", 
                            height: "119px"
                          }}
                          className={`shadow-lg transition-all duration-300 ${isSelected ? 'ring-4 ring-yellow-400 ring-opacity-100' : ''}`}
                        />
                      </div>
                    );
                  }) :
                  // Fallback display while cards are loading
                  Array.from({ length: 14 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-[85px] h-[119px] bg-white/10 rounded-lg animate-pulse"
                      style={{ animationDelay: `${index * 100}ms` }}
                    />
                  ))
                }
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