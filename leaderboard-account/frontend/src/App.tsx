import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, Clock, Users, TrendingUp } from 'lucide-react';
import Leaderboard from './components/Leaderboard';
import StatsCards from './components/StatsCards';
import ScoreChart from './components/ScoreChart';
import Podium from './components/Podium';
import { LeaderboardEntry, LeaderboardStats } from './types';
import { fetchLeaderboard } from './services/api';

function App() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [stats, setStats] = useState<LeaderboardStats>({
    totalParticipants: 0,
    averageScore: 0,
    topScore: 0,
    recentEvaluations: 0,
  });

  const loadLeaderboard = useCallback(async () => {
    try {
      console.log('loadLeaderboard called at:', new Date().toISOString());
      console.trace('Call stack:');
      setLoading(true);
      setError(null);
      
      const data = await fetchLeaderboard();
      setLeaderboardData(data);
      setLastUpdated(new Date());
      
      // Calculate stats
      const totalParticipants = data.length;
      const averageScore = data.length > 0 
        ? data.reduce((sum, entry) => sum + entry.totalScore, 0) / data.length 
        : 0;
      const topScore = data.length > 0 ? Math.max(...data.map(entry => entry.totalScore)) : 0;
      const recentEvaluations = data.filter(entry => 
        Date.now() - entry.timestamp * 1000 < 24 * 60 * 60 * 1000
      ).length;
      
      setStats({
        totalParticipants,
        averageScore,
        topScore,
        recentEvaluations,
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    // Since fetchLeaderboard now always processes S3 files, just call loadLeaderboard
    await loadLeaderboard();
  };

  useEffect(() => {
    console.log('useEffect triggered - initial load');
    loadLeaderboard();
  }, []); // Empty dependency array - only run once on mount

  return (
    <div className="min-h-screen leaderboard-bg">
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Stars */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-4 mb-6">
            <div className="star-icon">⭐</div>
            <div className="star-icon star-large">⭐</div>
            <div className="star-icon">⭐</div>
          </div>
          
          <div className="leaderboard-title">
            <h1 className="text-4xl font-black text-white tracking-wider">LLM LEADERBOARD</h1>
          </div>
          
          {lastUpdated && (
            <div className="flex justify-center items-center mt-4">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="refresh-btn flex items-center space-x-2"
                title="Refresh leaderboard"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-400/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-red-100">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Champions Podium */}
        <Podium data={leaderboardData} loading={loading} />

        {/* Main Leaderboard */}
        <div className="leaderboard-container mb-8">
          <Leaderboard data={leaderboardData} loading={loading} />
        </div>

        {/* Stats Cards */}
        <div className="mb-6">
          <StatsCards stats={stats} loading={loading} />
        </div>

        {/* Score Distribution Chart */}
        <div className="mb-6">
          <div className="stats-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Score Distribution</h2>
              <TrendingUp className="h-5 w-5 text-white/60" />
            </div>
            <ScoreChart data={leaderboardData} loading={loading} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-white/60">
          <p>
            Powered by AWS Bedrock • Always shows latest evaluation results from S3 • 
            <a href="#" className="text-blue-300 hover:text-blue-200 ml-1">
              View API Documentation
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;