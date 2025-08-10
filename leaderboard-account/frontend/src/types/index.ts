export interface MetricScores {
  [metricName: string]: number;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  modelName: string;
  totalScore: number;
  metricScores: MetricScores;
  timestamp: number;
  evaluationCount: number;
  status: string;
}

export interface LeaderboardStats {
  totalParticipants: number;
  averageScore: number;
  topScore: number;
  recentEvaluations: number;
}

export interface ApiResponse<T> {
  rankings: T[];
  timestamp: number | null;
  count: number;
}