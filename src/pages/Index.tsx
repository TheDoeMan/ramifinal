import React from "react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-brown-900"
      style={{
        backgroundImage:
          "url(https://cdn.builder.io/api/v1/image/assets%2F547c7d5bd6fb430fa6db21f988ef40a9%2F61eb53c0582a4f6ab622b80bdc878549)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="text-center w-full max-w-6xl p-8">
        <div className="bg-black/20 backdrop-blur-md rounded-xl p-8 border border-white/10 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-6 text-shadow">
            Welcome to Tunisian Rami
          </h1>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            A traditional card game where players aim to be the first to lay
            down all cards in valid combinations (sets/runs). Create or join
            online sessions to play with friends!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Single Device Option */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 mb-4 flex items-center justify-center text-white/80">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-10 h-10"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M7 7h.01" />
                    <path d="M17 7h.01" />
                    <path d="M7 17h.01" />
                    <path d="M17 17h.01" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Play vs Computer
                </h2>
                <p className="text-white/70 text-sm mb-6">
                  Play against CPU opponents on your device
                </p>
                <Link
                  to="/rami"
                  className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-8 rounded-md transition-all border border-transparent hover:border-white/30"
                >
                  Play vs CPU
                </Link>
              </div>
            </div>

            {/* Multiplayer Option */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 mb-4 flex items-center justify-center text-white/80">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-10 h-10"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Multiplayer
                </h2>
                <p className="text-white/70 text-sm mb-6">
                  Play with friends across different devices
                </p>
                <Link
                  to="/multiplayer"
                  className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-8 rounded-md transition-all border border-transparent hover:border-white/30"
                >
                  Play Online Game
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
