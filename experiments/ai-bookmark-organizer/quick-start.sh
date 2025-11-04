#!/bin/bash

# AI Bookmark Organizer - Quick Start Script
# This script helps set up and run the AI Bookmark Organizer

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║   AI Bookmark Organizer - Quick Start         ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print colored messages
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version must be 18 or higher. Current: $(node -v)"
        exit 1
    fi
    success "Node.js $(node -v) found"

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL is not installed. Please install PostgreSQL 14+ from https://www.postgresql.org/"
        exit 1
    fi
    success "PostgreSQL found"

    # Check pg_isready
    if ! pg_isready &> /dev/null; then
        warning "PostgreSQL might not be running. Try: sudo systemctl start postgresql"
    else
        success "PostgreSQL is running"
    fi
}

# Setup backend
setup_backend() {
    info "Setting up backend..."

    cd backend

    # Check if .env exists
    if [ ! -f .env ]; then
        warning ".env file not found. Copying from .env.example..."
        cp .env.example .env
        warning "Please edit backend/.env with your database credentials and API key!"
        warning "Press Enter to continue after editing .env..."
        read
    fi

    # Install dependencies
    if [ ! -d node_modules ]; then
        info "Installing backend dependencies..."
        npm install
        success "Backend dependencies installed"
    else
        success "Backend dependencies already installed"
    fi

    cd ..
}

# Setup database
setup_database() {
    info "Setting up database..."

    # Source .env for database connection
    if [ -f backend/.env ]; then
        export $(cat backend/.env | grep DATABASE_URL | xargs)
    fi

    # Check if database exists
    if psql "$DATABASE_URL" -c "\q" 2>/dev/null; then
        warning "Database already exists. Skip initialization? (y/n)"
        read -r response
        if [ "$response" = "y" ]; then
            success "Skipping database initialization"
            return
        fi
    fi

    info "Initializing database schema..."
    if psql "$DATABASE_URL" -f database/schema.sql; then
        success "Database initialized successfully"
    else
        error "Failed to initialize database. Check DATABASE_URL in backend/.env"
        exit 1
    fi
}

# Start backend server
start_backend() {
    info "Starting backend server..."

    cd backend

    if [ -f .pid ]; then
        OLD_PID=$(cat .pid)
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            warning "Backend server already running (PID: $OLD_PID)"
            return
        fi
    fi

    # Start in background
    nohup npm start > ../backend.log 2>&1 &
    echo $! > .pid

    # Wait a bit for server to start
    sleep 3

    # Check if server is running
    if curl -s http://localhost:3000/health > /dev/null; then
        success "Backend server started successfully!"
        success "Server logs: tail -f backend.log"
    else
        error "Backend server failed to start. Check backend.log for details."
        exit 1
    fi

    cd ..
}

# Show extension instructions
show_extension_instructions() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Chrome Extension Setup                      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "To load the Chrome extension:"
    echo ""
    echo "1. Open Chrome and go to: chrome://extensions/"
    echo "2. Enable 'Developer mode' (toggle in top-right)"
    echo "3. Click 'Load unpacked'"
    echo "4. Navigate to: $SCRIPT_DIR/extension"
    echo "5. Click 'Select Folder'"
    echo ""
    echo "Then configure the extension:"
    echo "1. Click the extension icon"
    echo "2. Click the settings gear (⚙️)"
    echo "3. Enter your OpenRouter API key"
    echo "4. Set Backend URL to: http://localhost:3000"
    echo "5. Save settings"
    echo ""
    info "Get OpenRouter API key: https://openrouter.ai/keys"
    echo ""
}

# Show status
show_status() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   Setup Complete! 🎉                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Services:"
    echo "  ✓ Backend API: http://localhost:3000"
    echo "  ✓ Health Check: http://localhost:3000/health"
    echo ""
    echo "Useful commands:"
    echo "  - View logs: tail -f backend.log"
    echo "  - Stop server: ./quick-start.sh stop"
    echo "  - Restart server: ./quick-start.sh restart"
    echo ""
    echo "Documentation:"
    echo "  - Setup Guide: SETUP_GUIDE.md"
    echo "  - README: README.md"
    echo ""
}

# Stop backend server
stop_backend() {
    info "Stopping backend server..."

    if [ -f backend/.pid ]; then
        PID=$(cat backend/.pid)
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            rm backend/.pid
            success "Backend server stopped"
        else
            warning "Backend server not running"
            rm backend/.pid
        fi
    else
        warning "No PID file found. Server might not be running."
    fi
}

# Main menu
case "${1:-start}" in
    start)
        check_prerequisites
        setup_backend
        setup_database
        start_backend
        show_extension_instructions
        show_status
        ;;
    stop)
        stop_backend
        ;;
    restart)
        stop_backend
        sleep 2
        start_backend
        success "Backend server restarted"
        ;;
    status)
        if [ -f backend/.pid ]; then
            PID=$(cat backend/.pid)
            if ps -p "$PID" > /dev/null 2>&1; then
                success "Backend server is running (PID: $PID)"
                info "Health check:"
                curl -s http://localhost:3000/health | jq . || echo "Server responding"
            else
                warning "Backend server is not running (stale PID file)"
            fi
        else
            warning "Backend server is not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Set up and start the backend server"
        echo "  stop    - Stop the backend server"
        echo "  restart - Restart the backend server"
        echo "  status  - Check backend server status"
        exit 1
        ;;
esac
