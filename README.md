# DEPINUS

**DE**tachable **PI**a**N**o **U**n**S**ilencer

*(C) Norbert Huffschmid - 2025*

DEPINUS is a software for playing piano music on MIDI devices (e-pianos, keyboards, computers, etc.). It is ideal for self-learning, practice, or accompaniment. The program features a large, expandable archive of piano music. You can add your own MIDI files to build a personal music collection. Archives are easy to edit, export, and import, making music sharing between users simple and convenient.

## Installation

Download the software package for your computer (Windows, Linux, Raspberry Pi) and unzip it to a folder of your choice. Connect your computer to your MIDI device, e.g., using a USB MIDI cable converter. (You can purchase this adapter for around $20 at any electronics store)

## Program Start

### Graphical user interface

If you are running DEPINUS on a device with a graphical display, simply run the depinus file located in the extracted root folder.

Once the startup procedure is complete, the DEPINUS GUI (Graphical User Interface) will be displayed. From this point on, you can control DEPINUS from any device with a browser on your local network (Remote Control). The URL will be shown on the ABOUT screen, along with a corresponding QR code.

### Headless mode

If you are running DEPINUS on hardware without a graphical display, you can start the executable in headless mode:

>depinus --headless

To automatically start DEPINUS in headless mode every time your hardware platform boots, use the autostart script located in the resources folder:

> autostart enable

To disable the autostart feature, enter:

> autostart disable

Both commands require administrator privileges.

## Configuration

DEPINUS uses the following default network configuration values:

- piano_daemon_websocket_port = 1770
- backend_rest_api_port = 5000
- frontend_server_port (remote control) = 8080
- usb_reset_daemon_port = 1732


If these ports are already in use in your environment, you can modify the depinus.conf file in the resources folder before starting the program.

If you wish to run the frontend server on port 80, the procedure depends on your operating system:

- On Windows, you can simply change the port in depinus.conf from 8080 to 80, as there are no restrictions regarding privileged ports.

- On Linux, things may be more complex, as non-root users are not permitted to use privileged ports. Solutions such as authbind or port forwarding can help resolve this issue.

## Known issues

### Recording on Linux

On Linux systems using ALSA with USB MIDI devices, MIDI recording may experience strange timing issues. This is probably caused by a kernel-level state corruption in ALSA's bidirectional MIDI port handling, where the playback operation leaves the MIDI device in an inconsistent state.

**Symptoms:**
- MIDI events arrive with significant delays (100-400ms)
- Recording timing is accurate again after plugging off/in the MIDI USB device
- Problem reoccurs after playing MIDI files

**Workaround:**

DEPINUS includes an optional USB MIDI Reset Daemon that automatically resets the USB MIDI device before each recording session. To enable this feature:

1. Navigate to the resources folder in your DEPINUS installation
2. Run the following command with administrator privileges:

   ```
   sudo ./midi_usb_reset enable
   ```

The daemon will now start automatically on each system boot and reset the USB MIDI device before each recording, ensuring accurate timing.

To disable the daemon:

```
sudo ./midi_usb_reset disable
```

**Note:** This feature is only available on Linux. Windows users are not affected by this issue.

## Contact

This project is in an early stage of development. Feel free to contact the author via
the [project page](https://github.com/NHuffschmid/depinus) or by [email](mailto:depinus@gmx.de) regarding:
- bug reports
- feature proposals
- general questions

## Additional Info

[DEPINUS license](DEPINUS_LICENSE.md)

[How to Build DEPINUS](HowToBuild.md)
