const logger = require("./helpers/logger")(__filename);
const db = require('./helpers/db');
const RpcClient = require('./helpers/rpcClient');

module.exports = {
  getComposition: getComposition,
  getCompositionsOfComposer: getCompositionsOfComposer,
  deleteComposition: deleteComposition,
  patchComposition: patchComposition,
  postComposition: postComposition,
  exportCompositionMidi: exportCompositionMidi
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
  const hasComposerId = req.swagger.params.composerId && req.swagger.params.composerId.value;

  // Build update fields and values dynamically
  const updateFields = [];
  const updateValues = [];

  if (hasName) {
    const compositionName = req.swagger.params.name.value.replace(/[\u200B]/g, '');
    updateFields.push('name=(?)');
    updateValues.push(compositionName);
  }

  if (hasComposerId) {
    updateFields.push('composer_id=(?)');
    updateValues.push(req.swagger.params.composerId.value);
  }

  // Helper function to execute the UPDATE
  const executeUpdate = () => {
    if (updateFields.length > 0) {
      updateValues.push(compositionId);
      const sql = `UPDATE composition SET ${updateFields.join(', ')} WHERE id=(?);`;
      db.run(sql, updateValues, (err) => {
        if (err) {
          logger.error("Cannot update composition in DB: " + err.toString());
          res.status(500).json({ 'message': err.toString() });
        } else {
          logger.debug("Patch command successful. Sending 204...");
          res.status(204).send();
        }
      });
    } else {
      logger.debug("No fields to update. Sending 204...");
      res.status(204).send();
    }
  };

  if (hasMidifile) {
    // If midifile is included, calculate duration first
    calculateMidifileDuration(req.swagger.params.midifile.value.buffer)
      .then((duration) => {
        updateFields.push('midifile=(?)');
        updateValues.push(req.swagger.params.midifile.value.buffer);
        updateFields.push('duration=(?)');
        updateValues.push(duration);
        executeUpdate();
      })
      .catch((error) => {
        logger.error("Cannot calculate midifile duration: " + error.toString());
        res.status(500).json({ 'message': error.toString() });
      });
  } else {
    // No midifile, execute update immediately
    executeUpdate();
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

function exportCompositionMidi(req, res) {
  const compositionId = req.swagger.params.id.value;
  
  db.get(`SELECT composition.name, composition.midifile, composer.surname 
          FROM composition 
          LEFT JOIN composer ON composition.composer_id = composer.id 
          WHERE composition.id=?;`,
    [compositionId], (err, row) => {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
      }
      else {
        if (row && row.midifile) {
          // Create a safe filename from composer surname and composition name
          const composerPart = row.surname ? row.surname.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' : '';
          const compositionPart = row.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const safeFilename = composerPart + compositionPart + '.mid';
          
          res.setHeader('Content-Type', 'audio/midi');
          res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
          res.send(row.midifile);
        }
        else {
          res.status(404).json({ 'message': 'No composition or MIDI file found for this ID' });
        }
      }
    });
}
