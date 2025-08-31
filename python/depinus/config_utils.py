# Configuration utilities

import os
import configparser

CONFIG_FILENAME = 'depinus.conf'


def get_config_file_path():
    """Returns the absolute path to depinus.conf."""
    return os.environ.get('DEPINUS_HOME', os.getcwd()) + '/' + CONFIG_FILENAME


def read_config():
    """Reads and returns the configparser.ConfigParser object for depinus.conf."""
    config_file = get_config_file_path()
    config = configparser.ConfigParser()
    config.read(config_file)
    return config


def write_config(config):
    """Writes the given configparser.ConfigParser object to depinus.conf."""
    config_file = get_config_file_path()
    with open(config_file, 'w') as f:
        config.write(f)


def persist_config_setting(section, key, value):
    """Sets a value in depinus.conf and writes it to disk."""
    config = read_config()
    if section not in config:
        config[section] = {}
    config[section][key] = value
    write_config(config)
