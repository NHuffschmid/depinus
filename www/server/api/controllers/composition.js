const logger = require("./helpers/logger")(__filename);
const db = require('./helpers/db');
const RpcClient = require('./helpers/rpcClient');

module.exports = {
  getComposition: getComposition,
  getCompositionsOfComposer: getCompositionsOfComposer,
  deleteComposition: deleteComposition,
  patchComposition: patchComposition,
  postComposition: postComposition
};

function calculateMidifileDuration(data) {
  const promise = new Promise((resolve, reject) => {
    logger.debug(`Sending RPC request to calculate duration of midifile...`);
    RpcClient.call('CalculatePlayDuration', { mididata: Array.from(data) })
      .then((duration) => {
        logger.debug(`Calculated midifile duration: ${duration} sec`);
        resolve(duration);
      })
      .catch((err) => {
        reject(err);
      });
  });
  return promise;
}

function updateMidifile(db, compositionId, midifile) {
  const promise = new Promise((resolve, reject) => {
    calculateMidifileDuration(midifile.buffer)
      .then((duration) => {
        logger.debug("Updating midifile in DB...");
        db.run(`UPDATE composition SET midifile=(?), duration=(?) WHERE id=${compositionId};`,
          [midifile.buffer, duration], (err) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
      })
      .catch((err) => {
        reject(err);
      });
  })
  return promise;
}

function getComposition(req, res) {

  db.get('SELECT id, name, composer_id, duration FROM composition WHERE id=?;',
    [req.swagger.params.id.value], (err, row) => {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
      }
      else {
        if (row) {
          res.json(row);
        }
        else {
          res.status(404).json({ 'message': 'No composition found for this ID' });
        }
      }
    });
}

function getCompositionsOfComposer(req, res) {

  let composerIdClause = req.swagger.params.composerId.value ?
    'composer_id=' + req.swagger.params.composerId.value : 'composer_id>0';

  db.all('SELECT id, name, composer_id, duration FROM composition WHERE '
    + composerIdClause + ' ORDER BY name;',
    [], (err, rows) => {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
      }
      else {
        const compositions = [];
        rows.forEach((row) => {
          compositions.push(row);
        });
        res.json(compositions);
      }
    });
}

function deleteComposition(req, res) {

  db.run('DELETE FROM composition WHERE id=(?);',
    [req.swagger.params.id.value], (err) => {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
      }
      else {
        res.status(204).send();
      }
    });
}

function patchComposition(req, res) {

  const compositionId = req.swagger.params.id.value;
  const hasName = req.swagger.params.name && req.swagger.params.name.value;
  const hasMidifile = req.swagger.params.midifile && req.swagger.params.midifile.value;

  if (hasName && hasMidifile) {
    // update both name and midifile
    const compositionName = req.swagger.params.name.value.replace(/[\u200B]/g, '');
    calculateMidifileDuration(req.swagger.params.midifile.value.buffer)
      .then((duration) => {
        db.run(`UPDATE composition SET name=(?), midifile=(?), duration=(?) WHERE id=(?);`,
          [compositionName, req.swagger.params.midifile.value.buffer, duration, compositionId], (err) => {
            if (err) {
              logger.error("Cannot update composition in DB: " + err.toString());
              res.status(500).json({ 'message': err.toString() });
            } else {
              logger.debug("Patch command successful (name + midifile). Sending 204...");
              res.status(204).send();
            }
          });
      })
      .catch((error) => {
        logger.error("Cannot calculate midifile duration: " + error.toString());
        res.status(500).json({ 'message': error.toString() });
      });
  }
  else {
    // update only name
    const compositionName = req.swagger.params.name.value.replace(/[\u200B]/g, '');
    db.run(`UPDATE composition SET name=(?) WHERE id=(?);`,
      [compositionName, compositionId], (err) => {
        if (err) {
          logger.error("Cannot update composition name in DB: " + err.toString());
          res.status(500).json({ 'message': err.toString() });
        } else {
          logger.debug("Patch command successful (name only). Sending 204...");
          res.status(204).send();
        }
      });
  }
}

function postComposition(req, res) {

  // insert composition to DB
  calculateMidifileDuration(req.swagger.params.midifile.value.buffer)
    .then((duration) => {
      // TODO: clarify where zero width spaces are coming from
      const compositionName = req.swagger.params.name.value.replace(/[\u200B]/g, '');
      db.run('INSERT INTO composition(name, composer_id, duration, midifile) VALUES (?, ?, ?, ?)',
        [
          compositionName,
          req.swagger.params.composerId.value,
          duration,
          req.swagger.params.midifile.value.buffer], function (err, lastID) {
            if (err) {
              res.status(500).json({ 'message': err.toString() });
            }
            res.status(200).json({
              'id': lastID,
              'name': req.swagger.params.name.value,
              'duration': duration,
              'composer_id': req.swagger.params.composerId.value
            });
          });
    })
    .catch((err) => {
      res.status(500).json({ 'message': err.toString() });
    });
}
