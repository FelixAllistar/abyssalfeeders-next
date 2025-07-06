import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Character {
  id: number;
  name: string;
}

interface CharacterSearchProps {
  onCharacterSelect: (character: Character) => void;
  isProcessing: boolean;
}

export function CharacterSearch({ onCharacterSelect, isProcessing }: CharacterSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Character[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Manual search function
  const handleSearch = () => {
    if (searchTerm.trim()) {
      searchCharacters(searchTerm);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const searchCharacters = async (term: string) => {
    const trimmedTerm = term.trim();
    if (trimmedTerm.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch("/api/search-character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedTerm }),
      });

      const data = await response.json();
      const characters = data.characters || [];
      setSearchResults(characters);
      setShowResults(characters.length > 0);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    if (isProcessing) {
      setShowResults(false);
      setSearchResults([]);
    }
  }, [isProcessing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCharacterSelect = (character: Character) => {
    setSearchTerm("");
    setShowResults(false);
    setSearchResults([]);
    setIsSearching(false);
    onCharacterSelect(character);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Search character name... (Press Enter to search)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isProcessing}
          className="w-full"
        />
        
        {isSearching && (
          <div className="text-sm text-muted-foreground">
            Searching...
          </div>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-10 max-h-60 overflow-y-auto">
          <CardContent className="p-0">
            {searchResults.map((character) => (
              <button
                key={character.id}
                onClick={() => handleCharacterSelect(character)}
                className={cn(
                  "w-full text-left p-3 border-b border-border last:border-b-0",
                  "hover:bg-muted/50 transition-colors",
                  "focus:outline-none focus:bg-muted/50"
                )}
                disabled={isProcessing}
              >
                <div className="font-medium">{character.name}</div>
                <div className="text-sm text-muted-foreground">
                  ID: {character.id}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}