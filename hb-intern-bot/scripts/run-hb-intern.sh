#!/bin/bash

# hb-intern cron runner script
# Usage: Add to crontab with: 0 */3 * * * /path/to/run-hb-intern.sh

set -e

# Change to script directory
cd "$(dirname "$0")/.."

# Load environment variables (create .env file with your keys)
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Ensure required env vars are set
if [ -z "$HYPERBROWSER_API_KEY" ]; then
    echo "Error: HYPERBROWSER_API_KEY not set"
    exit 1
fi

# Run hb-intern
echo "$(date): Running hb-intern..."
node dist/cli.js --config bots.config.yaml --top 10 --slack 2>&1 | tee -a logs/hb-intern.log

echo "$(date): hb-intern completed"
