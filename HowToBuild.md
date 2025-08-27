# How to build Depinus

Depinus comes with some precompiled packages. To use of these packages, you simply have to extract the package to some directory of your choice and start the Depinus program in the main folder.

If you want to run Depinus on hardware, where no precompiled package is available for, you have to create a package yourself. This document describes the steps to do this.

**Attention: This is software developer stuff. Musicians, please stop reading here!**

## Hardware requirements
- Desktop PC, Notebook, Thin Client, Raspberry Pi, Single Board Computer or whatever with:
  - at least 16GB disk storage
  - at least 1 GB RAM
  - at least 1 GB SWAP space on Linux devices
    (check with "free -h", increase in /etc/dphys-swapfile)
  - network connection
  - USB connector

- USB midi adapter

## Software requirements
- Windows, Linux or MacOS operating system
- Python 3.11 or higher
- Node.js V18 or higher

## Installation steps

### Get the source code
- checkout the Depinus git repository in a directory of your choice
- checkout the react-piano-keyboard submodule (git submodule init, git submodule update)

### Python
Open a cmd shell in the depinus root folder and create a virtual Python environment:
> python3 -m venv venv

Activate it:
> venv\Scripts\activate (Windows)

> source venv/bin/activate (Linux)

Then install the following packages with pip (or some other package manager):
- libasound2-dev
- libjack-dev
- sqlite3
- python-rtmidi
- mido
- websockets (V11.0.3, V15.0 does not work!)
- pyinstaller

### Build package
- edit the scripts section of the package.json file in the root folder
- add a new package script according to your needs
- open a terminal in the root folder
- enter npm run build
- enter npm run <your_package_script>

That's it!
After the packaging is done you can find the Depinus executable and all required stuff in the dist folder.

In case you want to compress the created package with the command
> npm run release

In case the compression fails due to memory shortage or whatever, you
have to do this step manually.
