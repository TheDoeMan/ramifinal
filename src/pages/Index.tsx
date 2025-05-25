import React from "react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brown-900">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Single Device Option */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 mb-4 flex items-center justify-center text-white/80">
                  <svg
                    <Link
                      to="/rami"
                      data-loc="/app/code/src/pages/Index.tsx:46:17"
                      $name="Index"
                      css={{
                        display: "block",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderColor: "rgba(0, 0, 0, 0)",
                        borderRadius: "6px",
                        borderWidth: "1px",
                        color: "rgb(255, 255, 255)",
                        fontWeight: "500",
                        paddingBottom: "8px",
                        paddingLeft: "32px",
                        paddingRight: "32px",
                        paddingTop: "8px",
                        transitionDuration: "0.15s",
                        transitionTimingFunction:
                          "cubic-bezier(0.4, 0, 0.2, 1)",
                        pointerEvents: "auto",
                      }}
                    >
                      Play Local Game
                    </Link>
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
                  Single Device
                </h2>
                <p className="text-white/70 text-sm mb-6">
                  Play locally with friends on the same device
                </p>
                <Link
                  to="/rami"
                  className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-8 rounded-md transition-all border border-transparent hover:border-white/30"
                >
                  Play Local Game
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

            {/* Download Option */}
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Download
                </h2>
                <p className="text-white/70 text-sm mb-6">
                  Get the full source code to deploy anywhere
                </p>
                <Link
                  to="/download"
                  className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-8 rounded-md transition-all border border-transparent hover:border-white/30"
                >
                  Download Game
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