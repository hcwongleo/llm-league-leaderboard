# LLM League Leaderboard

A comprehensive platform for training, evaluating, and ranking Large Language Models (LLMs) using AWS services. The application consists of two main components: a **Participant Account** for model training and submission, and a **Leaderboard Account** for evaluation and ranking.

## Architecture Overview

![LLM League Architecture](./generated-diagrams/LLMLeagueArchitecture_Updated.png)

The application uses a multi-account architecture to ensure security, isolation, and fair evaluation:

- **Participant Account**: Where users train their custom LLMs using SageMaker JumpStart and submit models for evaluation
- **Leaderboard Account**: Where models are evaluated and ranked using Bedrock as an impartial judge, with results displayed on a public leaderboard

### Key Architecture Components

#### Participant Account
- **Web Frontend**: CloudFront CDN serving the participant web application
- **Authentication**: Cognito for secure user authentication
- **API Layer**: API Gateway endpoints for web and inference operations
- **ML Training**: SageMaker Unified Studio and JumpStart models for fine-tuning
- **Data Management**: S3 buckets for training data, testing data, and model results
- **Lambda Functions**: Serverless processing for data submission, validation, and inference

#### Leaderboard Account
- **Web Frontend**: CloudFront CDN serving the public leaderboard
- **API Layer**: API Gateway endpoints for leaderboard data and judge operations
- **Leaderboard API Lambda**: Central component for managing leaderboard data and rankings
- **Evaluation System**: Judge Orchestrator Lambda coordinating with Bedrock LLM Judge
- **Data Storage**: S3 buckets for leaderboard results and judge questions

#### LLM Judge & Ranking System
- **Judge Orchestrator**: Lambda function managing the evaluation workflow
- **Bedrock LLM Judge**: AI-powered impartial evaluation using Amazon Bedrock
- **Judge Questions**: S3 storage for evaluation criteria and prompts

## Recent Updates

### Architecture Improvements (August 2025)
- **Replaced DynamoDB with Leaderboard API Lambda**: Simplified data management by centralizing leaderboard operations in a dedicated Lambda function
- **Enhanced API Architecture**: The Leaderboard API Lambda now serves as the central hub for all leaderboard data operations
- **Improved Scalability**: Lambda-based approach provides better scalability and cost optimization
- **Streamlined Data Flow**: Direct integration between Judge Orchestrator and Leaderboard API Lambda for faster ranking updates

## Table of Contents

