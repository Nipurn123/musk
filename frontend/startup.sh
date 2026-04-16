#!/bin/bash

# ============================================================================
# SSE Streaming Architecture Startup Script
# ============================================================================
# This script starts all services required for the SSE streaming architecture:
#
#   Port 3000  → Nginx (Frontend + Reverse Proxy)
#   Port 3001  → Express Server (AI Assistant API, LiveKit, SSE heartbeat proxy)
#   Port 4096  → 100XPrompt Core Backend (SSE streaming, session management)
#   Port 8001  → Python Backend (FastAPI) - via supervisor
#   Port 27017 → MongoDB - via supervisor
#
# Architecture:
#   Browser → Nginx:3000 → /global/event → 100XPrompt:4096 (SSE direct)
#                       → /api/ai-assistant → Server:3001 (LiveKit)
#                       → /session/* → 100XPrompt:4096
#                       → /api/* → Backend:8001
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Log directory
LOG_DIR="/tmp/100xprompt-logs"
mkdir -p "$LOG_DIR"

# PID files
PID_100XPROMPT="$LOG_DIR/100xprompt.pid"
PID_SERVER="$LOG_DIR/server.pid"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
}

check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port -t >/dev/null 2>&1; then
        log_success "$service is running on port $port"
        return 0
    else
        log_error "$service is NOT running on port $port"
        return 1
    fi
}

wait_for_port() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    while ! lsof -i :$port -t >/dev/null 2>&1; do
        if [ $attempt -ge $max_attempts ]; then
            log_error "Timeout waiting for $service on port $port"
            return 1
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo ""
    return 0
}

kill_if_running() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
    fi
}

# ============================================================================
# Cleanup Function
# ============================================================================

cleanup() {
    log_section "Stopping Services"
    kill_if_running "$PID_100XPROMPT" "100XPrompt Backend"
    kill_if_running "$PID_SERVER" "AI Assistant Server"
    log_info "Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ============================================================================
# Print Banner
# ============================================================================

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        100XPrompt SSE Streaming Architecture Startup          ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Key Features:"
    echo "  • SSE Proxy with Heartbeat Injection (1s intervals)"
    echo "  • LiveKit Integration for AI Voice Assistant"
    echo "  • Cloud Run Agent Orchestration"
    echo "  • Auto-reconnect on SSE disconnect"
    echo "  • Anti-buffering headers for all streaming endpoints"
    echo ""
    echo "Architecture:"
    echo "  Browser → Nginx:3000"
    echo "            ├── /global/event → 100XPrompt:4096 (SSE direct)"
    echo "            ├── /api/ai-assistant → Server:3001 (LiveKit)"
    echo "            └── /session/* → 100XPrompt:4096"
    echo ""
}

# ============================================================================
# Check Environment
# ============================================================================

