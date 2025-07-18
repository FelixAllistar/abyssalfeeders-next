"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CharacterSearch } from "@/components/CharacterSearch";
import { CharacterIdInput } from "@/components/CharacterIdInput";
import { Leaderboard } from "@/components/Leaderboard";
import { ProcessingStatus } from "@/components/ProcessingStatus";

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
        throw new Error('Failed to process character');
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent text-eve-title">
          Abyssal Feederboard
        </h1>
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-2" />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {/* Search Column - Smaller and more subtle */}
        <div className="lg:col-span-1 xl:col-span-1">
          <Card className="bg-card/40 backdrop-blur-sm border-border/30 shadow-lg transition-all duration-300 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Add Character
              </CardTitle>
              <div className="flex bg-muted/30 rounded-md p-0.5 w-fit">
                <Button
                  variant={searchMethod === 'search' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSearchMethod('search')}
                  disabled={isProcessing}
                  className="h-7 text-xs flex-1 rounded-r-none"
                >
                  Name
                </Button>
                <Button
                  variant={searchMethod === 'id' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSearchMethod('id')}
                  disabled={isProcessing}
                  className="h-7 text-xs flex-1 rounded-l-none"
                >
                  ID
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Note: Only pulls kills from Characters who have been authenticated on Zkillboard.com
              </p>
            </CardHeader>
            <CardContent className="pt-0">
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

              {/* Compact processing status within search card */}
              <div className="mt-3">
                <ProcessingStatus
                  isProcessing={isProcessing}
                  result={processingResult}
                  error={processingError}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Column - Main focus, takes up most space */}
        <div className="lg:col-span-3 xl:col-span-3">
          <Leaderboard refreshTrigger={leaderboardRefresh} />
        </div>
      </div>
    </div>
  );
}
