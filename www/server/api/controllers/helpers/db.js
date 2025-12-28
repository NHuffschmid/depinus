/* Helper functions for database access */

const sqlite3 = require('sqlite3').verbose();
const logger = require("./logger")(__filename);
const path = require('path');

const SQLITE_DB = path.join(process.env.DEPINUS_HOME, 'depinus.db');

const get = (sql, params, cb) => {
    // gets as single DB object (or undefined if not found)
    logger.debug('SQL: ' + sql);
    const db = new sqlite3.Database(SQLITE_DB, (err) => {
        if (err) {
            logger.error(err.message);
            cb(err, null);
            return;
        }
        // Enable foreign key constraints
        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) {
                logger.error(pragmaErr.message);
                db.close();
                cb(pragmaErr, null);
                return;
            }
            db.get(sql, params, (err, row) => {
                db.close();
                if (err) {
                    logger.error(err.message);
                    cb(err, null);
                }
                else {
                    cb(null, row);
                }
            });
        });
    });
}

const all = (sql, params, cb) => {
    // gets an array of DB objects
    logger.debug('SQL: ' + sql);
    const db = new sqlite3.Database(SQLITE_DB, (err) => {
        if (err) {
            logger.error(err.message);
            cb(err, null);
            return;
        }
        // Enable foreign key constraints
        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) {
                logger.error(pragmaErr.message);
                db.close();
                cb(pragmaErr, null);
                return;
            }
            db.all(sql, params, (err, rows) => {
                db.close();
                if (err) {
                    logger.error(err.message);
                    cb(err, null);
                }
                else {
                    cb(null, rows);
                }
            });
        });
    });
}

const run = (sql, params, cb) => {
    // performs a modifying DB operation
    logger.info('SQL: ' + sql);
    const db = new sqlite3.Database(SQLITE_DB, (err) => {
        if (err) {
            logger.error(err.message);
            cb(err, null, null);
            return;
        }
        db.configure('busyTimeout', 5000); // needed for long-running imports
        // Enable foreign key constraints
        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) {
                logger.error(pragmaErr.message);
                db.close();
                cb(pragmaErr, null, null);
                return;
            }
            db.run(sql, params, function(err) {
                db.close();
                if (err) {
                    logger.error(err.message);
                    cb(err, null, null);
                }
                else {
                    logger.debug('Number of changes: ' + this.changes);
                    cb(null, this.lastID, this.changes);
                }
            });
        });
    });
}

module.exports = {
    get: get,
    all: all,
    run: run
};
