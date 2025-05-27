
import { database } from './firebaseConfig';
import { ref, set, get, onValue, off, push, remove, serverTimestamp } from 'firebase/database';

// Session Storage Keys for local fallback
const GAME_ID_KEY = "current_game_id";
const PLAYER_ID_KEY = "player_id";

// Card type for game state
export type Card = {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
  value: number;
  isJoker?: boolean;
};

// Game state for multiplayer
export type GameState = {
  playerHands: Record<string, Card[]>;
  drawDeck: Card[];
  discardPile: Card[];
  currentTurn: string;
  turnState: {
    currentPhase: 'draw' | 'meld' | 'discard';
    hasDrawn: boolean;
    drawnFromDiscard: boolean;
    drawnCard: Card | null;
    canEndTurn: boolean;
  };
};

// Types for session management
export type GameSession = {
  id: string;
  hostId: string;
  players: SessionPlayer[];
  lastUpdated: number;
  state: "waiting" | "playing" | "ended";
  gameState?: GameState;
};

export type SessionPlayer = {
  id: string;
  name: string;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: number;
};

// Session monitoring
let currentSessionRef: any = null;
let sessionUpdateCallback: ((session: GameSession) => void) | null = null;

/**
 * Creates a new game session
 */
export const createGameSession = (
  hostName: string,
): Promise<{ gameId: string; playerId: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Creating new game session with host: ${hostName}`);

      // Generate unique IDs
      const gameId = generateGameId();
      const playerId = generatePlayerId();

      // Create session
      const session: GameSession = {
        id: gameId,
        hostId: playerId,
        players: [
          {
            id: playerId,
            name: hostName,
            isReady: true,
            isConnected: true,
            joinedAt: Date.now(),
          },
        ],
        lastUpdated: Date.now(),
        state: "waiting",
      };

      // Save to Firebase
      const sessionRef = ref(database, `sessions/${gameId}`);
      await set(sessionRef, session);

      // Store locally for this client
      localStorage.setItem(GAME_ID_KEY, gameId);
      localStorage.setItem(PLAYER_ID_KEY, playerId);

      console.log(`Game created with ID: ${gameId}, host player ID: ${playerId}`);

      resolve({ gameId, playerId });
    } catch (error) {
      console.error("Error creating game session:", error);
      reject(error);
    }
  });
};

/**
 * Joins an existing game session
 */
export const joinGameSession = (
  gameId: string,
  playerName: string,
): Promise<{ success: boolean; playerId?: string; error?: string }> => {
  return new Promise(async (resolve) => {
    try {
      console.log(`Attempting to join session ${gameId} as ${playerName}`);

      // Check if session exists
      const sessionRef = ref(database, `sessions/${gameId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        console.error(`Session ${gameId} not found`);
        resolve({
          success: false,
          error: "Game session not found. Check your game code and try again.",
        });
        return;
      }

      const session: GameSession = snapshot.val();

      // Check if game is full
      if (session.players.length >= 4) {
        resolve({
          success: false,
          error: "Game is full (maximum 4 players)",
        });
        return;
      }

      // Check if game already started
      if (session.state === "playing") {
        resolve({
          success: false,
          error: "Game has already started",
        });
        return;
      }

      // Generate player ID
      const playerId = generatePlayerId();

      // Add player to session
      const updatedPlayers = [
        ...session.players,
        {
          id: playerId,
          name: playerName,
          isReady: false,
          isConnected: true,
          joinedAt: Date.now(),
        },
      ];

      const updatedSession: GameSession = {
        ...session,
        players: updatedPlayers,
        lastUpdated: Date.now(),
      };

      // Update Firebase
      await set(sessionRef, updatedSession);

      // Store locally for this client
      localStorage.setItem(GAME_ID_KEY, gameId);
      localStorage.setItem(PLAYER_ID_KEY, playerId);

      console.log(`Player ${playerName} (${playerId}) joined session ${gameId}`);

      resolve({ success: true, playerId });
    } catch (error) {
      console.error("Error joining game session:", error);
      resolve({
        success: false,
        error: "Failed to join game session",
      });
    }
  });
};

/**
 * Gets the current state of a game session
 */
export const getGameSession = (gameId: string): Promise<GameSession | null> => {
  return new Promise(async (resolve) => {
    try {
      const sessionRef = ref(database, `sessions/${gameId}`);
      const snapshot = await get(sessionRef);

      if (snapshot.exists()) {
        const session = snapshot.val();
        console.log(`Got session ${gameId} with ${session.players.length} players`);
        resolve(session);
      } else {
        console.log(`Session ${gameId} not found`);
        resolve(null);
      }
    } catch (error) {
      console.error("Error getting game session:", error);
      resolve(null);
    }
  });
};

/**
 * Updates a player's status in a session
 */
