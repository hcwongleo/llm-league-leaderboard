# LLM League Leaderboard Account

The **Leaderboard Account** component of the LLM League platform, responsible for evaluating, ranking, and displaying Large Language Model (LLM) performance using AWS Bedrock as an impartial judge.

## Architecture Overview

![LLM League Architecture](./generated-diagrams/LLMLeagueArchitecture_Updated.png)

The leaderboard account operates as part of a multi-account architecture that ensures fair and secure evaluation of participant models. This account focuses on:

- **Model Evaluation**: Using Amazon Bedrock as an impartial AI judge
- **Ranking Management**: Processing and storing leaderboard rankings via Lambda functions
- **Public Display**: Serving leaderboard results through a web interface
- **Cross-Account Security**: Secure integration with participant accounts

## Leaderboard Account Components

### Web Frontend
- **CloudFront CDN**: Global content delivery for the public leaderboard interface
- **S3 Static Hosting**: React-based web application for displaying rankings and statistics

### API Layer
- **Web API (API Gateway)**: Serves leaderboard data to the frontend application
- **Judge API (API Gateway)**: Receives evaluation requests from participant accounts
- **Leaderboard API (Lambda)**: Central component managing all leaderboard operations, rankings, and data storage

### LLM Judge & Ranking System
- **Judge Orchestrator (Lambda)**: Coordinates the evaluation workflow and manages judge interactions
- **Amazon Bedrock**: AI-powered impartial judge for model evaluation using state-of-the-art LLMs
- **Judge Questions (S3)**: Configurable evaluation criteria, prompts, and scoring rubrics

### Data Storage
- **Leaderboard Results (S3)**: Current rankings, historical data, and detailed evaluation results

## Recent Architecture Updates

### Lambda-Based Data Management (August 2025)
- **Replaced DynamoDB with Leaderboard API Lambda**: Simplified architecture by centralizing all leaderboard operations in a dedicated Lambda function
- **Enhanced Scalability**: Serverless approach provides better cost optimization and automatic scaling
- **Streamlined Data Flow**: Direct integration between Judge Orchestrator and Leaderboard API Lambda for faster updates
- **Improved API Design**: Single Lambda function handles all leaderboard operations (GET, POST, rankings, statistics)

## Features

### 🏆 **Automated Model Evaluation**
- Fair evaluation using Amazon Bedrock as an impartial judge
- Configurable evaluation criteria and scoring rubrics
- Support for multiple evaluation dimensions (accuracy, coherence, relevance)
- Automated ranking calculation and updates

### 📊 **Real-Time Leaderboard**
- Live rankings with automatic updates
- Detailed performance metrics and score breakdowns
- Historical performance tracking
- Interactive charts and statistics

### 🔒 **Secure Cross-Account Integration**
- Presigned URL access for participant model results
- IAM-based cross-account permissions with least privilege
- Audit logging for all evaluation activities
- Secure API endpoints with authentication

### ⚡ **Serverless Architecture**
- Cost-effective Lambda-based processing
- Automatic scaling based on demand
- High availability with multi-AZ deployment
- CloudWatch monitoring and alerting

## Quick Start

### Prerequisites
- AWS Account with appropriate permissions
- Amazon Bedrock access enabled
- AWS CLI configured
- Node.js 18+ and npm installed
- AWS CDK v2 installed

### 1. Clone and Setup
```bash
git clone https://github.com/hcwongleo/llm-league-leaderboard.git
cd llm-league-leaderboard/leaderboard-account
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
export BEDROCK_MODEL_ID="anthropic.claude-3-sonnet-20240229-v1:0"
export JUDGE_QUESTIONS_BUCKET="your-judge-questions-bucket"
export LEADERBOARD_RESULTS_BUCKET="your-leaderboard-results-bucket"
```

### 3. Deploy Infrastructure
```bash
# Deploy CDK stack
npm run deploy

# Or use the deployment script
./deploy.sh
```

### 4. Upload Judge Questions
```bash
# Upload evaluation criteria
aws s3 cp judge-questions/judge-questions.json s3://your-judge-questions-bucket/
```

### 5. Deploy Frontend
```bash
cd frontend
npm install
npm run build

# Deploy to S3 and invalidate CloudFront
aws s3 sync dist/ s3://your-frontend-bucket/
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Configuration

### Judge Questions Format
```json
{
  "evaluation_criteria": [
    {
      "category": "accuracy",
      "weight": 0.4,
      "description": "Factual correctness and precision",
      "questions": [
        "How accurate is the model's response?",
        "Does the response contain factual errors?"
      ]
    },
    {
      "category": "coherence",
      "weight": 0.3,
      "description": "Logical structure and flow",
      "questions": [
        "Is the response logically structured?",
        "Does the response flow naturally?"
      ]
    },
    {
      "category": "relevance",
      "weight": 0.3,
      "description": "Relevance to the prompt",
      "questions": [
        "How relevant is the response to the prompt?",
        "Does the response address all aspects of the question?"
      ]
    }
  ],
  "scoring": {
    "scale": "1-10",
    "description": "1 = Poor, 5 = Average, 10 = Excellent"
  }
}
```

### Environment Variables
```bash
# Required
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
JUDGE_QUESTIONS_BUCKET=llm-judge-questions-bucket
LEADERBOARD_RESULTS_BUCKET=llm-leaderboard-results-bucket

