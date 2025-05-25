// This is a simplified real-time session management system for Tunisian Rami
// Uses localStorage with periodic synchronization to ensure all players can see each other

// Session Storage Keys
const GAME_ID_KEY = "current_game_id";
const PLAYER_ID_KEY = "player_id";
const SESSION_STORAGE_KEY = "active_game_sessions";
const POLLING_INTERVAL = 1000; // 1 second for faster updates

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

// Initialize global cache
let activeSessions: Record<string, GameSession> = {};
let lastSyncTime = 0;

// Initialize session manager
function initializeSessionManager() {
  console.log("Initializing session manager");
  try {
    // Load sessions from localStorage
    const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSessions) {
      activeSessions = JSON.parse(savedSessions);
      console.log(
        "Loaded sessions from localStorage:",
        Object.keys(activeSessions),
      );
    }

    // Set up periodic synchronization
    setInterval(() => {
      synchronizeWithLocalStorage();
    }, POLLING_INTERVAL);

    // Set up storage event listener for cross-tab synchronization
    window.addEventListener("storage", (event) => {
      if (event.key === SESSION_STORAGE_KEY) {
        console.log("Storage event detected - synchronizing sessions");
        synchronizeWithLocalStorage(true);
      }
    });

    return true;
  } catch (error) {
    console.error("Error initializing session manager:", error);
    return false;
  }
}

// Synchronize with localStorage
function synchronizeWithLocalStorage(force = false) {
  try {
    const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions);

      // Check if the localStorage data is newer
      let hasNewerData = force;

      // Look for sessions that are newer in localStorage
      for (const sessionId in parsedSessions) {
        if (
          !activeSessions[sessionId] ||
          parsedSessions[sessionId].lastUpdated >
            (activeSessions[sessionId]?.lastUpdated || 0)
        ) {
          hasNewerData = true;
          break;
        }
      }

      // Update our local cache if localStorage has newer data
      if (hasNewerData) {
        console.log("Found newer session data in localStorage");
        activeSessions = parsedSessions;
        lastSyncTime = Date.now();
      }
    }
  } catch (error) {
    console.error("Error synchronizing with localStorage:", error);
  }
}

// Save sessions to localStorage
function saveSessions() {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSessions));
    lastSyncTime = Date.now();
  } catch (error) {
    console.error("Error saving sessions to localStorage:", error);
  }
}

// Initialize the session manager
initializeSessionManager();

/**
 * Creates a new game session
 */
export const createGameSession = (
  hostName: string,
): Promise<{ gameId: string; playerId: string }> => {
  return new Promise((resolve) => {
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

    // Store in memory and localStorage
    activeSessions[gameId] = session;
    saveSessions();

    // Store locally for this client
    localStorage.setItem(GAME_ID_KEY, gameId);
    localStorage.setItem(PLAYER_ID_KEY, playerId);

    console.log(`Game created with ID: ${gameId}, host player ID: ${playerId}`);
    console.log("Session created and stored:", session);

    // Force multiple saves to ensure persistence
    setTimeout(() => {
      saveSessions();
    }, 100);

    setTimeout(() => {
      saveSessions();
    }, 300);

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
    console.log(`Attempting to join session ${gameId} as ${playerName}`);

    // Synchronize with localStorage first
    synchronizeWithLocalStorage(true);

    // Check if session exists
    if (!activeSessions[gameId]) {
      console.error(`Session ${gameId} not found`);
      resolve({
        success: false,
        error: "Game session not found. Check your game code and try again.",
      });
      return;
    }

    // Generate player ID
    const playerId = generatePlayerId();

    // Add player to session
    const session = activeSessions[gameId];
    console.log(
      `Joining existing session with ${session.players.length} players`,
    );

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

    // Save to memory and localStorage
    activeSessions[gameId] = session;
    saveSessions();

    // Store locally for this client
    localStorage.setItem(GAME_ID_KEY, gameId);
    localStorage.setItem(PLAYER_ID_KEY, playerId);

    console.log(`Player ${playerName} (${playerId}) joined session ${gameId}`);
    console.log(
      "Current players:",
      session.players.map((p) => p.name),
    );

    // Force another save to ensure it's in localStorage
    setTimeout(() => {
      saveSessions();
    }, 100);

    // Return immediately for better responsiveness
    resolve({ success: true, playerId });
  });
};

