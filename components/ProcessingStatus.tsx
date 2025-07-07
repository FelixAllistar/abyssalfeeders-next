import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProcessingResult {
  characterId: number;
  characterName: string;
  totalValue: number;
  killmailCount: number;
}

interface ProcessingStatusProps {
  isProcessing: boolean;
  result?: ProcessingResult;
  error?: string;
}

export function ProcessingStatus({ isProcessing, result, error }: ProcessingStatusProps) {
  if (!isProcessing && !result && !error) {
    return null;
  }

  const formatValue = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <div className={cn(
      "rounded-lg border transition-all duration-300 text-sm",
      isProcessing && "border-blue-500/30 bg-blue-900/10",
      result && "border-green-500/30 bg-green-900/10",
      error && "border-red-500/30 bg-red-900/10"
    )}>
      <div className="p-3">
        {isProcessing && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs text-muted-foreground">Processing...</div>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="text-xs text-green-400">Added to leaderboard</div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {result.characterName}: {formatValue(result.totalValue)} ISK ({result.killmailCount} kills)
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="text-xs text-red-400">Failed: {error}</div>
          </div>
        )}
      </div>
    </div>
  );
}