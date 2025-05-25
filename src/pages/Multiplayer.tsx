import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

const Multiplayer = () => {
  const { toast } = useToast();
  const [gameId, setGameId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

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

    // In a real app, we would create the game on a server here
    setTimeout(() => {
      toast({
        title: "Game created",
        description: `Share this code with your friends: ${newGameId}`,
      });
      setIsCreating(false);
      setGameId(newGameId);
    }, 1000);
  };

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

    // In a real app, we would connect to the game on a server here
    setTimeout(() => {
      toast({
        title: "Feature in development",
        description: "Multiplayer functionality is coming soon!",
      });
      setIsJoining(false);
    }, 1000);
  };

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

            <div className="text-white/70 text-sm text-center mt-6">
              <p>Multiplayer feature is currently in development.</p>
              <p>Try the single-device mode in the meantime!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Multiplayer;
