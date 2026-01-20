#!/bin/bash
# USB MIDI Reset Daemon - Bash implementation
# Runs with root privileges and listens for USB reset triggers

PORT=${1:-1732}

echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] USB MIDI Reset Daemon starting on port $PORT..."

# Function to find USB MIDI device
find_usb_midi_device() {
    for dev in /sys/bus/usb/devices/*/product; do
        if grep -qi "midi" "$dev" 2>/dev/null; then
            DEVICE_DIR=$(dirname "$dev")
            AUTHORIZED_FILE="$DEVICE_DIR/authorized"
            
            if [ -f "$AUTHORIZED_FILE" ]; then
                DEVICE_NAME=$(cat "$dev" 2>/dev/null)
                DEVICE_ID=$(basename "$DEVICE_DIR")
                echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Found USB MIDI device: $DEVICE_NAME at $DEVICE_DIR" >&2
                echo "$AUTHORIZED_FILE"
                return 0
            fi
        fi
    done
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] No USB MIDI device found" >&2
    return 1
}

# Function to reset USB device
reset_usb_device() {
    # Re-search for the device on each reset to handle device changes
    local authorized_file=$(find_usb_midi_device)
    
    if [ -z "$authorized_file" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] No USB MIDI device found for reset" >&2
        return 1
    fi
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Deauthorizing USB MIDI device..."
    echo "0" > "$authorized_file" 2>/dev/null || {
        echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] Failed to deauthorize device" >&2
        return 1
    }
    
    sleep 0.5
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Reauthorizing USB MIDI device..."
    echo "1" > "$authorized_file" 2>/dev/null || {
        echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] Failed to reauthorize device" >&2
        return 1
    }
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] USB MIDI device reset completed successfully."
    return 0
}

# Verify USB MIDI device is available at startup
if ! find_usb_midi_device > /dev/null; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] No USB MIDI device found. Daemon cannot operate." >&2
    exit 1
fi

# Check if netcat is available
if ! command -v nc &> /dev/null; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] netcat (nc) not found. Please install: apt-get install netcat-openbsd" >&2
    exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Daemon listening on 127.0.0.1:$PORT"

# Handle termination signals gracefully
cleanup() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] USB MIDI Reset Daemon stopped."
    exit 0
}
trap cleanup SIGTERM SIGINT

# Main loop - listen for connections
while true; do
    # Listen for one connection, process it, then loop again
    # timeout ensures nc exits after client disconnects (max 1 second wait)
    COMMAND=$(timeout 1 nc -l 127.0.0.1 $PORT 2>/dev/null | tr -d '\0\r\n' | cut -c1-10)
    
    if [ "$COMMAND" = "RESET" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Reset trigger received from piano_daemon"
        
        reset_usb_device
    elif [ -n "$COMMAND" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] Unknown command received: $COMMAND"
    fi
done