/**
 * Gets the current state of a game session
 */
export const getGameSession = (gameId: string): Promise<GameSession | null> => {
  return new Promise((resolve) => {
    // First synchronize with localStorage
    synchronizeWithLocalStorage();

    const session = activeSessions[gameId] || null;
    if (session) {
      console.log(
        `Got session ${gameId} with ${session.players.length} players`,
      );
    } else {
      console.log(`Session ${gameId} not found`);
    }

    // Return immediately for better responsiveness
    resolve(session);
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
    // Synchronize first
    synchronizeWithLocalStorage(true);

    const session = activeSessions[gameId];
    if (!session) {
      console.error(`Cannot update player status: Session ${gameId} not found`);
      resolve(false);
      return;
    }

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
    session.players[playerIndex].isReady = isReady;
    session.lastUpdated = Date.now();

    // Save to memory and localStorage
    activeSessions[gameId] = session;
    saveSessions();

    console.log(
      `Player ${session.players[playerIndex].name} is now ${isReady ? "ready" : "not ready"}`,
    );
    console.log(
      "Current players:",
      session.players.map(
        (p) => `${p.name}: ${p.isReady ? "ready" : "not ready"}`,
      ),
    );

    // Force another save to ensure it's in localStorage
    setTimeout(() => {
      saveSessions();
    }, 100);

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
    // Synchronize first
    synchronizeWithLocalStorage(true);

    const session = activeSessions[gameId];
    if (!session) {
      console.error(`Cannot start game: Session ${gameId} not found`);
      resolve(false);
      return;
    }

    if (session.hostId !== hostId) {
      console.error(
        `Cannot start game: Player ${hostId} is not the host of session ${gameId}`,
      );
      resolve(false);
      return;
    }

    // Check if all players are ready
    const allReady = session.players.every((p) => p.isReady);
    if (!allReady) {
      console.error(
        `Cannot start game: Not all players are ready in session ${gameId}`,
      );
      resolve(false);
      return;
    }

    // Update session state immediately
    session.state = "playing";
    session.lastUpdated = Date.now();

    // Save to memory and localStorage
    activeSessions[gameId] = session;
    saveSessions();

    // Log that the game has started for debugging
    console.log(`Game ${gameId} started by host ${hostId}`);
    console.log("Session state:", session);

    // Force another save to ensure it's in localStorage
    setTimeout(() => {
      saveSessions();
    }, 100);

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
    // Synchronize first
    synchronizeWithLocalStorage(true);

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
    } else {
      // Save updated session
      activeSessions[gameId] = session;
    }

    saveSessions();

    // Clear local storage
    localStorage.removeItem(GAME_ID_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);

    // Resolve immediately
    resolve(true);
  });
};

// Session monitoring for real-time updates
let monitoringInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Starts monitoring a session for changes
 */
export const startSessionMonitoring = (
  gameId: string,
  onSessionUpdate: (session: GameSession) => void,
): (() => void) => {
  console.log(`Starting monitoring for session ${gameId}`);

  // Clear any existing interval
  if (monitoringInterval !== null) {
    clearInterval(monitoringInterval);
  }

  // Function to check for updates
  const checkForUpdates = () => {
    try {
      // Synchronize with localStorage
      synchronizeWithLocalStorage();

      // Get the session
      const session = activeSessions[gameId];
      if (session) {
        onSessionUpdate(session);
      }
    } catch (error) {
      console.error("Error checking for session updates:", error);
    }
  };

  // Initial session fetch
  checkForUpdates();

  // Set up interval for checking updates
  monitoringInterval = setInterval(checkForUpdates, POLLING_INTERVAL);

  // Return cleanup function
  return () => {
    console.log(`Stopping monitoring for session ${gameId}`);
    if (monitoringInterval !== null) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
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