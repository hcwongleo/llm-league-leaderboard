import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface PodiumProps {
  data: LeaderboardEntry[];
  loading: boolean;
}

const Podium: React.FC<PodiumProps> = ({ data, loading }) => {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    if (!loading && data.length > 0) {
      // Kahoot-style animation sequence
      const timer1 = setTimeout(() => setAnimationPhase(1), 500);
      const timer2 = setTimeout(() => setAnimationPhase(2), 1200);
      const timer3 = setTimeout(() => setAnimationPhase(3), 1900);
      const timer4 = setTimeout(() => setShowMetrics(true), 2500);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [loading, data]);

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const formatMetricScore = (score: number) => {
    return (score * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="podium-container mb-8">
        <div className="flex justify-center items-end space-x-6 relative z-10">
          {[2, 1, 3].map((position) => (
            <div key={position} className="flex flex-col items-center animate-pulse">
              <div className="podium-card">
                <div className="w-16 h-4 bg-white/20 rounded mb-4"></div>
                <div className="pentagon-badge bg-white/20 mb-4">
                  <span className="text-2xl font-bold">{position}</span>
                </div>
                <div className="w-20 h-6 bg-white/20 rounded mb-2"></div>
                <div className="w-24 h-4 bg-white/20 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="podium-container mb-8">
        <div className="text-center text-white relative z-10">
          <Trophy className="h-20 w-20 mx-auto mb-6 animate-bounce text-yellow-400" />
          <h3 className="text-2xl font-bold mb-2">Ready for Champions!</h3>
          <p className="text-lg opacity-90">The podium awaits the first winners</p>
        </div>
      </div>
    );
  }

  const topThree = data.slice(0, 3);
  const podiumOrder = [
    topThree[1], // 2nd place (left)
    topThree[0], // 1st place (center)
    topThree[2], // 3rd place (right)
  ].filter(Boolean);

  const getMedalImage = (rank: number) => {
    switch (rank) {
      case 1: return '/gold_medal.png';
      case 2: return '/silver_medal.png';
      case 3: return '/bronze_medal.png';
      default: return '/bronze_medal.png'; // Default to bronze for ranks > 3
    }
  };

  const getCardHeight = (rank: number) => {
    switch (rank) {
      case 1: return 'h-80'; // Tallest for winner
      case 2: return 'h-72'; // Medium for 2nd
      case 3: return 'h-64'; // Shortest for 3rd
      default: return 'h-60';
    }
  };

  const getAnimationDelay = (rank: number) => {
    switch (rank) {
      case 2: return animationPhase >= 1;
      case 1: return animationPhase >= 2;
      case 3: return animationPhase >= 3;
      default: return false;
    }
  };

  const getAllMetrics = (participant: LeaderboardEntry) => {
    return Object.entries(participant.metricScores || {});
  };

  const getTotalEvaluations = (participant: LeaderboardEntry) => {
    // For demo purposes, using evaluation count from the data
    return participant.evaluationCount || 50;
  };

  return (
    <div className="podium-container mb-8">
      {/* Podium Cards */}
      <div className="flex justify-center items-end space-x-6 relative z-10">
        {podiumOrder.map((participant) => {
          if (!participant) return null;
          
          const actualRank = participant.rank;
          const isVisible = getAnimationDelay(actualRank);
          const allMetrics = getAllMetrics(participant);
          const totalEvaluations = getTotalEvaluations(participant);
          
          return (
            <div 
              key={participant.participantId} 
              className={`transition-all duration-1000 ease-out transform ${
                isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-75'
              }`}
            >
              {/* Podium Card */}
              <div className={`podium-card ${getCardHeight(actualRank)}`}>
                {/* Medal Image */}
                <div className="medal-image-container mb-4">
                  <img 
                    src={getMedalImage(actualRank)} 
                    alt={`${actualRank} place medal`}
                    className="medal-image"
                  />
                </div>
                
                {/* Participant Name */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">
                    {participant.participantId}
                  </h3>
                </div>
                
                {/* Score */}
                <div className="text-center">
                  <div className="text-4xl font-black text-white mb-2">
                    {formatScore(participant.totalScore)}
                  </div>
                  <div className="text-white/80 text-lg font-medium">
                    Score
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner celebration */}
      {data.length > 0 && animationPhase >= 3 && (
        <div className="text-center mt-6 relative z-10">
          <p className="text-white font-bold text-lg animate-bounce">
            🎉 Congratulations {data[0].participantId}! 🎉
          </p>
        </div>
      )}
    </div>
  );
};

export default Podium;