# LLM Leaderboard Account

This directory contains the complete source code and infrastructure for the **Leaderboard Account** of the LLM Leaderboard system. The leaderboard account is responsible for evaluating participant models using AWS Bedrock as an impartial judge and displaying real-time rankings.

## 🏗️ Architecture Overview

The leaderboard account consists of:

- **Web Frontend**: React application served via CloudFront + S3
- **API Layer**: API Gateway with Lambda functions for data serving and judge orchestration
- **LLM Judge System**: Bedrock-powered evaluation system with configurable criteria
- **Data Storage**: DynamoDB for rankings and S3 for judge questions
- **Cross-Account Integration**: Secure access to participant results via presigned URLs

## 📁 Project Structure

```
leaderboard-account/
├── bin/                          # CDK app entry point
├── lib/                          # CDK infrastructure code
├── lambda/                       # Lambda function source code
│   ├── judge-orchestrator/       # Bedrock judge orchestration
│   └── leaderboard-api/          # API for serving leaderboard data
├── frontend/                     # React web application
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── services/             # API client code
│   │   └── types/                # TypeScript type definitions
│   └── dist/                     # Built frontend assets
├── judge-questions/              # Judge evaluation criteria
├── deploy.sh                     # Deployment script
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or later
- AWS CLI configured with appropriate permissions
- Python 3.11 (for Lambda functions)
- AWS CDK CLI (`npm install -g aws-cdk`)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd leaderboard-account

# Copy environment template
cp .env.example .env

# Edit .env with your AWS account details
nano .env
```

### 2. Deploy Everything

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run full deployment
./deploy.sh deploy
```

This will:
- Install all dependencies
- Build the frontend application
- Deploy AWS infrastructure via CDK
- Upload frontend assets to S3
- Configure CloudFront distribution

### 3. Access Your Leaderboard

After deployment, you'll see output URLs:
- **Leaderboard Web App**: `https://your-cloudfront-domain.cloudfront.net`
- **Leaderboard API**: `https://your-api-id.execute-api.region.amazonaws.com/prod`
- **Judge API**: `https://your-judge-api-id.execute-api.region.amazonaws.com/prod`

## 🔧 Development

### Local Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Lambda Function Development

```bash
# Test judge orchestrator locally
cd lambda/judge-orchestrator
python judge_orchestrator.py

# Test leaderboard API locally
cd lambda/leaderboard-api
python leaderboard_api.py
```

### Infrastructure Changes

```bash
# View changes before deployment
cdk diff

# Deploy only infrastructure changes
cdk deploy

# Destroy everything (careful!)
cdk destroy
```

## 📊 Components Deep Dive

### 1. Judge Orchestrator Lambda

**File**: `lambda/judge-orchestrator/judge_orchestrator.py`

**Purpose**: Coordinates the evaluation process using Bedrock LLM as judge

**Key Functions**:
- Receives evaluation requests from participants
- Loads judge questions from S3
- Retrieves participant results via presigned URLs
- Evaluates responses using Bedrock Claude
- Stores rankings in DynamoDB

**Environment Variables**:
- `JUDGE_QUESTIONS_BUCKET`: S3 bucket containing evaluation criteria
- `RANKINGS_TABLE`: DynamoDB table for storing results
- `BEDROCK_MODEL_ID`: Bedrock model identifier for judging

### 2. Leaderboard API Lambda

**File**: `lambda/leaderboard-api/leaderboard_api.py`

**Purpose**: Serves leaderboard data to the frontend

**Endpoints**:
- `GET /leaderboard`: Get overall rankings
- `GET /rankings`: Get participant-specific rankings

**Features**:
- Real-time ranking calculations
- Score-based sorting with GSI queries
- Participant history tracking
- JSON serialization of DynamoDB Decimal types

### 3. React Frontend

**Directory**: `frontend/src/`

**Key Components**:
- `App.tsx`: Main application with auto-refresh
- `Leaderboard.tsx`: Rankings table with score visualization
- `StatsCards.tsx`: Summary statistics display
- `ScoreChart.tsx`: Score distribution chart using Recharts

**Features**:
- Real-time updates every 30 seconds
- Responsive design with Tailwind CSS
- Score visualization and ranking badges
- Error handling and loading states

### 4. Judge Questions Configuration

**File**: `judge-questions/judge-questions.json`

**Structure**:
```json
{
  "evaluation_criteria": [
    {
      "category": "accuracy",
      "weight": 0.4,
      "questions": ["How accurate is the response?", ...]
    },
    {
      "category": "coherence", 
      "weight": 0.3,
      "questions": ["Is the response well-structured?", ...]
    },
    {
      "category": "relevance",
      "weight": 0.3, 
      "questions": ["Does it address the prompt?", ...]
    }
  ]
}
```

## 🔐 Security

### IAM Permissions

The CDK stack creates minimal required permissions:

