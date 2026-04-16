#!/bin/bash

echo "=== Managing services via Supervisor ==="

# Just restart all services through supervisor
supervisorctl restart all

sleep 3

echo ""
echo "=== Service Status ==="
supervisorctl status

echo ""
echo "=== Services running on ==="
echo "Port 3000: Nginx (frontend + proxy)"
echo "Port 3001: Voice assistant"
echo "Port 4096: 100xprompt backend"
echo "Port 8001: Session backend"
