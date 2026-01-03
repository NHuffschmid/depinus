import logging
import os
import pathlib
import platform

from logging.handlers import TimedRotatingFileHandler


def setup_logger():
    logger = logging.getLogger(__name__)  # Logger für das Modul
    logger.setLevel(logging.DEBUG)

    system = platform.system()

    if system == "Windows":
        log_file = str((pathlib.Path(os.environ['APPDATA']) / 'Depinus/logs/PianoDaemon.log').resolve())
    elif system == "Darwin": # MacOS
        # untested!!!
        log_file = str((pathlib.Path(os.environ['HOME']) / 'Library/Application Support/Depinus/logs/PianoDaemon.log').resolve())
    else: # Linux
        log_dir = pathlib.Path.home() / ".config/Depinus/logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "PianoDaemon.log"

    file_handler = TimedRotatingFileHandler(
        filename=log_file,
        when="midnight",
        interval=1, # each day
        backupCount=7, # days
        encoding="utf-8"
    )
    file_handler.suffix = "%Y-%m-%d"
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] (%(filename)s:%(lineno)d): %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger

logger = setup_logger()
