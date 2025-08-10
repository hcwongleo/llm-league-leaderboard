import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LeaderboardEntry } from '../types';

interface ScoreChartProps {
  data: LeaderboardEntry[];
  loading: boolean;
}

const ScoreChart: React.FC<ScoreChartProps> = ({ data, loading }) => {
  // Create score distribution data
  const createScoreDistribution = (entries: LeaderboardEntry[]) => {
    const buckets = [
      { range: '0-20%', min: 0, max: 0.2, count: 0 },
      { range: '20-40%', min: 0.2, max: 0.4, count: 0 },
      { range: '40-60%', min: 0.4, max: 0.6, count: 0 },
      { range: '60-80%', min: 0.6, max: 0.8, count: 0 },
      { range: '80-100%', min: 0.8, max: 1.0, count: 0 },
    ];

    entries.forEach(entry => {
      const score = entry.totalScore;
      const bucket = buckets.find(b => score >= b.min && score < b.max) || buckets[buckets.length - 1];
      bucket.count++;
    });

    return buckets;
  };

  const chartData = createScoreDistribution(data);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-32 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-white/70">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
          <XAxis 
            dataKey="range" 
            tick={{ fontSize: 12, fill: '#ffffff' }}
            stroke="#ffffff"
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#ffffff' }}
            stroke="#ffffff"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(26, 54, 93, 0.95)',
              border: '1px solid rgba(104, 211, 145, 0.3)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
              color: '#ffffff'
            }}
            formatter={(value: number) => [value, 'Participants']}
            labelFormatter={(label: string) => `Score Range: ${label}`}
          />
          <Bar 
            dataKey="count" 
            fill="#68d391"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreChart;