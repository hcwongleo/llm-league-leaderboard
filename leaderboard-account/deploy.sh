#!/bin/bash

# LLM Leaderboard Account Deployment Script

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting LLM Leaderboard Account Deployment..."
echo "📁 Working directory: $(pwd)"


# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed. Please install npm."
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is not installed. Please install AWS CLI."
        exit 1
    fi
    
    if ! command -v cdk &> /dev/null; then
        echo "❌ AWS CDK is not installed. Installing..."
        npm install -g aws-cdk
    fi
    
    echo "✅ All dependencies are installed."
}

# Install backend dependencies
install_backend_dependencies() {
    echo "📦 Installing backend dependencies..."
    npm install
    
    # Install Lambda dependencies
    echo "📦 Installing Lambda function dependencies..."
    
    if [ -d "lambda/judge-orchestrator" ]; then
        cd lambda/judge-orchestrator
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt -t .
        fi
        cd ../..
    fi
    
    if [ -d "lambda/leaderboard-api" ]; then
        cd lambda/leaderboard-api
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt -t .
        fi
        cd ../..
    fi
}

# Build frontend
build_frontend() {
    echo "🏗️  Building React frontend..."
    
    # Navigate to frontend directory
    if [ -d "frontend" ]; then
        cd frontend
        
        # Install frontend dependencies
        echo "📦 Installing frontend dependencies..."
        npm install
        
        # Build the frontend
        echo "🔨 Building frontend for production..."
        npm run build
        
        # Go back to root directory
        cd ..
        
        if [ -d "frontend/dist" ]; then
            echo "✅ Frontend build completed successfully."
        else
            echo "❌ Frontend build failed - dist directory not found."
            exit 1
        fi
    else
        echo "❌ Frontend directory not found."
        exit 1
    fi
}

# Bootstrap CDK (if needed)
bootstrap_cdk() {
    echo "🔧 Checking CDK bootstrap status..."
    
    # Check if CDK is already bootstrapped
    if aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
        echo "✅ CDK is already bootstrapped."
    else
        echo "🔧 Bootstrapping CDK..."
        cdk bootstrap
        echo "✅ CDK bootstrap completed."
    fi
}

# Deploy infrastructure
deploy_infrastructure() {
    echo "🚀 Deploying infrastructure..."
    
    # Build TypeScript
    echo "🔨 Building TypeScript..."
    npm run build
    
    # Deploy CDK stack
    echo "🚀 Deploying CDK stack..."
    cdk deploy --require-approval never
    
    echo "✅ Infrastructure deployment completed."
}

# Get stack outputs
get_outputs() {
    echo "📋 Getting deployment outputs..."
    
    # Get CloudFormation outputs
    STACK_NAME="LLMLeaderboardStack"
    
    echo "📊 Deployment Summary:"
    echo "===================="
    
    # Get outputs using AWS CLI
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Note down the URLs above for integration"
    echo "2. Configure participant accounts to use the Judge API URL"
    echo "3. Update judge questions in S3 if needed"
    echo "4. Monitor CloudWatch logs for any issues"
}

# Main deployment flow
main() {
    echo "🎯 LLM Leaderboard Account Deployment"
    echo "====================================="
    
    check_dependencies
    install_backend_dependencies
    build_frontend
    bootstrap_cdk
    deploy_infrastructure
    get_outputs
}

# Handle script arguments
case "${1:-deploy}" in
    "check")
        check_dependencies
        ;;
    "build")
        install_backend_dependencies
        build_frontend
        ;;
    "deploy")
        main
        ;;
    "destroy")
        echo "🗑️  Destroying infrastructure..."
        cdk destroy --force
        echo "✅ Infrastructure destroyed."
        ;;
    *)
        echo "Usage: $0 [check|build|deploy|destroy]"
        echo ""
        echo "Commands:"
        echo "  check   - Check dependencies only"
        echo "  build   - Build frontend and install dependencies only"
        echo "  deploy  - Full deployment (default)"
        echo "  destroy - Destroy all infrastructure"
        exit 1
        ;;
esac