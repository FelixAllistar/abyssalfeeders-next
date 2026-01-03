"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CharacterSearch } from "@/components/CharacterSearch";
import { CharacterIdInput } from "@/components/CharacterIdInput";
import { Leaderboard } from "@/components/Leaderboard";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { AbyssalShader } from "@/components/AbyssalShader";
import { motion, useMotionValue } from "framer-motion";

interface Character {
  id: number;
  name: string;
}

interface ProcessingResult {
  characterId: number;
  characterName: string;
  totalValue: number;
  killmailCount: number;
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | undefined>();
  const [processingError, setProcessingError] = useState<string | undefined>();
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const [searchMethod, setSearchMethod] = useState<'search' | 'id'>('search');

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      mouseX.set(clientX);
      mouseY.set(clientY);
      document.documentElement.style.setProperty('--mouse-x', `${clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${clientY}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const processCharacter = async (character: Character) => {
    setIsProcessing(true);
    setProcessingResult(undefined);
    setProcessingError(undefined);

    try {
      const response = await fetch('/api/process-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: character.id,
          characterName: character.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error === "Character has no abyssal killmail value") {
          throw new Error('No kills found, please auth on ZKillboard first.');
        }
        throw new Error(errorData.error || 'Failed to process character');
      }

      const result = await response.json();
      setProcessingResult(result);
      setLeaderboardRefresh(prev => prev + 1);
    } catch (error) {
      console.error('Processing failed:', error);
      setProcessingError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 relative z-10 min-h-screen flex flex-col">
      <AbyssalShader />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 mt-8"
      >
        <h1 className="text-5xl md:text-6xl font-black mb-4 font-orbitron text-nanobana tracking-tighter uppercase italic">
          Abyssal Feederboard
        </h1>
        <div className="w-48 h-1 bg-nanobana mx-auto shadow-[0_0_15px_rgba(255,230,0,0.5)]" />
      </motion.div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full">
        {/* Search Column */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          <Card className="glass-panel border-white/5 h-fit scanline">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4">
                Character Sync
              </CardTitle>
              <div className="flex bg-white/5 rounded-lg p-1">
                <Button
                  variant={searchMethod === 'search' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSearchMethod('search')}
                  disabled={isProcessing}
                  className={`h-8 text-xs flex-1 rounded-md transition-all ${searchMethod === 'search' ? 'bg-nanobana text-black shadow-lg shadow-nanobana/20' : 'text-white/60 hover:text-white'}`}
                >
                  By Name
                </Button>
                <Button
                  variant={searchMethod === 'id' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSearchMethod('id')}
                  disabled={isProcessing}
                  className={`h-8 text-xs flex-1 rounded-md transition-all ${searchMethod === 'id' ? 'bg-nanobana text-black shadow-lg shadow-nanobana/20' : 'text-white/60 hover:text-white'}`}
                >
                  By ID
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                {searchMethod === 'search' ? (
                  <CharacterSearch
                    onCharacterSelect={processCharacter}
                    isProcessing={isProcessing}
                  />
                ) : (
                  <CharacterIdInput
                    onCharacterLookup={processCharacter}
                    isProcessing={isProcessing}
                  />
                )}
              </div>

              <div className="mt-2">
                <ProcessingStatus
                  isProcessing={isProcessing}
                  result={processingResult}
                  error={processingError}
                />
              </div>

              <p className="text-[10px] text-white/30 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                DATABASE: ZKILLBOARD.COM<br />
                NOTE: AUTH REQ FOR LOSS DATA SYNC.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboard Column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-9"
        >
          <Leaderboard refreshTrigger={leaderboardRefresh} />
        </motion.div>
      </div>
    </div>
  );
}