- [Participant Account](#participant-account)
  - [Features](#participant-features)
  - [Architecture](#participant-architecture)
  - [Setup](#participant-setup)
  - [Usage](#participant-usage)
- [Leaderboard Account](#leaderboard-account)
  - [Features](#leaderboard-features)
  - [Architecture](#leaderboard-architecture)
  - [Setup](#leaderboard-setup)
  - [Usage](#leaderboard-usage)
- [Cross-Account Integration](#cross-account-integration)
- [Security](#security)
- [Deployment](#deployment)

---

## Participant Account

### Participant Features

- **Self-Service Model Training**: Train custom LLMs using SageMaker JumpStart foundation models
- **Data Management**: Upload and validate training and testing data
- **Model Inference**: Deploy and test trained models via API endpoints
- **Evaluation Submission**: Submit model results for leaderboard evaluation
- **Web Interface**: User-friendly interface for all training activities

### Participant Architecture

#### Core Components

**Web Frontend**
- **CloudFront CDN**: Global content delivery for the participant web application
- **S3 WebApp Assets**: Static files (HTML, CSS, JavaScript) for the training interface

**Authentication**
- **Cognito**: User authentication and session management

**API Layer**
- **Web API (API Gateway)**: Routes web interface requests
- **Inference API (API Gateway)**: Handles model inference requests
- **Testing Data Submission (Lambda)**: Processes testing data uploads
- **Testing Data Validator (Lambda)**: Validates testing data format and quality
- **Inference Handler (Lambda)**: Manages model inference and result generation

**ML Training & Inference**
- **SageMaker Unified Studio**: Interactive environment for model development
- **JumpStart Models**: Pre-trained foundation models (LLaMA, Claude, etc.)
- **Fine-Tuning Job**: Custom training jobs using participant data
- **Custom LLM Endpoint**: Deployed fine-tuned model for inference
- **Training Data S3**: Storage for training datasets (JSONL format)

**Testing Data Management**
- **Testing Data S3**: Raw testing data uploads
- **Validated Testing Data S3**: Processed and validated testing data

**Model Results**
- **Model Results S3**: Storage for inference results with presigned URL generation

### Participant Setup

#### Prerequisites
- AWS Account with appropriate permissions
- SageMaker Unified Studio access
- Basic understanding of machine learning concepts

#### Deployment Steps

1. **Deploy Infrastructure**
   ```bash
   # Deploy participant account resources
   aws cloudformation deploy \
     --template-file participant-infrastructure.yaml \
     --stack-name llm-leaderboard-participant \
     --capabilities CAPABILITY_IAM
   ```

2. **Configure Authentication**
   ```bash
   # Set up Cognito user pool and identity pool
   aws cognito-idp create-user-pool \
     --pool-name llm-leaderboard-participants
   ```

3. **Deploy Web Application**
   ```bash
   # Build and deploy frontend
   npm run build
   aws s3 sync dist/ s3://participant-webapp-bucket/
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```

### Participant Usage

#### 1. Model Training Workflow

**Step 1: Access SageMaker Unified Studio**
- Navigate to SageMaker Unified Studio in your AWS console
- Create a new project for your LLM training

**Step 2: Upload Training Data**
- Upload your training data directly through Unified Studio
- Ensure data is in JSONL format
- Data is automatically stored in the Training Data S3 bucket

**Step 3: Select Foundation Model**
- Choose from available JumpStart models (LLaMA 2, Claude, etc.)
- Configure model parameters and training settings

**Step 4: Fine-Tune Model**
- Start the fine-tuning job with your training data
- Monitor training progress through Unified Studio
- Model automatically deploys to Custom LLM Endpoint upon completion

#### 2. Testing Data Management

**Upload Testing Data**
```bash
# Via web interface or API
curl -X POST https://your-web-api.amazonaws.com/testing-data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@testing_data.jsonl"
```

**Validate Testing Data**
- Testing data is automatically validated for format and structure
- Validation results available through web interface
- Only validated data can be used for evaluation

#### 3. Model Inference and Evaluation

**Run Inference**
```bash
# Direct API call to your model
curl -X POST https://your-inference-api.amazonaws.com/inference \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Your test prompt here"}'
```

**Submit for Evaluation**
- Inference results automatically stored in Model Results S3
- Presigned URL generated for secure access
- Evaluation automatically triggered in leaderboard account

---

## Leaderboard Account

### Leaderboard Features

- **Model Evaluation**: Fair evaluation using Bedrock LLM as judge
- **Ranking System**: Automated ranking based on model performance
- **Public Leaderboard**: Web interface displaying current rankings
- **Judge Questions Management**: Configurable evaluation criteria
- **Cross-Account Security**: Secure access to participant results

### Leaderboard Architecture

#### Core Components

**Web Frontend**
- **CloudFront CDN**: Global content delivery for leaderboard display
- **S3 Leaderboard Assets**: Static files for leaderboard web interface

**API Layer**
- **Web API (API Gateway)**: Serves leaderboard data to frontend
- **Judge API (API Gateway)**: Receives evaluation requests from participants
- **Leaderboard API (Lambda)**: Central component managing leaderboard data, rankings, and API responses

**LLM Judge & Ranking System**
- **Judge Orchestrator (Lambda)**: Coordinates evaluation process
- **Bedrock LLM Judge**: Impartial AI judge for model evaluation
- **LLM Judge Questions S3**: Evaluation criteria and prompts

**Data Storage**
- **Leaderboard Results S3**: Current leaderboard rankings, scores, and historical data

### Leaderboard Setup

#### Prerequisites
- AWS Account with Bedrock access
- Appropriate IAM permissions for cross-account access
- Judge evaluation criteria prepared

#### Deployment Steps

1. **Deploy Infrastructure**
   ```bash
   # Deploy leaderboard account resources
   aws cloudformation deploy \
     --template-file leaderboard-infrastructure.yaml \
     --stack-name llm-leaderboard-main \
     --capabilities CAPABILITY_IAM
   ```

2. **Configure Bedrock Access**
   ```bash
   # Enable Bedrock model access
   aws bedrock put-model-invocation-logging-configuration \
     --logging-config destinationConfig='{cloudWatchConfig={logGroupName=bedrock-judge-logs,roleArn=arn:aws:iam::ACCOUNT:role/BedrockLoggingRole}}'
   ```

3. **Upload Judge Questions**
   ```bash
   # Upload evaluation criteria
   aws s3 cp judge-questions.json s3://llm-judge-questions-bucket/
   ```

4. **Deploy Web Application**
   ```bash
   # Build and deploy leaderboard frontend
   npm run build
   aws s3 sync dist/ s3://leaderboard-webapp-bucket/
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```

### Leaderboard Usage

#### 1. Judge Questions Management

**Upload Evaluation Criteria**
```json
{
  "evaluation_criteria": [
    {
      "category": "accuracy",
      "weight": 0.4,
      "questions": [
        "How accurate is the model's response?",
        "Does the response contain factual errors?"
      ]
    },
    {
      "category": "coherence",
      "weight": 0.3,
      "questions": [
        "Is the response logically structured?",
        "Does the response flow naturally?"
      ]
    },
    {
      "category": "relevance",
      "weight": 0.3,
      "questions": [
        "How relevant is the response to the prompt?",
        "Does the response address all aspects of the question?"
      ]
    }
  ]
}
```

#### 2. Evaluation Process

**Automatic Evaluation Flow**
1. Participant submits model results via presigned URL
2. Judge Orchestrator receives evaluation request
3. Judge retrieves evaluation criteria from S3
4. Bedrock LLM Judge evaluates results against criteria
5. Scores calculated and sent to Leaderboard API Lambda
6. Leaderboard API Lambda updates rankings and stores results in S3
7. Leaderboard automatically refreshes with new rankings

#### 3. Leaderboard Management

**View Current Rankings**
- Access leaderboard web interface
- Rankings updated in real-time
- Detailed score breakdowns available

**Monitor Evaluation Activity**
```bash
# Check evaluation logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/judge-orchestrator \
  --start-time $(date -d '1 hour ago' +%s)000

# Check leaderboard API logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/leaderboard-api \
  --start-time $(date -d '1 hour ago' +%s)000
```

---

## Cross-Account Integration

### Security Model

**IAM Cross-Account Roles**
- Participant accounts assume roles in leaderboard account
- Least privilege access principles
- Temporary credentials for all cross-account operations

**Presigned URL Access**
- Secure, time-limited access to participant results
- No permanent cross-account S3 permissions required
- Automatic expiration for enhanced security

### Integration Flow

1. **Participant Model Training**: Self-contained in participant account
2. **Result Submission**: Presigned URL generated by participant
3. **Cross-Account Trigger**: Participant triggers leaderboard evaluation
4. **Secure Evaluation**: Leaderboard accesses results via presigned URL
5. **Ranking Processing**: Judge Orchestrator sends scores to Leaderboard API Lambda
6. **Data Storage**: Leaderboard API Lambda stores results in S3
7. **Frontend Update**: Leaderboard web interface displays updated rankings

---

## Security

### Data Protection
- **Encryption at Rest**: All S3 buckets encrypted with AWS KMS
- **Encryption in Transit**: HTTPS/TLS for all API communications
- **Access Logging**: Comprehensive audit trails for all operations
- **Lambda Security**: Function-level IAM roles with least privilege access

### Authentication & Authorization
- **Cognito Integration**: Secure user authentication
- **API Gateway Authorization**: Token-based API access
- **Cross-Account IAM**: Minimal required permissions

### Network Security
- **CloudFront**: DDoS protection and edge security
- **API Gateway**: Rate limiting and request validation
- **VPC Endpoints**: Private connectivity where applicable

---

## Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js and npm for frontend builds
- Python 3.9+ for Lambda functions
- AWS CDK (optional, for infrastructure as code)

### Quick Start

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/llm-leaderboard.git
   cd llm-leaderboard
   ```

2. **Deploy Participant Account**
   ```bash
   cd participant-account
   ./deploy.sh
   ```

3. **Deploy Leaderboard Account**
   ```bash
   cd ../leaderboard-account
   ./deploy.sh
   ```

4. **Configure Cross-Account Access**
   ```bash
   cd ../scripts
   ./setup-cross-account.sh
   ```

### Environment Variables

**Participant Account**
```bash
export PARTICIPANT_ACCOUNT_ID=123456789012
export LEADERBOARD_ACCOUNT_ID=210987654321
export COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
export SAGEMAKER_EXECUTION_ROLE_ARN=arn:aws:iam::123456789012:role/SageMakerExecutionRole
```

**Leaderboard Account**
```bash
export LEADERBOARD_ACCOUNT_ID=210987654321
export BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
export JUDGE_QUESTIONS_BUCKET=llm-judge-questions-bucket
```

### Monitoring and Troubleshooting

**CloudWatch Dashboards**
- Participant account: Model training and inference metrics
- Leaderboard account: Evaluation and ranking metrics

**Common Issues**
- Cross-account permission errors: Check IAM roles and policies
- Presigned URL expiration: Verify URL generation and timing
- Model endpoint failures: Check SageMaker endpoint status

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Support

For questions and support:
- Create an issue in the GitHub repository
- Contact the development team at [email]
- Check the documentation wiki for detailed guides