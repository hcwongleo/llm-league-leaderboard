import json
import boto3
import os
import logging
import time
import requests
from typing import Dict, List, Any


# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')
bedrock_client = boto3.client('bedrock')

# Environment variables
JUDGE_CRITERIA_BUCKET = os.environ['JUDGE_CRITERIA_BUCKET']
BEDROCK_MODEL_ID = os.environ['BEDROCK_MODEL_ID']
PARTICIPANT_RESULTS_BUCKET = os.environ['PARTICIPANT_RESULTS_BUCKET']
BEDROCK_EVALUATION_ROLE_ARN = os.environ['BEDROCK_EVALUATION_ROLE_ARN']
EVALUATION_OUTPUT_BUCKET = os.environ['EVALUATION_OUTPUT_BUCKET']

def handler(event, context):
    """
    Main handler for judge orchestrator
    Receives evaluation requests from participants via standard HTTPS API calls
    and coordinates the judging process using Bedrock LLM
    """
    try:
        logger.info(f"Received evaluation request from participant")
        logger.debug(f"Event details: {json.dumps(event, default=str)}")
        
        # Parse the request body from standard HTTPS POST request
        raw_body = event.get('body', '{}')
        logger.info(f"Raw request body: {raw_body}")
        
        body = json.loads(raw_body)
        participant_id = body.get('participantId')
        presigned_url = body.get('presignedUrl')
        
        logger.info(f"Parsed participant_id: {participant_id}")
        logger.info(f"Parsed presigned_url: {presigned_url}")
        
        # Log the request details (without sensitive URLs)
        logger.info(f"Processing evaluation for participant: {participant_id}")
        
        if not participant_id or not presigned_url:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Missing required parameters: participantId and presignedUrl'
                })
            }
        
        # Load judge questions
        logger.info("Loading judge questions...")
        judge_questions = load_judge_questions()
        logger.info("Judge questions loaded successfully")
        
        # TODO: improve it to use cross-account S3 CopyObject
        # Copy participant results to our S3 bucket
        logger.info("Retrieving and copying participant results...")
        participant_results_s3_uri = retrieve_participant_results(presigned_url, participant_id)
        logger.info(f"Participant results copied to: {participant_results_s3_uri}")
        
        # Evaluate using Bedrock LLM Judge
        logger.info("Starting Bedrock evaluation...")
        evaluation_scores = evaluate_with_bedrock_judge(
            participant_results_s3_uri, 
            judge_questions,
            participant_id
        )
        logger.info("Bedrock evaluation completed")
        
        # Note: Results will be stored in S3 by Bedrock evaluation job
        logger.info(f"Evaluation job started for participant {participant_id}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'message': 'Evaluation job started successfully',
                'participantId': participant_id,
                'evaluationJobArn': evaluation_scores.get('evaluationJobArn'),
                'evaluationJobName': evaluation_scores.get('evaluationJobName'),
                'status': evaluation_scores.get('status', 'IN_PROGRESS'),
                'timestamp': evaluation_scores['timestamp'],
                'participantResultsS3Uri': evaluation_scores.get('datasetS3Uri', participant_results_s3_uri),
                'outputS3Uri': evaluation_scores.get('outputS3Uri')
            })
        }
        
    except Exception as e:
        logger.error(f"Error in judge orchestrator: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def load_judge_questions() -> Dict[str, Any]:
    """Load judge questions and evaluation criteria from S3"""
    try:
        response = s3_client.get_object(
            Bucket=JUDGE_CRITERIA_BUCKET,
            Key='judge-criteria.json'
        )
        questions_data = json.loads(response['Body'].read().decode('utf-8'))
        logger.info("Successfully loaded judge questions")
        return questions_data
    except Exception as e:
        logger.error(f"Error loading judge questions: {str(e)}")
        raise

def retrieve_participant_results(presigned_url: str, participant_id: str) -> str:
    """Copy participant results from presigned URL to our S3 bucket and return S3 URI"""
    try:
        logger.info(f"Retrieving participant results via presigned URL: {presigned_url}")
        
        # Standard HTTPS GET request to presigned URL
        response = requests.get(
            presigned_url, 
            timeout=30,
            headers={
                'User-Agent': 'LLM-Leaderboard-Judge/1.0'
            }
        )
        response.raise_for_status()
        
        # DEBUG: Log response details
        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response headers: {dict(response.headers)}")
        logger.info(f"Response content length: {len(response.content)}")
        
        # Get the content as bytes and log first 500 chars for debugging
        content = response.content
        content_preview = content.decode('utf-8')[:500] if content else "No content"
        logger.info(f"Response content preview: {content_preview}")
        
        # Generate S3 key for storing the participant results
        timestamp = int(time.time())
        s3_key = f"participant-results/{participant_id}/{timestamp}/dataset.jsonl"
        
        logger.info(f"Storing data to S3 key: {s3_key}")
        
        # Copy to our S3 bucket
        s3_client.put_object(
            Bucket=PARTICIPANT_RESULTS_BUCKET,
            Key=s3_key,
            Body=content,
            ContentType='application/jsonl',
            Metadata={
                'participant-id': participant_id,
                'original-url-hash': str(hash(presigned_url)),
                'timestamp': str(timestamp)
            }
        )
        
        # Return S3 URI for the copied file
        s3_uri = f"s3://{PARTICIPANT_RESULTS_BUCKET}/{s3_key}"
        logger.info(f"Successfully copied participant results to S3: {s3_uri}")
        
        return s3_uri
    
    except Exception as e:
        logger.error(f"Unexpected error retrieving participant results: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise

def evaluate_with_bedrock_judge(
    participant_results_s3_uri: str, 
    judge_questions: Dict[str, Any],
    participant_id: str
) -> Dict[str, Any]:
    """Evaluate participant results using Bedrock LLM Judge"""
    try:
        logger.info(f"Starting Bedrock evaluation for participant {participant_id}")
        logger.info(f"Participant results stored at: {participant_results_s3_uri}")
        
        # Generate unique job name
        timestamp = int(time.time())
        job_name = f"llm-judge-{participant_id}-{timestamp}"
        
        # All available LLM-as-judge metrics
        llm_judge_metrics = [
            "Builtin.Correctness",
            "Builtin.Completeness", 
            # "Builtin.Faithfulness",
            # "Builtin.Helpfulness",
            # "Builtin.Coherence",
            # "Builtin.Relevance",
            # "Builtin.FollowingInstructions",
            "Builtin.ProfessionalStyleAndTone"
            # "Builtin.Harmfulness",
            # "Builtin.Stereotyping",
            # "Builtin.Refusal"
        ]

        # Configure dataset using the S3 URI where we copied the participant results
        dataset_config = {
            "name": f"ParticipantDataset-{participant_id}",
            "datasetLocation": {
                "s3Uri": participant_results_s3_uri
            }
        }

        # Configure output S3 URI for evaluation results
        output_s3_uri = f"s3://{EVALUATION_OUTPUT_BUCKET}/evaluation-results/{participant_id}/"
        
        # Task type for the evaluation (adjust based on your use case)
        task_type = "General"
        
        # Evaluator model ID
        evaluator_model_id = "amazon.nova-pro-v1:0"
        
        # Model clean name for inference source
        model_clean_name = f"{participant_id}"

        try:
            response = bedrock_client.create_evaluation_job(
                jobName=job_name,
                roleArn=BEDROCK_EVALUATION_ROLE_ARN,
                applicationType="ModelEvaluation",
                evaluationConfig={
                    "automated": {
                        "datasetMetricConfigs": [
                            {
                                "taskType": task_type,
                                "dataset": dataset_config,
                                "metricNames": llm_judge_metrics
                            }
                        ],
                        "evaluatorModelConfig": {
                            "bedrockEvaluatorModels": [
                                {
                                    "modelIdentifier": evaluator_model_id
                                }
                            ]
                        }
                    }
                },
                inferenceConfig={
                    "models": [
                        {
                            'precomputedInferenceSource': {
                                'inferenceSourceIdentifier': model_clean_name
                            }
                        }
                    ]
                },
                outputDataConfig={
                    "s3Uri": output_s3_uri
                }
            )
            
            logger.info(f"Created Bedrock evaluation job: {response['jobArn']}")
            
            # Return evaluation job information
            evaluation_result = {
                'participantId': participant_id,
                'evaluationJobArn': response['jobArn'],
                'evaluationJobName': job_name,
                'status': 'IN_PROGRESS',
                'outputS3Uri': output_s3_uri,
                'timestamp': timestamp,
                'datasetS3Uri': participant_results_s3_uri,
                'metrics': llm_judge_metrics,
                'taskType': task_type
            }
            
            logger.info(f"Started Bedrock evaluation job for participant {participant_id}")
            return evaluation_result
            
        except Exception as e:
            logger.error(f"Error creating evaluation job: {str(e)}")
            raise
        
    except Exception as e:
        logger.error(f"Error in Bedrock evaluation: {str(e)}")
        raise

# Note: Results are now stored directly in S3 by Bedrock evaluation jobs
# The leaderboard API will read results from S3 instead of DynamoDB