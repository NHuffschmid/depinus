#!/bin/bash
# USB MIDI Reset Daemon - Bash implementation
# Runs with root privileges and listens for USB reset triggers

PORT=${1:-1732}

echo "[INFO] USB MIDI Reset Daemon starting on port $PORT..."

# Function to find USB MIDI device
find_usb_midi_device() {
    for dev in /sys/bus/usb/devices/*/product; do
        if grep -qi "midi" "$dev" 2>/dev/null; then
            DEVICE_DIR=$(dirname "$dev")
            AUTHORIZED_FILE="$DEVICE_DIR/authorized"
            
            if [ -f "$AUTHORIZED_FILE" ]; then
                DEVICE_NAME=$(cat "$dev" 2>/dev/null)
                DEVICE_ID=$(basename "$DEVICE_DIR")
                echo "[INFO] Found USB MIDI device: $DEVICE_NAME at $DEVICE_DIR" >&2
                echo "$AUTHORIZED_FILE"
                return 0
            fi
        fi
    done
    
    echo "[ERROR] No USB MIDI device found" >&2
    return 1
}

# Function to reset USB device
reset_usb_device() {
    # Re-search for the device on each reset to handle device changes
    local authorized_file=$(find_usb_midi_device)
    
    if [ -z "$authorized_file" ]; then
        echo "[ERROR] No USB MIDI device found for reset" >&2
        return 1
    fi
    
    echo "[INFO] Deauthorizing USB MIDI device..."
    echo "0" > "$authorized_file" 2>/dev/null || {
        echo "[ERROR] Failed to deauthorize device" >&2
        return 1
    }
    
    sleep 0.5
    
    echo "[INFO] Reauthorizing USB MIDI device..."
    echo "1" > "$authorized_file" 2>/dev/null || {
        echo "[ERROR] Failed to reauthorize device" >&2
        return 1
    }
    
    echo "[INFO] USB MIDI device reset completed successfully."
    return 0
}

# Verify USB MIDI device is available at startup
if ! find_usb_midi_device > /dev/null; then
    echo "[ERROR] No USB MIDI device found. Daemon cannot operate." >&2
    exit 1
fi

# Check if netcat is available and determine which variant
if ! command -v nc &> /dev/null; then
    echo "[ERROR] netcat (nc) not found." >&2
    echo "[ERROR] Please install one of:" >&2
    echo "[ERROR]   apt-get install netcat-openbsd   (Debian/Ubuntu)" >&2
    echo "[ERROR]   apt-get install netcat-traditional" >&2
    echo "[ERROR]   yum install nmap-ncat            (RedHat/CentOS)" >&2
    exit 1
fi

# Detect netcat variant and set appropriate command
NC_HELP=$(nc -h 2>&1)
if echo "$NC_HELP" | grep -q "\-l -p port"; then
    # netcat-traditional: requires -p flag for port
    NC_LISTEN="nc -l -p $PORT"
    NC_VARIANT="netcat-traditional"
elif echo "$NC_HELP" | grep -q "nmap.org/ncat"; then
    # ncat (nmap): supports host specification
    NC_LISTEN="nc -l 127.0.0.1 $PORT"
    NC_VARIANT="ncat"
else
    # netcat-openbsd (default): modern syntax
    NC_LISTEN="nc -l 127.0.0.1 $PORT"
    NC_VARIANT="netcat-openbsd"
fi

echo "[INFO] Detected $NC_VARIANT"
echo "[INFO] Daemon listening on 127.0.0.1:$PORT"

# Handle termination signals gracefully
cleanup() {
    echo "[INFO] USB MIDI Reset Daemon stopped."
    exit 0
}
trap cleanup SIGTERM SIGINT

# Main loop - listen for connections
while true; do
    # Listen for one connection, process it, then loop again
    # timeout ensures nc exits after client disconnects (max 2 seconds wait)
    COMMAND=$(timeout 2 $NC_LISTEN 2>/dev/null | tr -d '\0\r\n' | head -c 10)
    
    if [ "$COMMAND" = "RESET" ]; then
        echo "[INFO] Reset trigger received from piano_daemon"
        
        reset_usb_device
    elif [ -n "$COMMAND" ]; then
        echo "[WARNING] Unknown command received: $COMMAND"
    fi
done
