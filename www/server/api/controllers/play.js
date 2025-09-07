const logger = require("./helpers/logger")(__filename);
const db = require('./helpers/db');
const RpcClient = require('./helpers/rpcClient');

module.exports = {
  play: play
};

function play(req, res) {

  const compositionId = req.swagger.params.body.value.compositionId;
  let sql;
  if (compositionId !== 0) {
    // select composition with given ID
    sql = 'SELECT id, name, composer_id, duration, midifile FROM composition WHERE id='
      + compositionId + ';';
  }
  else {
    // select random composition
    sql = 'SELECT id, name, composer_id, duration, midifile FROM composition ORDER BY RANDOM() LIMIT 1;'
  }

  db.get(sql, [], (err, row) => {
    if (err) {
      res.status(500).json({ 'message': err.toString() });
    }
    else {
      if (row === undefined) {
        res.status(404).json({ 'message': 'No composition found with ID ' + compositionId });
      }
      else {
        const id = row['id'];
        const composer_id = row['composer_id'];
        const compositionName = row['name'];
        const duration = row['duration'];
        const midifile = row['midifile'];
        db.get('SELECT firstname, surname FROM composer WHERE id=?;',
          [composer_id], (err, row) => {
            if (err) {
              res.status(500).json({ 'message': err.toString() });
            }
            else {
              // send websocket rpc to play composition
              const composer = row['firstname'] + ' ' + row['surname']
              logger.debug(`Sending RPC request to play ${compositionName}...`);
              RpcClient.call('PlayComposition', {
                name: compositionName,
                composer: composer,
                duration: duration,
                mididata: Array.from(midifile)
              })
                .then(() => {
                  logger.debug(`RPC call finished successful.`);
                  res.json({
                    id: id,
                    name: compositionName,
                    duration: duration,
                    composer_id: composer_id
                  });
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ 'message': err.toString() });
                });
            }
          });
      }
    }
  });
}
