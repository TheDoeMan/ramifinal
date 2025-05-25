// This is a simplified real-time session management system that works with Render.com
// It uses localStorage to persist game data across browser sessions

// Session Storage Keys
const GAME_ID_KEY = "current_game_id";
const PLAYER_ID_KEY = "player_id";
const POLLING_INTERVAL = 2000; // 2 seconds for faster updates
const SESSION_STORAGE_KEY = "active_game_sessions";

// Types for session management
export type GameSession = {
  id: string;
  hostId: string;
  players: SessionPlayer[];
  lastUpdated: number;
  state: "waiting" | "playing" | "ended";
};

export type SessionPlayer = {
  id: string;
  name: string;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: number;
};

// Load sessions from localStorage to maintain state between page reloads
let activeSessions: Record<string, GameSession> = {};

// Initialize from localStorage
try {
  const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
  if (savedSessions) {
    activeSessions = JSON.parse(savedSessions);
  }
} catch (error) {
  console.error("Error loading sessions from localStorage:", error);
  activeSessions = {};
}

// Save sessions to localStorage whenever they change
const saveSessions = () => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSessions));
  } catch (error) {
    console.error("Error saving sessions to localStorage:", error);
  }
};

/**
 * Creates a new game session
 */
export const createGameSession = (
  hostName: string,
): Promise<{ gameId: string; playerId: string }> => {
  return new Promise((resolve) => {
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

    // Store in active sessions
    activeSessions[gameId] = session;
    saveSessions();

    // Store locally for this client
    localStorage.setItem(GAME_ID_KEY, gameId);
    localStorage.setItem(PLAYER_ID_KEY, playerId);

    // Return immediately for better responsiveness
    resolve({ gameId, playerId });
  });
};

/**
 * Joins an existing game session
 */
export const joinGameSession = (
  gameId: string,
  playerName: string,
): Promise<{ success: boolean; playerId?: string; error?: string }> => {
  return new Promise((resolve) => {
    // Check if session exists
    if (!activeSessions[gameId]) {
      resolve({
        success: false,
        error: "Game session not found",
      });
      return;
    }

    // Generate player ID
    const playerId = generatePlayerId();

    // Add player to session
    const session = activeSessions[gameId];

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

    // Add player to session
    session.players.push({
      id: playerId,
      name: playerName,
      isReady: false,
      isConnected: true,
      joinedAt: Date.now(),
    });
    session.lastUpdated = Date.now();
    saveSessions();

    // Store locally for this client
    localStorage.setItem(GAME_ID_KEY, gameId);
    localStorage.setItem(PLAYER_ID_KEY, playerId);

    // Return immediately for better responsiveness
    resolve({ success: true, playerId });
  });
};

/**
 * Gets the current state of a game session
 */
export const getGameSession = (gameId: string): Promise<GameSession | null> => {
  return new Promise((resolve) => {
    // Return immediately for better responsiveness
    resolve(activeSessions[gameId] || null);
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
  return new Promise((resolve) => {
    const session = activeSessions[gameId];
    if (!session) {
      resolve(false);
      return;
    }

    // Find and update player
    const playerIndex = session.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      resolve(false);
      return;
    }

    session.players[playerIndex].isReady = isReady;
    session.lastUpdated = Date.now();
    saveSessions();

    // Return immediately for better responsiveness
    resolve(true);
  });
};

/**
 * Starts a game session (host only)
 */
export const startGameSession = (
  gameId: string,
  hostId: string,
): Promise<boolean> => {
  return new Promise((resolve) => {
    const session = activeSessions[gameId];
    if (!session || session.hostId !== hostId) {
      resolve(false);
      return;
    }

    // Check if all players are ready
    const allReady = session.players.every((p) => p.isReady);
    if (!allReady) {
      resolve(false);
      return;
    }

    // Update session state immediately
    session.state = "playing";
    session.lastUpdated = Date.now();
    saveSessions();

    // Log that the game has started for debugging
    console.log(`Game ${gameId} started by host ${hostId}`);
    console.log("Session state:", session);

    // Resolve immediately to avoid delays
    resolve(true);
  });
};

/**
 * Leaves a game session
 */
export const leaveGameSession = (
  gameId: string,
  playerId: string,
): Promise<boolean> => {
  return new Promise((resolve) => {
    const session = activeSessions[gameId];
    if (!session) {
      resolve(false);
      return;
    }

    // Remove player from session
    const playerIndex = session.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      resolve(false);
      return;
    }

    // If player is host, assign new host
    if (playerId === session.hostId && session.players.length > 1) {
      // Find next player who isn't leaving
      const newHostIndex = (playerIndex + 1) % session.players.length;
      session.hostId = session.players[newHostIndex].id;
    }

    // Remove player
    session.players.splice(playerIndex, 1);
    session.lastUpdated = Date.now();

    // If no players left, remove session
    if (session.players.length === 0) {
      delete activeSessions[gameId];
    }

    // Clear local storage
    localStorage.removeItem(GAME_ID_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);

    // Simulate network delay
    setTimeout(() => {
      resolve(true);
    }, 300);
  });
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

// Session monitoring for real-time updates
let pollingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Starts monitoring a session for changes
 */
export const startSessionMonitoring = (
  gameId: string,
  onSessionUpdate: (session: GameSession) => void,
): (() => void) => {
  // Initial session fetch
  getGameSession(gameId).then((session) => {
    if (session) {
      onSessionUpdate(session);
    }
  });

  // Clear any existing interval
  if (pollingInterval !== null) {
    clearInterval(pollingInterval);
  }

  // Set up polling for updates
  pollingInterval = setInterval(() => {
    getGameSession(gameId).then((session) => {
      if (session) {
        onSessionUpdate(session);
      }
    });
  }, POLLING_INTERVAL);

  // Return cleanup function
  return () => {
    if (pollingInterval !== null) {
      clearInterval(pollingInterval);
      pollingInterval = null;
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
