import axios from 'axios';
import { LeaderboardEntry, ApiResponse } from '../types';

// Use relative paths for CloudFront deployment
// CloudFront will route /leaderboard to API Gateway
const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for S3 processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'Server error';
      throw new Error(`${error.response.status}: ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error: Unable to reach the server');
    } else {
      // Something else happened
      throw new Error(`Request error: ${error.message}`);
    }
  }
);

export const fetchLeaderboard = async (limit: number = 50): Promise<LeaderboardEntry[]> => {
  try {
    const response = await api.get<ApiResponse<LeaderboardEntry>>('/leaderboard', {
      params: { limit },
      timeout: 30000, // Increased timeout since we're processing S3 files
    });
    
    // Backend API already calculates ranks with proper tiebreaker logic
    return response.data.rankings || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

// Removed fetchParticipantRankings - no longer needed
// Removed refreshLeaderboard - no longer needed (fetchLeaderboard always refreshes)

export default api;