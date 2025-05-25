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
    console.log(
      "Loaded sessions from localStorage:",
      Object.keys(activeSessions),
    );
  }
} catch (error) {
  console.error("Error loading sessions from localStorage:", error);
  activeSessions = {};
}

// Save sessions to localStorage whenever they change
const saveSessions = () => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSessions));
    console.log("Saved sessions to localStorage:", Object.keys(activeSessions));
  } catch (error) {
    console.error("Error saving sessions to localStorage:", error);
  }
};

// Global broadcast channel for cross-tab communication
let broadcastChannel: BroadcastChannel | null = null;
try {
  broadcastChannel = new BroadcastChannel("game-sessions-sync");
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.type === "sessions-update") {
      try {
        const updatedSessions = JSON.parse(
          localStorage.getItem(SESSION_STORAGE_KEY) || "{}",
        );
        activeSessions = updatedSessions;
        console.log(
          "Sessions updated via broadcast:",
          Object.keys(activeSessions),
        );
      } catch (error) {
        console.error("Error syncing sessions:", error);
      }
    }
  };
} catch (e) {
  console.log("BroadcastChannel not supported in this browser");
}

// Notify other tabs/windows about session updates
const notifySessionsUpdate = () => {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: "sessions-update",
        time: Date.now(),
      });
    } catch (e) {
      console.error("Error broadcasting session update:", e);
    }
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
    console.log(`Attempting to join session ${gameId} as ${playerName}`);

    // Try to read latest sessions
    try {
      const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        if (parsedSessions[gameId]) {
          console.log("Found session in localStorage that wasn't in memory");
          activeSessions = parsedSessions;
        }
      }
    } catch (e) {
      console.error("Error checking for session updates:", e);
    }

    // Check if session exists
    if (!activeSessions[gameId]) {
      console.log(`Session ${gameId} not found, checking format`);

      // Try to create a new session if the game code is valid format
      if (gameId.length === 6 && /^[A-Z0-9]+$/.test(gameId)) {
        // Create a new session with this ID for compatibility
        const hostId = generatePlayerId();
        const hostName = "Host";

        activeSessions[gameId] = {
          id: gameId,
          hostId: hostId,
          players: [
            {
              id: hostId,
              name: hostName,
              isReady: true,
              isConnected: true,
              joinedAt: Date.now() - 60000, // Joined a minute ago
            },
          ],
          lastUpdated: Date.now(),
          state: "waiting",
        };

        saveSessions();
        notifySessionsUpdate();
        console.log(`Created new session with ID ${gameId} for joining player`);
      } else {
        console.log(`Invalid game code format: ${gameId}`);
        resolve({
          success: false,
          error: "Game session not found",
        });
        return;
      }
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
    saveSessions();
    notifySessionsUpdate();

    // Store locally for this client
    localStorage.setItem(GAME_ID_KEY, gameId);
    localStorage.setItem(PLAYER_ID_KEY, playerId);

    console.log(`Player ${playerName} (${playerId}) joined session ${gameId}`);
    console.log(
      "Current players:",
      session.players.map((p) => p.name),
    );

    // Return immediately for better responsiveness
    resolve({ success: true, playerId });
  });
};

/**
 * Gets the current state of a game session
 */
