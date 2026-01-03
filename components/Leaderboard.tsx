import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardEntry {
  character_id: number;
  character_name: string;
  total_value: number;
  last_updated: string;
}

interface LeaderboardProps {
  refreshTrigger: number;
}

export function Leaderboard({ refreshTrigger }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/leaderboard");

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [refreshTrigger]);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-nanobana/20 border-t-nanobana rounded-full animate-spin" />
          <div className="absolute inset-0 blur-md bg-nanobana/20 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {leaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-white/40 font-orbitron text-xs tracking-widest uppercase"
          >
            NO DATA PACKETS DETECTED.
          </motion.div>
        ) : (
          <div className="grid gap-3">
            {leaderboard.map((entry, index) => (
              <motion.div
                key={entry.character_id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                whileHover={{ scale: 1.01, x: 5 }}
                className="glass-panel group relative overflow-hidden rounded-2xl p-4 flex items-center justify-between transition-all border-white/5 active:scale-[0.98]"
              >
                {/* Ranking Highlight for Top 3 */}
                {index < 3 && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${index === 0 ? 'bg-nanobana' :
                    index === 1 ? 'bg-white/60' :
                      'bg-orange-500/60'
                    } shadow-[0_0_15px_currentColor]`} />
                )}

                <div className="flex items-center gap-4 relative z-10">
                  <div className="relative">
                    <div className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-500 ${index === 0 ? 'border-nanobana shadow-[0_0_20px_rgba(255,230,0,0.3)]' : 'border-white/10 group-hover:border-white/20'
                      }`}>
                      <Image
                        src={`https://images.evetech.net/characters/${entry.character_id}/portrait?tenant=tranquility&size=128`}
                        alt={entry.character_name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
                      />
                    </div>
                    {/* Rank Circle */}
                    <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] font-orbitron border-2 ${index === 0 ? 'bg-nanobana text-black border-black' :
                      'bg-black/80 text-white border-white/20'
                      }`}>
                      {index + 1}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white/40 font-orbitron tracking-widest uppercase mb-0.5">
                      {index === 0 ? 'Abyssal Royalty' : 'Pilot Unit'}
                    </div>
                    <div className="text-lg font-bold text-white group-hover:text-nanobana transition-colors">
                      {entry.character_name}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-xs font-bold text-white/40 font-orbitron tracking-widest uppercase">
                    Loss Value
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-nanobana font-orbitron tracking-tighter drop-shadow-[0_0_10px_rgba(255,230,0,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(255,230,0,0.5)] transition-all">
                    {formatValue(entry.total_value)} <span className="text-[10px] opacity-60 ml-1">ISK</span>
                  </div>
                  <div className="text-[10px] text-white/20 font-medium">
                    SYNC: {formatDate(entry.last_updated)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