export const updatePlayerStatus = (
  gameId: string,
  playerId: string,
  isReady: boolean,
): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      const sessionRef = ref(database, `sessions/${gameId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        console.error(`Cannot update player status: Session ${gameId} not found`);
        resolve(false);
        return;
      }

      const session: GameSession = snapshot.val();

      // Find and update player
      const playerIndex = session.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) {
        console.error(
          `Cannot update player status: Player ${playerId} not found in session ${gameId}`,
        );
        resolve(false);
        return;
      }

      // Update player ready status
      const updatedPlayers = [...session.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        isReady,
      };

      const updatedSession: GameSession = {
        ...session,
        players: updatedPlayers,
        lastUpdated: Date.now(),
      };

      // Update Firebase
      await set(sessionRef, updatedSession);

      console.log(
        `Player ${session.players[playerIndex].name} is now ${isReady ? "ready" : "not ready"}`,
      );

      resolve(true);
    } catch (error) {
      console.error("Error updating player status:", error);
      resolve(false);
    }
  });
};

/**
 * Updates the game state in a session
 */
export const updateGameState = (
  gameId: string,
  gameState: GameState,
): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      const sessionRef = ref(database, `sessions/${gameId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        console.error(`Cannot update game state: Session ${gameId} not found`);
        resolve(false);
        return;
      }

      const session: GameSession = snapshot.val();

      const updatedSession: GameSession = {
        ...session,
        gameState,
        lastUpdated: Date.now(),
      };

      await set(sessionRef, updatedSession);

      console.log(`Game state updated for session ${gameId}`, {
        playerHandsKeys: Object.keys(gameState.playerHands),
        playerHandSizes: Object.entries(gameState.playerHands).map(([id, cards]) => `${id}: ${cards.length}`),
        currentTurn: gameState.currentTurn
      });
      resolve(true);
    } catch (error) {
      console.error("Error updating game state:", error);
      resolve(false);
    }
  });
};

/**
 * Starts a game session (host only)
 */
export const startGameSession = (
  gameId: string,
  hostId: string,
): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      console.log(`🔥 Firebase startGameSession called for ${gameId} by ${hostId}`);
      
      const sessionRef = ref(database, `sessions/${gameId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        console.error(`❌ Cannot start game: Session ${gameId} not found`);
        resolve(false);
        return;
      }

      const session: GameSession = snapshot.val();
      console.log(`📄 Current session state:`, {
        id: session.id,
        state: session.state,
        hostId: session.hostId,
        playerCount: session.players.length,
        players: session.players.map(p => ({ name: p.name, ready: p.isReady }))
      });

      if (session.hostId !== hostId) {
        console.error(
          `❌ Cannot start game: Player ${hostId} is not the host of session ${gameId}`,
        );
        resolve(false);
        return;
      }

      // Check if all players are ready
      const allReady = session.players.every((p) => p.isReady);
      if (!allReady) {
        console.error(
          `❌ Cannot start game: Not all players are ready in session ${gameId}`,
          session.players.map(p => `${p.name}: ${p.isReady}`)
        );
        resolve(false);
        return;
      }

      // Update session state
      const updatedSession: GameSession = {
        ...session,
        state: "playing",
        lastUpdated: Date.now(),
      };

      console.log(`🎯 Updating session state to playing...`);
      
      // Update Firebase
      await set(sessionRef, updatedSession);

      console.log(`✅ Game ${gameId} started successfully by host ${hostId}`);

      resolve(true);
    } catch (error) {
      console.error("💥 Error starting game session:", error);
      resolve(false);
    }
  });
};

/**
 * Leaves a game session
 */
export const leaveGameSession = (
  gameId: string,
  playerId: string,
): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      const sessionRef = ref(database, `sessions/${gameId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        resolve(false);
        return;
      }

      const session: GameSession = snapshot.val();

      // Remove player from session
      const playerIndex = session.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) {
        resolve(false);
        return;
      }

      const updatedPlayers = [...session.players];
      updatedPlayers.splice(playerIndex, 1);

      // If player is host, assign new host
      let newHostId = session.hostId;
      if (playerId === session.hostId && updatedPlayers.length > 0) {
        newHostId = updatedPlayers[0].id;
      }

      // If no players left, remove session
      if (updatedPlayers.length === 0) {
        await remove(sessionRef);
      } else {
        // Save updated session
        const updatedSession: GameSession = {
          ...session,
          hostId: newHostId,
          players: updatedPlayers,
          lastUpdated: Date.now(),
        };

        await set(sessionRef, updatedSession);
      }

      // Clear local storage
      localStorage.removeItem(GAME_ID_KEY);
      localStorage.removeItem(PLAYER_ID_KEY);

      // Stop monitoring
      if (currentSessionRef) {
        off(currentSessionRef);
        currentSessionRef = null;
        sessionUpdateCallback = null;
      }

      resolve(true);
    } catch (error) {
      console.error("Error leaving game session:", error);
      resolve(false);
    }
  });
};

/**
 * Starts real-time monitoring of a session
 */
export const startSessionMonitoring = (
  gameId: string,
  onSessionUpdate: (session: GameSession) => void,
): (() => void) => {
  console.log(`Starting real-time monitoring for session ${gameId}`);

  // Clean up previous monitoring
  if (currentSessionRef) {
    off(currentSessionRef);
  }

  // Set up new monitoring
  currentSessionRef = ref(database, `sessions/${gameId}`);
  sessionUpdateCallback = onSessionUpdate;

  // Listen for real-time updates
  onValue(currentSessionRef, (snapshot) => {
    if (snapshot.exists()) {
      const session = snapshot.val();
      console.log("Real-time session update received:", {
        id: session.id,
        players: session.players.length,
        lastUpdated: new Date(session.lastUpdated).toLocaleTimeString(),
      });
      
      if (sessionUpdateCallback) {
        sessionUpdateCallback(session);
      }
    }
  });

  // Return cleanup function
  return () => {
    console.log(`Stopping real-time monitoring for session ${gameId}`);
    if (currentSessionRef) {
      off(currentSessionRef);
      currentSessionRef = null;
      sessionUpdateCallback = null;
    }
  };
};

/**
 * Checks if there's a session to rejoin
 */
export const checkForExistingSession = (): {
  gameId: string | null;
  playerId: string | null;
} => {
  const gameId = localStorage.getItem(GAME_ID_KEY);
  const playerId = localStorage.getItem(PLAYER_ID_KEY);
  return { gameId, playerId };
};

// Utility functions
function generateGameId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