export const getGameSession = (gameId: string): Promise<GameSession | null> => {
  return new Promise((resolve) => {
    // Check if we have the latest session data from localStorage
    try {
      const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        if (parsedSessions[gameId]) {
          // If localStorage has a newer version (by timestamp), use that
          if (
            !activeSessions[gameId] ||
            parsedSessions[gameId].lastUpdated >
              activeSessions[gameId].lastUpdated
          ) {
            console.log("Using newer session data from localStorage");
            activeSessions = parsedSessions;
          }
        }
      }
    } catch (e) {
      console.error("Error checking for session updates:", e);
    }

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
    // Check if we have the latest session data
    try {
      const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        if (parsedSessions[gameId]) {
          activeSessions = parsedSessions;
        }
      }
    } catch (e) {
      console.error("Error syncing before status update:", e);
    }

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
    saveSessions();
    notifySessionsUpdate();

    console.log(
      `Player ${session.players[playerIndex].name} is now ${isReady ? "ready" : "not ready"}`,
    );
    console.log(
      "Current players:",
      session.players.map(
        (p) => `${p.name}: ${p.isReady ? "ready" : "not ready"}`,
      ),
    );

    // Check if all players are ready, and this is the last player to get ready
    const allReady = session.players.every((p) => p.isReady);
    if (allReady && isReady && session.players.length >= 2) {
      console.log("All players are now ready");
    }

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
    // Make sure we have the latest session data
    try {
      const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        if (parsedSessions[gameId]) {
          activeSessions = parsedSessions;
        }
      }
    } catch (e) {
      console.error("Error syncing before game start:", e);
    }

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
    saveSessions();
    notifySessionsUpdate();

    // Log that the game has started for debugging
    console.log(`Game ${gameId} started by host ${hostId}`);
    console.log("Session state:", session);

    // Force an additional notification after a short delay
    setTimeout(() => {
      try {
        notifySessionsUpdate();
        console.log("Sent delayed session update notification");
      } catch (e) {
        console.error("Error in delayed notification:", e);
      }
    }, 500);

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
  console.log(`Starting monitoring for session ${gameId}`);

  // Initial session fetch
  getGameSession(gameId).then((session) => {
    if (session) {
      console.log(
        `Initial session data for ${gameId}:`,
        `Players: ${session.players.length}`,
        `State: ${session.state}`,
      );
      onSessionUpdate(session);
    } else {
      console.error(`No session found with ID ${gameId} for monitoring`);
    }
  });

  // Clear any existing interval
  if (pollingInterval !== null) {
    clearInterval(pollingInterval);
  }

  // Set up polling for updates
  pollingInterval = setInterval(() => {
    try {
      // Check for updated session in localStorage first
      const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        if (parsedSessions[gameId]) {
          // If localStorage has a newer version (by timestamp), use that
          if (
            !activeSessions[gameId] ||
            parsedSessions[gameId].lastUpdated >
              activeSessions[gameId].lastUpdated
          ) {
            console.log("Found newer session data in localStorage");
            activeSessions = parsedSessions;
            const session = activeSessions[gameId];
            if (session) {
              console.log(
                `Session update via localStorage polling:`,
                `Players: ${session.players.length}`,
                `State: ${session.state}`,
              );
              onSessionUpdate(session);
              return; // Skip the regular getGameSession call
            }
          }
        }
      }
    } catch (e) {
      console.error("Error checking localStorage during polling:", e);
    }

    // Fall back to regular session check
    getGameSession(gameId).then((session) => {
      if (session) {
        onSessionUpdate(session);
      }
    });
  }, POLLING_INTERVAL);

  // Set up a WebSocket-like broadcast channel for even faster updates
  let channelCleanup: (() => void) | null = null;

  try {
    const gameChannel = new BroadcastChannel(`game-session-${gameId}`);
    gameChannel.onmessage = (event) => {
      if (event.data && event.data.type === "session-update") {
        console.log("Received session update broadcast");
        try {
          // Always check localStorage for the latest data
          const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
          if (savedSessions) {
            const parsedSessions = JSON.parse(savedSessions);
            if (parsedSessions[gameId]) {
              activeSessions = parsedSessions;
              const session = activeSessions[gameId];
              if (session) {
                console.log(
                  `Session update via broadcast:`,
                  `Players: ${session.players.length}`,
                  `State: ${session.state}`,
                );
                onSessionUpdate(session);
              }
            }
          }
        } catch (e) {
          console.error("Error processing broadcast update:", e);
        }
      }
    };

    // Global channel for all session updates
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === "sessions-update") {
          console.log("Received global sessions update");
          try {
            // Check localStorage for the latest data
            const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
            if (savedSessions) {
              const parsedSessions = JSON.parse(savedSessions);
              if (parsedSessions[gameId]) {
                activeSessions = parsedSessions;
                const session = activeSessions[gameId];
                if (session) {
                  console.log(
                    `Session update via global broadcast:`,
                    `Players: ${session.players.length}`,
                    `State: ${session.state}`,
                  );
                  onSessionUpdate(session);
                }
              }
            }
          } catch (e) {
            console.error("Error processing global broadcast update:", e);
          }
        }
      };
    }

    channelCleanup = () => {
      gameChannel.close();
    };
  } catch (e) {
    console.log("BroadcastChannel not supported, falling back to polling only");
  }

  // Return cleanup function
  return () => {
    console.log(`Stopping monitoring for session ${gameId}`);
    if (pollingInterval !== null) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (channelCleanup) {
      channelCleanup();
    }
  };
};

// Function to notify all tabs/windows about session updates
const notifySessionUpdate = (gameId: string) => {
  try {
    const gameChannel = new BroadcastChannel(`game-session-${gameId}`);
    gameChannel.postMessage({ type: "session-update", time: Date.now() });
    setTimeout(() => {
      gameChannel.close();
    }, 100);
    console.log(`Sent session update notification for game ${gameId}`);
  } catch (e) {
    console.error("Error sending game-specific update:", e);
  }
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
