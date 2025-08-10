#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LeaderboardStack } from '../lib/leaderboard-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

new LeaderboardStack(app, 'LLMLeaderboardStack', {
  env,
  description: 'LLM Leaderboard Account Infrastructure',
  tags: {
    Project: 'LLM-Leaderboard',
    Environment: process.env.ENVIRONMENT || 'dev',
  },
});