# Optional
AWS_REGION=us-east-1
LOG_LEVEL=INFO
CORS_ORIGINS=https://your-domain.com
```

## API Reference

### Leaderboard API Endpoints

#### GET /leaderboard
Get current leaderboard rankings
```bash
curl https://your-api-gateway-url/leaderboard
```

Response:
```json
{
  "rankings": [
    {
      "rank": 1,
      "model_name": "CustomLLM-v1",
      "participant": "team-alpha",
      "overall_score": 8.7,
      "scores": {
        "accuracy": 9.1,
        "coherence": 8.5,
        "relevance": 8.5
      },
      "evaluation_date": "2025-08-10T16:00:00Z"
    }
  ],
  "total_participants": 15,
  "last_updated": "2025-08-10T16:30:00Z"
}
```

#### POST /evaluate
Submit model results for evaluation (called by participant accounts)
```bash
curl -X POST https://your-api-gateway-url/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "participant_id": "team-alpha",
    "model_name": "CustomLLM-v1",
    "results_url": "https://presigned-s3-url...",
    "metadata": {
      "model_type": "fine-tuned-llama2",
      "training_data_size": "10k_samples"
    }
  }'
```

#### GET /statistics
Get leaderboard statistics
```bash
curl https://your-api-gateway-url/statistics
```

## Monitoring and Troubleshooting

### CloudWatch Logs
```bash
# Judge Orchestrator logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/judge-orchestrator \
  --start-time $(date -d '1 hour ago' +%s)000

# Leaderboard API logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/leaderboard-api \
  --start-time $(date -d '1 hour ago' +%s)000
```

### Common Issues

**Bedrock Access Denied**
```bash
# Check Bedrock model access
aws bedrock list-foundation-models --region us-east-1

# Enable model access if needed
aws bedrock put-model-invocation-logging-configuration \
  --logging-config destinationConfig='{cloudWatchConfig={logGroupName=bedrock-logs,roleArn=arn:aws:iam::ACCOUNT:role/BedrockRole}}'
```

**Cross-Account Permission Issues**
- Verify IAM roles have correct cross-account trust relationships
- Check presigned URL expiration times
- Validate S3 bucket policies for cross-account access

**Lambda Timeout Issues**
- Monitor Lambda duration metrics in CloudWatch
- Increase timeout settings for complex evaluations
- Consider breaking large evaluations into smaller batches

### Performance Metrics
- **Evaluation Latency**: Average time from submission to ranking update
- **Judge Response Time**: Bedrock API response times
- **API Gateway Metrics**: Request count, latency, and error rates
- **Lambda Metrics**: Duration, memory usage, and error rates

## Security

### Data Protection
- **Encryption at Rest**: All S3 buckets encrypted with AWS KMS
- **Encryption in Transit**: HTTPS/TLS for all API communications
- **Access Logging**: Comprehensive audit trails via CloudTrail
- **Lambda Security**: Function-level IAM roles with least privilege

### Cross-Account Security
- **Presigned URLs**: Time-limited access to participant results
- **IAM Roles**: Cross-account roles with minimal required permissions
- **API Authentication**: Token-based authentication for all endpoints
- **Network Security**: CloudFront WAF protection and DDoS mitigation

## Development

### Local Development
```bash
# Install dependencies
npm install

# Run tests
npm test

# Local Lambda testing
sam local start-api

# Frontend development
cd frontend
npm run dev
```

### Testing
```bash
# Run unit tests
npm test

# Integration tests with mock data
cd test
./test.sh

# Load testing
npm run load-test
```

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Cost Optimization

### Estimated Monthly Costs (for moderate usage)
- **Lambda Functions**: $5-20 (based on evaluation frequency)
- **API Gateway**: $3-10 (per million requests)
- **S3 Storage**: $1-5 (for results and static assets)
- **CloudFront**: $1-10 (based on traffic)
- **Bedrock**: $10-50 (based on evaluation volume)

### Cost Optimization Tips
- Use S3 Intelligent Tiering for long-term result storage
- Configure CloudFront caching for static assets
- Monitor Lambda memory allocation for optimal performance/cost ratio
- Use Bedrock batch processing for multiple evaluations

## Support

### Documentation
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)

### Getting Help
- **Issues**: Create an issue in this GitHub repository
- **Discussions**: Use GitHub Discussions for questions and ideas
- **AWS Support**: For AWS service-specific issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using AWS Serverless Technologies**
