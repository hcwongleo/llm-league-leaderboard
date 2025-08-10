import React from 'react';
import { Users, TrendingUp, Trophy, Activity } from 'lucide-react';
import { LeaderboardStats } from '../types';

interface StatsCardsProps {
  stats: LeaderboardStats;
  loading: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const formatScore = (score: number) => {
    return (score * 100).toFixed(1);
  };

  const cards = [
    {
      title: 'Total Participants',
      value: stats.totalParticipants.toString(),
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Average Score',
      value: `${formatScore(stats.averageScore)}%`,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Top Score',
      value: `${formatScore(stats.topScore)}%`,
      icon: Trophy,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
    },
    {
      title: 'Recent Evaluations',
      value: stats.recentEvaluations.toString(),
      subtitle: 'Last 24 hours',
      icon: Activity,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card, index) => (
        <div key={index} className="stats-card">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${card.bgColor} border border-white/10`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-white/70">{card.title}</p>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-6 bg-white/20 rounded w-16 mt-1"></div>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-semibold text-white">{card.value}</p>
                  {card.subtitle && (
                    <p className="text-xs text-white/50">{card.subtitle}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;