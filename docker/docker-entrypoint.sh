#!/bin/bash
set -e

if [ "$1" = 'supervisord' ]; then
    source /usr/local/download.sh
    echo "starting spiderlex"
fi

exec "$@"