- **Lambda Execution Role**:
  - Bedrock model invocation
  - S3 read access to judge questions
  - DynamoDB read/write access to rankings table
  - CloudWatch logs

- **Cross-Account Access**:
  - Participants can invoke Judge API
  - Presigned URL access to participant S3 buckets

### API Security

- **CORS Configuration**: Allows frontend access
- **Rate Limiting**: API Gateway throttling
- **Input Validation**: Request body validation
- **Error Handling**: No sensitive data in error responses

## 📈 Monitoring

### CloudWatch Metrics

Key metrics to monitor:
- Lambda function duration and errors
- API Gateway request count and latency
- DynamoDB read/write capacity
- Bedrock model invocation count

### Logging

- **Lambda Logs**: `/aws/lambda/judge-orchestrator` and `/aws/lambda/leaderboard-api`
- **API Gateway Logs**: Request/response logging
- **CloudFront Logs**: Access logs for frontend

### Alarms

Consider setting up alarms for:
- Lambda function errors > 5%
- API Gateway 5xx errors > 1%
- DynamoDB throttling events
- Bedrock quota exceeded

## 🎛️ Configuration

### Environment Variables

Update these in the CDK stack or Lambda console:

```typescript
// In lib/leaderboard-stack.ts
environment: {
  JUDGE_QUESTIONS_BUCKET: judgeQuestionsBucket.bucketName,
  RANKINGS_TABLE: rankingsTable.tableName,
  BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
}
```

### Judge Questions

Update evaluation criteria by modifying `judge-questions/judge-questions.json` and redeploying:

```bash
# Update questions and redeploy
./deploy.sh deploy
```

### Frontend Configuration

For local development, create `frontend/.env.local`:

```bash
VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
```

## 🚨 Troubleshooting

### Common Issues

1. **Bedrock Access Denied**
   - Ensure Bedrock model access is enabled in your AWS account
   - Check IAM permissions for Lambda execution role

2. **CORS Errors**
   - Verify API Gateway CORS configuration
   - Check CloudFront behavior settings

3. **DynamoDB Throttling**
   - Monitor read/write capacity metrics
   - Consider switching to on-demand billing

4. **Lambda Timeout**
   - Increase timeout for judge orchestrator (currently 15 minutes)
   - Optimize Bedrock API calls

### Debug Commands

```bash
# Check CDK diff
cdk diff

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name LLMLeaderboardStack

# Check Lambda logs
aws logs tail /aws/lambda/judge-orchestrator --follow

# Test API endpoints
curl https://your-api-gateway-url.amazonaws.com/prod/leaderboard
```

## 🔄 Updates and Maintenance

### Updating Judge Questions

1. Modify `judge-questions/judge-questions.json`
2. Redeploy: `./deploy.sh deploy`
3. Questions are automatically uploaded to S3

### Frontend Updates

1. Make changes in `frontend/src/`
2. Test locally: `cd frontend && npm run dev`
3. Deploy: `./deploy.sh deploy`

### Lambda Function Updates

1. Modify Python code in `lambda/*/`
2. Test locally if possible
3. Deploy: `./deploy.sh deploy`

### Infrastructure Updates

1. Modify CDK code in `lib/leaderboard-stack.ts`
2. Review changes: `cdk diff`
3. Deploy: `cdk deploy`

## 📚 API Documentation

### Judge API

**POST** `/evaluate`

Public HTTPS endpoint that receives evaluation requests from participant accounts.

**Request Body**:
```json
{
  "participantId": "participant-123",
  "presignedUrl": "https://s3.amazonaws.com/bucket/results.json?...",
  "modelName": "My Custom LLM"
}
```

**Request Headers**:
```
Content-Type: application/json
User-Agent: YourApp/1.0
```

**Response**:
```json
{
  "message": "Evaluation completed successfully",
  "participantId": "participant-123",
  "modelName": "My Custom LLM", 
  "totalScore": 0.847,
  "timestamp": 1704067200
}
```

### Leaderboard API

**GET** `/leaderboard?limit=50`

Returns overall leaderboard rankings.

**Response**:
```json
{
  "rankings": [
    {
      "rank": 1,
      "participantId": "participant-123",
      "modelName": "My Custom LLM",
      "totalScore": 0.847,
      "categoryScores": {
        "accuracy": {"averageScore": 0.9, "weight": 0.4, "weightedScore": 0.36},
        "coherence": {"averageScore": 0.8, "weight": 0.3, "weightedScore": 0.24},
        "relevance": {"averageScore": 0.85, "weight": 0.3, "weightedScore": 0.255}
      },
      "timestamp": 1704067200,
      "evaluationCount": 10
    }
  ],
  "timestamp": 1704067200,
  "count": 1
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check CloudWatch logs for error details
- Review AWS service quotas and limits
- Consult AWS documentation for service-specific issues