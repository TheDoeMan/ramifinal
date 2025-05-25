import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const Download = () => {
  const { toast } = useToast();

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: "The source code will be downloaded shortly.",
    });

    // In a real app, this would initiate a download
    setTimeout(() => {
      toast({
        title: "Feature in development",
        description: "Download functionality is coming soon!",
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-brown-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
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
            Download Source Code
          </h1>

          <div className="space-y-8">
            <div className="bg-black/30 p-6 rounded-lg border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">
                Project Features
              </h2>

              <ul className="list-disc pl-5 text-white/90 space-y-2">
                <li>Complete implementation of the Tunisian Rami card game</li>
                <li>Single-device multiplayer functionality</li>
                <li>Online multiplayer capabilities</li>
                <li>Responsive design that works on mobile and desktop</li>
                <li>Built with React, TypeScript, and TailwindCSS</li>
                <li>Fully customizable UI and game rules</li>
              </ul>
            </div>

            <div className="bg-black/30 p-6 rounded-lg border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">
                Tech Stack
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 p-3 rounded-md text-center">
                  <div className="text-white/80 text-sm">React</div>
                </div>
                <div className="bg-white/10 p-3 rounded-md text-center">
                  <div className="text-white/80 text-sm">TypeScript</div>
                </div>
                <div className="bg-white/10 p-3 rounded-md text-center">
                  <div className="text-white/80 text-sm">TailwindCSS</div>
                </div>
                <div className="bg-white/10 p-3 rounded-md text-center">
                  <div className="text-white/80 text-sm">Vite</div>
                </div>
              </div>
            </div>

            <div className="bg-black/30 p-6 rounded-lg border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">
                Deployment Options
              </h2>

              <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-md">
                  <h3 className="font-medium text-white mb-2">
                    Local Development
                  </h3>
                  <div className="bg-black/30 p-3 rounded-md font-mono text-sm text-white/80 overflow-x-auto">
                    <pre>
                      git clone [repository-url]
                      <br />
                      cd tunisian-rami
                      <br />
                      npm install
                      <br />
                      npm run dev
                    </pre>
                  </div>
                </div>

                <div className="bg-white/10 p-4 rounded-md">
                  <h3 className="font-medium text-white mb-2">
                    Production Build
                  </h3>
                  <div className="bg-black/30 p-3 rounded-md font-mono text-sm text-white/80 overflow-x-auto">
                    <pre>
                      npm run build
                      <br />
                      npm run serve
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleDownload}
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/30 py-6 px-8 text-lg"
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
                  className="mr-2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Download Source Code
              </Button>
            </div>

            <div className="text-white/70 text-sm text-center">
              <p>Source code is provided under the MIT License.</p>
              <p>
                You're free to use, modify, and distribute this code for
                personal or commercial purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Download;
