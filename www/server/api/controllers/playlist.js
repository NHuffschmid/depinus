const logger = require("./helpers/logger")(__filename);
const db = require('./helpers/db');

module.exports = {
    getPlaylists,
    postPlaylist,
    getPlaylist,
    deletePlaylist,
    patchPlaylist,
    getPlaylistCompositions,
    addCompositionToPlaylist,
    updatePlaylistOrder,
    removeCompositionFromPlaylist
};

function getPlaylists(req, res) {
    db.all('SELECT id, name FROM playlist ORDER BY name;', [], (err, rows) => {
        if (err) {
            res.status(500).json({ 'message': err.toString() });
            logger.error(err.message);
        } else {
            res.json(rows);
        }
    });
}

function postPlaylist(req, res) {
    const name = req.swagger.params.name.value;
    db.run('INSERT INTO playlist (name) VALUES (?);', [name], function (err, lastID) {
        if (err) {
            res.status(500).json({ 'message': err.toString() });
            logger.error(err.message);
        } else {
            res.status(200).json({ id: lastID, name: name });
        }
    });
}

function getPlaylist(req, res) {
    const id = req.swagger.params.id.value;
    db.get('SELECT id, name FROM playlist WHERE id = ?;', [id], (err, row) => {
        if (err) {
            res.status(500).json({ 'message': err.toString() });
            logger.error(err.message);
        } else if (!row) {
            res.status(404).json({ 'message': 'Playlist not found' });
        } else {
            res.json(row);
        }
    });
}

function deletePlaylist(req, res) {
    const id = req.swagger.params.id.value;
    db.run('DELETE FROM playlist WHERE id = ?;', [id], (err) => {
        if (err) {
            res.status(500).json({ 'message': err.toString() });
            logger.error(err.message);
        } else {
            res.status(204).send();
        }
    });
}

function patchPlaylist(req, res) {
    const id = req.swagger.params.id.value;
    const name = req.swagger.params.name.value;
    db.run('UPDATE playlist SET name = ? WHERE id = ?;', [name.trim(), id], function (err) {
        if (err) {
            res.status(500).json({ message: err.toString() });
            logger.error(err.message);
        } else {
            res.status(200).json({ id, name: name.trim() });
        }
    });
}

function getPlaylistCompositions(req, res) {
    const id = req.swagger.params.id.value;
    db.get('SELECT id FROM playlist WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ 'message': err.toString() });
            logger.error(err.message);
        } else if (!row) {
            res.status(404).json({ 'message': 'Playlist not found' });
        } else {
            db.all(`SELECT c.id, c.name, c.duration, c.composer_id
                      FROM playlist_composition pc
                      JOIN composition c ON pc.composition_id = c.id
                      WHERE pc.playlist_id = ?
                      ORDER BY pc.position;`, [id], (err2, rows) => {
                if (err2) {
                    res.status(500).json({ 'message': err2.toString() });
                    logger.error(err2.message);
                } else {
                    res.json(rows);
                }
            });
        }
    });
}

function addCompositionToPlaylist(req, res) {
    const playlistId = req.swagger.params.id.value;
    const { compositionId, position = 0 } = req.body;
    db.run('INSERT INTO playlist_composition (playlist_id, composition_id, position) VALUES (?, ?, ?);',
        [playlistId, compositionId, position], (err) => {
            if (err) {
                res.status(500).json({ 'message': err.toString() });
                logger.error(err.message);
            } else {
                res.status(204).send();
            }
        });
}

function updatePlaylistOrder(req, res) {
    const playlistId = req.swagger.params.id.value;
    const order = req.body;
    const updateTasks = order.map(item => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE playlist_composition SET position = ? WHERE playlist_id = ? AND composition_id = ?;',
                [item.position, playlistId, item.compositionId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });
    });
    Promise.all(updateTasks)
        .then(() => res.status(204).send())
        .catch(err => {
            res.status(500).json({ 'message': err.toString() });
            logger.error(err.message);
        });
}

function removeCompositionFromPlaylist(req, res) {
    const playlistId = req.swagger.params.id.value;
    const compositionId = req.swagger.params.compositionId.value;
    db.run('DELETE FROM playlist_composition WHERE playlist_id = ? AND composition_id = ?;',
        [playlistId, compositionId], function (err) {
            if (err) {
                res.status(500).json({ 'message': err.toString() });
                logger.error(err.message);
            } else {
                res.status(204).send();
            }
        });
}
