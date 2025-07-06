import { useState, useEffect, useCallback, useRef } from "react";
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

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (term: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => searchCharacters(term), 300);
      };
    })(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const searchCharacters = async (term: string) => {
    if (term.length < 3) {
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
        body: JSON.stringify({ name: term }),
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

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchTerm, debouncedSearch]);

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
    setSearchTerm(character.name);
    setShowResults(false);
    setSearchResults([]);
    onCharacterSelect(character);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Search character name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.trim())}
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