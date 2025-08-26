const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

let userDataPath;
if (process.platform === 'win32') {
    userDataPath = path.join(process.env.APPDATA, 'Depinus'); // Windows: APPDATA
} else if (process.platform === 'darwin') {
    userDataPath = path.join(process.env.HOME, 'Library', 'Application Support', 'Depinus'); // macOS
} else {
    userDataPath = path.join(process.env.HOME, '.config', 'Depinus'); // Linux
}

// Get the path where logs will be stored
const logDir = userDataPath + '/logs';
const logFileName = 'Depinus-%DATE%.log'; // Use date substitution

// Configure winston logger
const logger = createLogger({
    level: 'info', // Default log level
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new transports.Console({ level: 'debug' }), // Console logs for debugging
        new transports.DailyRotateFile({
            filename: path.join(logDir, logFileName),
            datePattern: 'YYYY-MM-DD', // Daily rotation
            maxSize: '20m', // Maximum size per log file (e.g., 20 megabytes)
            maxFiles: '14d', // Keep logs for 14 days
            zippedArchive: true // Compress old log files
        })
    ]
});

module.exports = logger;
