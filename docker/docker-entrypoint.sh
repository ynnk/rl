#!/bin/bash

source /usr/local/download.sh
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
