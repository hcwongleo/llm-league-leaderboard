#!/bin/bash

# Simple test script for LLM Leaderboard APIs
# Usage: ./test.sh <judge-api-url> [leaderboard-api-url]

JUDGE_API_URL="https://6lw445t23l.execute-api.us-east-1.amazonaws.com/prod/"

echo "Testing LLM Leaderboard APIs"
echo "============================"

# Test Judge API
echo "Testing Judge API..."

curl -X POST "${JUDGE_API_URL}/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "participant-004",
    "presignedUrl": "https://leo-aws-sharing-761018861641-us-east-1.s3.us-east-1.amazonaws.com/mock-bedrock-dataset004.jsonl?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEKD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJHMEUCIQCPtlFZ3jHAVwwLweopcYzJtLlOXf9jFKx3T4xQxt6eWQIgZiLDK%2BgtNYt5E1Do8MB7SnIBVLe%2F5gi4FxqjsroCKegq4QQI2f%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw3NjEwMTg4NjE2NDEiDBgbPoMwRKzukzQZoSq1BLYNtR20cG8S2guIfdZOBVLDW5m6CjaBWGByPQraWnx8DFFkj1ANksiMMoHRu2CYgo4PbtJLchRz%2Bk3Tb5erApPd3%2FX03cm5HcpeNnIFXM9deXtJ5Fgn6XYg7bHPUTqXInbMNq4bQqqQIMzk%2BpY2DCT0%2Bk313sjUtnthpGiv4y9tKdTj6IuSYD%2BGYxZSN6DfaOP23KmnuCUrYJcomCp61HGwkUvo5%2B3uY2GWpoKXRszYwjf5KNDZaAXg1%2BtDMrpkRkib%2FIr3e7mjUA4XDPjeGm2Ar1pqQ%2FsDm24klfIRLBupKc1W%2FqJZZDeh1Pn%2BjBaSN3gA7o5t6rGD1FpXBdaLe7NeSQ0abwbc0y0mdN9nH0aL5kiHU47UMJgxHJ56I%2FP5RmUK059Tv5sl7Wony8BZF%2FKGReSk9w18Sh0dtr4LnKlo7n581mikoHs64j5fwOJnbhE3lTlZoQb2AFobwa0kLjSm9jlef3pJFXgdFOWXdEddzkLAlzrTQKNgCKhbXn1gGyAVi5CrD3eQyMcflT6gYjBT64LBdKxAas31dn%2F%2B%2FolvY9ew5DW50Z1SutQi0W%2BQJXrgvn5QQSnbdx8cywIGeah23cDNOYUEoiLsCd%2FfiqHVtTpRgbwU%2FLkfYXralq01xphWrCv8Jr6jmKqzTq4XJvaBKmWhdBjhVe5zD0v7I8dgP1ytgqZvXgz8p9d60DkCD7y%2F82EBxTEyV70YE6bC85x8mRZVGsG%2FcWlnU35A7FPCrMqfrEkw4fXixAY6twImrEzHYi4XcXTjoxu%2FPpmnlG3TS9wy7vJjoWe2R9G56jkDPW13UE%2FaSb%2BwnUuVxUK5l0Grc%2BdQGbdkvdtRAyVsEsCK8WNQoqDuBW1Bz1xRBjsRWcg64Hq3Ar31mm1Vz%2BQABUuOcDUboqqad8qb1amZCPHjuz6htMo0t0TVwrQCYOeCvg%2BiKawiCVQCBrzdtYOOSp3MIwuvX%2B4BP7S%2B74sMzspUD6YtdOAV2KVVF3FfOIWvKOEHm2l%2FSmukyC7dBsC9xumrmOiktWX5y2%2F4HD1M4ZUmzq2ET9SmDVDu7QtJFkoMvlSR3UkRsAi8BgGJw2F21EQ53bMzldPvD0T5cLqvFPDCioVLwCmBpGk%2Bc1753Af7dRzxih%2Byg8MMzLST87etY2Iq%2BnZV6TFWdA93GgWzi45A%2FKp1rA%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIA3CMCCJBE3B4W7ZHK%2F20250810%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250810T153119Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=935b980438442436d9d478b2fb6bf89ffa62a9d78cd831ef5b1975f4e524caef"
  }'

echo -e "\n"

echo "Test completed!"