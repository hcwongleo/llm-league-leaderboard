import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class LeaderboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Buckets
    const webAppBucket = new s3.Bucket(this, 'LeaderboardWebAppBucket', {
      bucketName: `llm-leaderboard-webapp-${this.account}-${this.region}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const judgeQuestionsBucket = new s3.Bucket(this, 'JudgeQuestionsBucket', {
      bucketName: `llm-judge-questions-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const participantResultsBucket = new s3.Bucket(this, 'ParticipantResultsBucket', {
      bucketName: `llm-participant-results-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: 'DeleteOldResults',
          enabled: true,
          expiration: cdk.Duration.days(90), // Keep results for 90 days
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    const evaluationOutputBucket = new s3.Bucket(this, 'EvaluationOutputBucket', {
      bucketName: `llm-evaluation-output-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: 'DeleteOldEvaluations',
          enabled: true,
          expiration: cdk.Duration.days(180), // Keep evaluation results for 180 days
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });



    // IAM Role for Bedrock Evaluations (must be declared before Lambda role)
    const bedrockEvaluationRole = new iam.Role(this, 'BedrockEvaluationRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      inlinePolicies: {
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:ListBucket',
              ],
              resources: [
                participantResultsBucket.bucketArn,
                participantResultsBucket.arnForObjects('*'),
                judgeQuestionsBucket.bucketArn,
                judgeQuestionsBucket.arnForObjects('*'),
                evaluationOutputBucket.bucketArn,
                evaluationOutputBucket.arnForObjects('*'),
              ],
            }),
          ],
        }),
        BedrockModelAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // IAM Role for Lambda functions
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:CreateEvaluationJob',
                'bedrock:GetEvaluationJob',
                'bedrock:ListEvaluationJobs',
                'bedrock:StopEvaluationJob',
              ],
              resources: ['*'],
            }),
          ],
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:PutObjectMetadata'],
              resources: [
                judgeQuestionsBucket.arnForObjects('*'),
                participantResultsBucket.arnForObjects('*'),
                evaluationOutputBucket.arnForObjects('*'),
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [
                judgeQuestionsBucket.bucketArn,
                participantResultsBucket.bucketArn,
                evaluationOutputBucket.bucketArn,
              ],
            }),
          ],
        }),

        IAMPassRole: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['iam:PassRole'],
              resources: [bedrockEvaluationRole.roleArn],
            }),
          ],
        }),
      },
    });

    // Lambda Functions
    const judgeOrchestratorFunction = new lambda.Function(this, 'JudgeOrchestratorFunction', {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: 'judge_orchestrator.handler',
      code: lambda.Code.fromAsset('lambda/judge-orchestrator'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      role: lambdaExecutionRole,
      environment: {
        JUDGE_QUESTIONS_BUCKET: judgeQuestionsBucket.bucketName,
        PARTICIPANT_RESULTS_BUCKET: participantResultsBucket.bucketName,
        BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
        BEDROCK_EVALUATION_ROLE_ARN: bedrockEvaluationRole.roleArn,
        EVALUATION_OUTPUT_BUCKET: evaluationOutputBucket.bucketName,
      },
    });

    const leaderboardApiFunction = new lambda.Function(this, 'LeaderboardApiFunction', {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: 'leaderboard_api.handler',
      code: lambda.Code.fromAsset('lambda/leaderboard-api'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      role: lambdaExecutionRole,
      environment: {
        EVALUATION_OUTPUT_BUCKET: evaluationOutputBucket.bucketName,
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'LeaderboardApi', {
      restApiName: 'LLM Leaderboard API',
      description: 'API for LLM Leaderboard system',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // Judge API - Public API for participant evaluation requests
    const judgeApi = new apigateway.RestApi(this, 'JudgeApi', {
      restApiName: 'LLM Judge API',
      description: 'Public API for LLM Judge evaluation system - accepts HTTPS requests from participant accounts',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },

    });

    // Request model for Judge API
    const evaluationRequestModel = judgeApi.addModel('EvaluationRequestModel', {
      contentType: 'application/json',
      modelName: 'EvaluationRequest',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'Evaluation Request',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          participantId: {
            type: apigateway.JsonSchemaType.STRING,
            description: 'Unique identifier for the participant',
          },
          presignedUrl: {
            type: apigateway.JsonSchemaType.STRING,
            description: 'Presigned URL to access participant model results',
          },
          modelName: {
            type: apigateway.JsonSchemaType.STRING,
            description: 'Name of the participant model',
          },
        },
        required: ['participantId', 'presignedUrl'],
      },
    });

    // API Resources and Methods
    const leaderboardResource = api.root.addResource('leaderboard');
    leaderboardResource.addMethod('GET', new apigateway.LambdaIntegration(leaderboardApiFunction));

    const judgeResource = judgeApi.root.addResource('evaluate');
    judgeResource.addMethod('POST', new apigateway.LambdaIntegration(judgeOrchestratorFunction), {
      requestModels: {
        'application/json': evaluationRequestModel,
      },
    });

    // CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for Leaderboard S3 bucket',
    });

    // Grant CloudFront access to S3 bucket
    webAppBucket.grantRead(originAccessIdentity);

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'LeaderboardDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(webAppBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/leaderboard': {
          origin: new origins.RestApiOrigin(api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Deploy frontend assets
    new s3deploy.BucketDeployment(this, 'DeployWebApp', {
      sources: [s3deploy.Source.asset('./frontend/dist')],
      destinationBucket: webAppBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Deploy judge questions
    new s3deploy.BucketDeployment(this, 'DeployJudgeQuestions', {
      sources: [s3deploy.Source.asset('./judge-questions')],
      destinationBucket: judgeQuestionsBucket,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LeaderboardUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Leaderboard Web Application URL',
    });

    new cdk.CfnOutput(this, 'LeaderboardApiUrl', {
      value: api.url,
      description: 'Leaderboard API URL',
    });

    new cdk.CfnOutput(this, 'JudgeApiUrl', {
      value: judgeApi.url,
      description: 'Judge API URL',
    });

    new cdk.CfnOutput(this, 'ParticipantResultsBucketName', {
      value: participantResultsBucket.bucketName,
      description: 'S3 Bucket for storing participant results',
    });

    new cdk.CfnOutput(this, 'BedrockEvaluationRoleArn', {
      value: bedrockEvaluationRole.roleArn,
      description: 'IAM Role ARN for Bedrock evaluations',
    });

    new cdk.CfnOutput(this, 'EvaluationOutputBucketName', {
      value: evaluationOutputBucket.bucketName,
      description: 'S3 Bucket for storing Bedrock evaluation results',
    });
  }
}