check_environment() {
    log_section "Checking Environment"
    
    # Check for .env file
    if [ ! -f ".env" ]; then
        log_warning "No .env file found in current directory"
        log_info "Creating example .env file..."
        cat > .env << 'EOF'
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Cloud Run Agent
CLOUD_RUN_URL=http://your-cloud-run-url

# Server Port
PORT=3001
EOF
        log_warning "Please edit .env with your actual credentials"
    else
        log_success ".env file found"
    fi
    
    # Check for required commands
    local missing_cmds=()
    for cmd in node npm npx; do
        if ! command -v $cmd &> /dev/null; then
            missing_cmds+=("$cmd")
        fi
    done
    
    if [ ${#missing_cmds[@]} -gt 0 ]; then
        log_error "Missing required commands: ${missing_cmds[*]}"
        exit 1
    fi
    log_success "All required commands available"
    
    # Check for 100xprompt command
    if ! command -v 100xprompt &> /dev/null; then
        log_warning "100xprompt command not found in PATH"
        log_info "Will attempt to start backend with alternative methods"
    fi
}

# ============================================================================
# Stop Existing Services
# ============================================================================

stop_existing() {
    log_section "Stopping Existing Services"
    
    # Kill any existing processes on our ports
    for port in 3001 4096; do
        local pids=$(lsof -t -i :$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            log_info "Killing existing processes on port $port: $pids"
            echo "$pids" | xargs kill 2>/dev/null || true
            sleep 1
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Clean up PID files
    rm -f "$PID_100XPROMPT" "$PID_SERVER"
    
    log_success "Existing services stopped"
}

# ============================================================================
# Start Supervisor Services
# ============================================================================

start_supervisor() {
    log_section "Starting Supervisor Services"
    
    if command -v supervisorctl &> /dev/null; then
        log_info "Starting supervisor services..."
        
        # Start all supervisor services
        supervisorctl start all 2>/dev/null || {
            log_warning "Supervisor start failed, trying individual services..."
            for service in frontend backend mongodb nginx-code-proxy; do
                supervisorctl start $service 2>/dev/null || true
            done
        }
        
        # Check supervisor status
        log_info "Supervisor status:"
        supervisorctl status 2>/dev/null || true
        
        log_success "Supervisor services started"
    else
        log_warning "supervisorctl not found, skipping supervisor services"
        log_info "You may need to manually start: frontend, backend, mongodb"
    fi
}

# ============================================================================
# Start 100XPrompt Backend
# ============================================================================

start_100xprompt() {
    log_section "Starting 100XPrompt Backend (Port 4096)"
    
    # Check if already running
    if lsof -i :4096 -t >/dev/null 2>&1; then
        log_warning "Port 4096 already in use, skipping 100XPrompt start"
        return 0
    fi
    
    # Try different methods to start 100xprompt
    if command -v 100xprompt &> /dev/null; then
        log_info "Starting 100xprompt serve --port 4096..."
        nohup 100xprompt serve --port 4096 > "$LOG_DIR/100xprompt.log" 2>&1 &
        echo $! > "$PID_100XPROMPT"
    elif [ -f "../cli/dist/index.js" ]; then
        log_info "Starting 100xprompt from local build..."
        nohup node ../cli/dist/index.js serve --port 4096 > "$LOG_DIR/100xprompt.log" 2>&1 &
        echo $! > "$PID_100XPROMPT"
    elif [ -f "../../cli/dist/index.js" ]; then
        log_info "Starting 100xprompt from relative path..."
        nohup node ../../cli/dist/index.js serve --port 4096 > "$LOG_DIR/100xprompt.log" 2>&1 &
        echo $! > "$PID_100XPROMPT"
    else
        log_error "Cannot start 100XPrompt backend - command not found"
        log_info "Please ensure 100xprompt is installed or built"
        log_info "Logs will be written to: $LOG_DIR/100xprompt.log"
        return 1
    fi
    
    # Wait for port
    log_info "Waiting for 100XPrompt backend to start..."
    if wait_for_port 4096 "100XPrompt Backend"; then
        log_success "100XPrompt backend started on port 4096"
    else
        log_error "Failed to start 100XPrompt backend"
        return 1
    fi
}

# ============================================================================
# Start AI Assistant Server
# ============================================================================

start_server() {
    log_section "Starting AI Assistant Server (Port 3001)"
    
    # Check if already running
    if lsof -i :3001 -t >/dev/null 2>&1; then
        log_warning "Port 3001 already in use, skipping server start"
        return 0
    fi
    
    # Check if server.ts exists
    if [ ! -f "server.ts" ]; then
        log_error "server.ts not found in current directory"
        log_info "Please run this script from the 100xprompt-web package directory"
        return 1
    fi
    
    log_info "Starting server.ts with tsx..."
    nohup npx tsx server.ts > "$LOG_DIR/server.log" 2>&1 &
    echo $! > "$PID_SERVER"
    
    # Wait for port
    log_info "Waiting for AI Assistant server to start..."
    if wait_for_port 3001 "AI Assistant Server"; then
        log_success "AI Assistant server started on port 3001"
    else
        log_error "Failed to start AI Assistant server"
        return 1
    fi
}

# ============================================================================
# Verify Services
# ============================================================================

verify_services() {
    log_section "Verifying Services"
    
    local all_ok=true
    
    # Check ports
    echo ""
    check_port 3000 "Nginx (Frontend)" || all_ok=false
    check_port 3001 "AI Assistant API" || all_ok=false
    check_port 4096 "100XPrompt Backend" || all_ok=false
    echo ""
    
    # Health checks
    log_info "Running health checks..."
    
    # Check frontend health
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed (may be expected for some setups)"
    fi
    
    # Check 100XPrompt health
    if curl -s http://localhost:4096/global/health > /dev/null 2>&1; then
        log_success "100XPrompt health check passed"
    else
        log_warning "100XPrompt health check failed"
    fi
    
    # Check AI Assistant health
    if curl -s http://localhost:3001/api/ai-assistant > /dev/null 2>&1; then
        log_success "AI Assistant API health check passed"
    else
        log_warning "AI Assistant API health check failed"
    fi
    
    echo ""
    
    if [ "$all_ok" = true ]; then
        log_success "All core services are running!"
    else
        log_warning "Some services may not be running correctly"
    fi
}

# ============================================================================
# Print Status
# ============================================================================

print_status() {
    log_section "Service Status"
    
    echo ""
    echo "Port Mappings:"
    echo "  3000  → Nginx (Frontend + Reverse Proxy)"
    echo "  3001  → AI Assistant API (LiveKit, SSE heartbeat proxy)"
    echo "  4096  → 100XPrompt Backend (SSE streaming)"
    echo "  8001  → Python Backend (if using supervisor)"
    echo "  27017 → MongoDB (if using supervisor)"
    echo ""
    echo "Log Files:"
    echo "  $LOG_DIR/100xprompt.log"
    echo "  $LOG_DIR/server.log"
    echo ""
    echo "PID Files:"
    echo "  $PID_100XPROMPT"
    echo "  $PID_SERVER"
    echo ""
    echo "Useful Commands:"
    echo "  Check logs:     tail -f $LOG_DIR/*.log"
    echo "  Check ports:    lsof -i :3000 -i :3001 -i :4096"
    echo "  Stop services:  ./startup.sh --stop"
    echo "  Test SSE:       curl -s -N http://localhost:3000/global/event"
    echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
    # Handle --stop flag
    if [ "$1" = "--stop" ]; then
        cleanup
        exit 0
    fi
    
    # Handle --status flag
    if [ "$1" = "--status" ]; then
        print_status
        verify_services
        exit 0
    fi
    
    print_banner
    check_environment
    stop_existing
    start_supervisor
    start_100xprompt
    start_server
    verify_services
    print_status
    
    log_section "Startup Complete!"
    echo ""
    echo -e "${GREEN}All services are running. Press Ctrl+C to stop.${NC}"
    echo ""
    
    # Keep script running to handle signals
    if [ "$1" = "--foreground" ]; then
        log_info "Running in foreground mode..."
        log_info "Press Ctrl+C to stop all services"
        
        # Tail logs in foreground mode
        tail -f "$LOG_DIR"/*.log 2>/dev/null || wait
    fi
}

# Run main with all arguments
main "$@"
