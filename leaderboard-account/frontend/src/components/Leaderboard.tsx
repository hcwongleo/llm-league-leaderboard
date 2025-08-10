import React from 'react';
import { Trophy, Medal, Award, Clock, BarChart3 } from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface LeaderboardProps {
  data: LeaderboardEntry[];
  loading: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ data, loading }) => {
  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const getTrophyCount = (rank: number) => {
    // Simple trophy count based on rank for demo
    return Math.max(1000 - (rank - 1) * 50, 100);
  };

  const getMedalImage = (rank: number) => {
    switch (rank) {
      case 1: return '/gold_medal.png';
      case 2: return '/silver_medal.png';
      case 3: return '/bronze_medal.png';
      default: return null;
    }
  };

  const renderRankDisplay = (rank: number) => {
    const medalImage = getMedalImage(rank);
    
    if (medalImage) {
      // Use medal image for top 3
      return (
        <div className="medal-image-container-small">
          <img 
            src={medalImage} 
            alt={`${rank} place medal`}
            className="medal-image-small"
          />
        </div>
      );
    } else {
      // Use CSS badge for rank 4+
      return (
        <div className="medal-badge-small">
          <span className="text-lg font-bold text-white">
            {rank}
          </span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="leaderboard-table">
        {/* Header */}
        <div className="leaderboard-header">
          <div className="header-cell">RANK</div>
          <div className="header-cell">PARTICIPANT</div>
          <div className="header-cell">SCORE</div>
          <div className="header-cell">METRICS</div>
        </div>
        
        {/* Loading rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="leaderboard-row animate-pulse">
            <div className="row-cell">
              <div className="w-8 h-8 bg-white/20 rounded-full"></div>
            </div>
            <div className="row-cell">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                <div className="space-y-1">
                  <div className="w-24 h-4 bg-white/20 rounded"></div>
                  <div className="w-20 h-3 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>
            <div className="row-cell">
              <div className="w-16 h-8 bg-white/20 rounded"></div>
            </div>
            <div className="row-cell">
              <div className="space-y-1">
                <div className="w-32 h-3 bg-white/20 rounded"></div>
                <div className="w-28 h-3 bg-white/20 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="leaderboard-table">
        <div className="leaderboard-header">
          <div className="header-cell">RANK</div>
          <div className="header-cell">PARTICIPANT</div>
          <div className="header-cell">SCORE</div>
          <div className="header-cell">METRICS</div>
        </div>
        <div className="text-center py-12 text-white/70">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No rankings yet</h3>
          <p>Be the first to submit your model for evaluation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-table">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-cell">RANK</div>
        <div className="header-cell">PARTICIPANT</div>
        <div className="header-cell">SCORE</div>
        <div className="header-cell">METRICS</div>
      </div>
      
      {/* Data rows */}
      {data.map((entry, index) => (
        <div
          key={`${entry.participantId}-${entry.timestamp}`}
          className="leaderboard-row"
        >
          {/* Rank */}
          <div className="row-cell">
            {renderRankDisplay(entry.rank)}
          </div>

          {/* Participant with Avatar */}
          <div className="row-cell">
            <div className="flex items-center space-x-3">
              <div className="participant-avatar">
                <span className="avatar-text">
                  {entry.participantId.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="participant-name">
                  {entry.participantId}
                </div>
                <div className="participant-username">
                  @{entry.participantId.toLowerCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="row-cell">
            <div className="score-badge">
              {formatScore(entry.totalScore)}
            </div>
          </div>

          {/* Metrics */}
          <div className="row-cell">
            <div className="metrics-container">
              {Object.entries(entry.metricScores || {}).map(([metricName, score]) => (
                <div key={metricName} className="metric-item">
                  <span className="metric-name">
                    {metricName.replace('Builtin.', '')}:
                  </span>
                  <span className="metric-score">
                    {(score * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Leaderboard;