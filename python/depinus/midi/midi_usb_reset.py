#!/usr/bin/env python3
"""
MIDI USB Adapter Reset Tool
Resets a USB MIDI device by simulating unplug/replug behavior.
"""

import sys
import os
import subprocess
import fcntl

# USB reset ioctl constant
USBDEVFS_RESET = ord('U') << 8 | 20


def find_midi_usb_device():
    """Find the USB device path for MIDI interfaces."""
    try:
        # Search for MIDI devices in /dev/snd/
        result = subprocess.run(
            ["lsusb"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        
        # Look for common MIDI device keywords
        for line in result.stdout.split('\n'):
            if 'MIDI' in line.upper() or 'Audio' in line:
                parts = line.split()
                if len(parts) >= 4:
                    bus = parts[1]
                    device = parts[3].rstrip(':')
                    device_path = f"/dev/bus/usb/{bus}/{device}"
                    if os.path.exists(device_path):
                        return device_path, line.strip()
        
        return None, None
    except Exception as e:
        print(f"Error finding MIDI device: {e}", file=sys.stderr)
        return None, None


def reset_usb_device(device_path):
    """Reset USB device using ioctl."""
    try:
        with open(device_path, 'wb') as f:
            fcntl.ioctl(f, USBDEVFS_RESET, 0)
        return True
    except PermissionError:
        print(f"Permission denied. Please run with sudo.", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error resetting device: {e}", file=sys.stderr)
        return False


def main():

    # Find MIDI device
    device_path, device_info = find_midi_usb_device()
    
    if not device_path:
        print("No MIDI USB device found.")
        print("Please ensure the device is connected.")
        sys.exit(1)
    
    print(f"Found device: {device_info}")
    print(f"Device path: {device_path}")
    print("\nResetting USB device...")
    
    # Reset the device
    if reset_usb_device(device_path):
        print("Device successfully reset.")
        sys.exit(0)
    else:
        print("Failed to reset device.")
        sys.exit(1)


if __name__ == "__main__":
    main()
