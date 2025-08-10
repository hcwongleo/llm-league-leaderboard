import json
import boto3
import os
import logging
import time
from typing import Dict, List, Any, Optional
import re
from collections import defaultdict

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')

# Environment variables
EVALUATION_OUTPUT_BUCKET = os.environ['EVALUATION_OUTPUT_BUCKET']

def handler(event, context):
    """
    Main handler for leaderboard API
    Always processes latest S3 results and returns fresh leaderboard
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get the HTTP method and path
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        query_params = event.get('queryStringParameters') or {}
        
        if path.endswith('/leaderboard') and http_method == 'GET':
            return get_leaderboard(query_params, context)
        
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': 'Endpoint not found'})
        }
        
    except Exception as e:
        logger.error(f"Error in leaderboard API: {str(e)}")
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

def get_leaderboard(query_params: Dict[str, str], context=None):
    """Get fresh leaderboard by processing latest S3 evaluation results"""
    try:
        limit = int(query_params.get('limit', '50'))
        
        # Process all participants from S3
        participants = process_all_participant_results()
        
        # Sort with tiebreaker logic:
        # 1. Primary: Higher total score wins
        # 2. Tiebreaker: Earlier timestamp wins (first to achieve the score)
        # 3. Final fallback: Alphabetical by participant ID
        sorted_participants = sorted(
            participants,
            key=lambda x: (
                -x['totalScore'],      # Negative for descending order (higher scores first)
                x['timestamp'],        # Ascending order (earlier timestamps first)
                x['participantId']     # Alphabetical order as final fallback
            )
        )
        
        # Add rank numbers and limit results
        for i, participant in enumerate(sorted_participants[:limit]):
            participant['rank'] = i + 1
        
        rankings = sorted_participants[:limit]
        
        logger.info(f"Leaderboard generated with {len(rankings)} participants using tiebreaker logic")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',  # Always fresh data
            },
            'body': json.dumps({
                'rankings': rankings,
                'timestamp': int(time.time()),
                'count': len(rankings)
            })
        }
        
    except Exception as e:
        logger.error(f"Error getting leaderboard: {str(e)}")
        raise

def process_all_participant_results() -> List[Dict[str, Any]]:
    """Process evaluation results for all participants directly from S3"""
    try:
        # List all participant directories in S3
        response = s3_client.list_objects_v2(
            Bucket=EVALUATION_OUTPUT_BUCKET,
            Prefix='evaluation-results/',
            Delimiter='/'
        )
        
        participants = []
        
        # Extract participant IDs from S3 prefixes and process each one
        for prefix_info in response.get('CommonPrefixes', []):
            prefix = prefix_info['Prefix']
            # Extract participant ID from path like 'evaluation-results/participant-001/'
            match = re.search(r'evaluation-results/([^/]+)/', prefix)
            if match:
                participant_id = match.group(1)
                logger.info(f"Processing results for participant: {participant_id}")
                
                try:
                    # Find the latest evaluation results
                    latest_result_key = find_latest_evaluation_result(participant_id)
                    if not latest_result_key:
                        logger.warning(f"No evaluation results found for participant: {participant_id}")
                        continue
                    
                    # Download and parse the JSONL file
                    evaluation_data = download_and_parse_evaluation_results(latest_result_key)
                    if not evaluation_data:
                        logger.warning(f"No evaluation data found in {latest_result_key}")
                        continue
                    
                    # Extract timestamp from the S3 key
                    job_timestamp = None
                    timestamp_match = re.search(r'llm-judge-[^/]+-(\d{10,})', latest_result_key)
                    if timestamp_match:
                        job_timestamp = int(timestamp_match.group(1))
                    
                    # Calculate metric summaries
                    metric_summary = calculate_metric_summary(evaluation_data, job_timestamp)
                    
                    logger.info(f"Successfully processed participant {participant_id} - Total Score: {metric_summary['totalScore']:.3f}")
                    
                    participants.append({
                        'participantId': participant_id,
                        'modelName': participant_id,  # Use participant ID as model name
                        'totalScore': metric_summary['totalScore'],
                        'metricScores': metric_summary['metricScores'],
                        'evaluationCount': metric_summary['evaluationCount'],
                        'timestamp': metric_summary['timestamp'],
                        'status': 'COMPLETED'
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing participant {participant_id}: {str(e)}")
                    continue
        
        return participants
        
    except Exception as e:
        logger.error(f"Error processing all participant results: {str(e)}")
        raise



def find_latest_evaluation_result(participant_id: str) -> Optional[str]:
    """Find the latest evaluation result file for a participant"""
    try:
        prefix = f'evaluation-results/{participant_id}/'
        response = s3_client.list_objects_v2(
            Bucket=EVALUATION_OUTPUT_BUCKET,
            Prefix=prefix
        )
        
        if 'Contents' not in response:
            logger.warning(f"No evaluation results found for participant: {participant_id}")
            return None
        
        # Find JSONL output files and sort by timestamp
        jsonl_files = []
        for obj in response['Contents']:
            key = obj['Key']
            if key.endswith('_output.jsonl'):
                # Extract timestamp from job name: llm-judge-participant-XXX-TIMESTAMP
                timestamp_match = re.search(r'llm-judge-[^/]+-(\d{10,})', key)
                if timestamp_match:
                    timestamp = int(timestamp_match.group(1))
                    jsonl_files.append((timestamp, key))
        
        if not jsonl_files:
            logger.warning(f"No JSONL output files found for participant {participant_id}")
            return None
        
        # Return the latest file
        jsonl_files.sort(reverse=True)
        latest_key = jsonl_files[0][1]
        logger.info(f"Found latest evaluation result for {participant_id}: {latest_key}")
        return latest_key
        
    except Exception as e:
        logger.error(f"Error finding latest evaluation result for {participant_id}: {str(e)}")
        raise

def download_and_parse_evaluation_results(s3_key: str) -> List[Dict[str, Any]]:
    """Download and parse JSONL evaluation results from S3"""
    try:
        response = s3_client.get_object(
            Bucket=EVALUATION_OUTPUT_BUCKET,
            Key=s3_key
        )
        
        content = response['Body'].read().decode('utf-8')
        
        # Parse JSONL format (one JSON object per line)
        evaluation_records = []
        for line in content.strip().split('\n'):
            if line.strip():
                try:
                    record = json.loads(line)
                    evaluation_records.append(record)
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON line: {line[:100]}... Error: {str(e)}")
                    continue
        
        logger.info(f"Parsed {len(evaluation_records)} evaluation records from {s3_key}")
        return evaluation_records
        
    except Exception as e:
        logger.error(f"Error downloading/parsing evaluation results from {s3_key}: {str(e)}")
        raise

def calculate_metric_summary(evaluation_data: List[Dict[str, Any]], job_timestamp: Optional[int] = None) -> Dict[str, Any]:
    """Calculate metric summary from evaluation data"""
    try:
        metric_totals = defaultdict(list)
        category_counts = defaultdict(int)
        total_evaluations = len(evaluation_data)
        
        # Process each evaluation record
        for record in evaluation_data:
            automated_result = record.get('automatedEvaluationResult', {})
            scores = automated_result.get('scores', [])
            input_record = record.get('inputRecord', {})
            category = input_record.get('category', 'unknown')
            
            category_counts[category] += 1
            
            # Extract metric scores
            for score_info in scores:
                metric_name = score_info.get('metricName', '')
                result = score_info.get('result', 0.0)
                
                # Store score with category information
                metric_totals[metric_name].append({
                    'score': float(result),
                    'category': category
                })
        
        # Calculate metric averages
        metric_scores = {}
        
        for metric_name, scores in metric_totals.items():
            # Overall average for this metric
            overall_avg = sum(s['score'] for s in scores) / len(scores) if scores else 0.0
            metric_scores[metric_name] = overall_avg
        
        # Calculate total score (average of all metric averages)
        total_score = sum(metric_scores.values()) / len(metric_scores) if metric_scores else 0.0
        
        # Use the job timestamp from S3 path if available, otherwise current time
        timestamp = job_timestamp if job_timestamp else int(time.time())
        
        summary = {
            'totalScore': total_score,
            'metricScores': metric_scores,
            'evaluationCount': total_evaluations,
            'timestamp': timestamp
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Error calculating metric summary: {str(e)}")
        raise

