const db = require('./helpers/db');
const path = require('path');

module.exports = {
  composerImage: composerImage
};

function composerImage(req, res) {

  const UNKNOWN_COMPOSER_IMAGE = path.join(__dirname, '../images', 'unknown_composer.png');

  if (req.swagger.params.composerId.value !== undefined) {
    // select composer by ID
    db.get('SELECT imagefile FROM composer WHERE id=' + req.swagger.params.composerId.value + ';',
      [], (err, row) => {
        if (err) {
          res.status(500).json({ 'message': err.toString() });
        }
        else if (row === undefined) {
          res.status(404).json({
            'message': 'No composer found with ID ' + req.swagger.params.composerId.value
          });
        }
        else {
          if (row['imagefile'] === null) {
            // no image available in database
            res.status(200).sendFile(UNKNOWN_COMPOSER_IMAGE);
          }
          else {
            res.set('Content-Type', 'image/*');
            res.status(200).send(row['imagefile']);
          }
        }
      });
  }
  else if (req.swagger.params.composerName.value !== undefined) {
    // select composer by name
    db.all('SELECT firstname, surname, imagefile FROM composer;',
      [], (err, rows) => {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
      }
      else {
        let imageFound = false;
        let composerName = req.swagger.params.composerName.value;
        rows.forEach((row) => {
          if (composerName.startsWith(row.firstname) && (composerName.endsWith(row.surname))) {
            // composer found in database
            if (row.imagefile) {
              // send stored image file as response
              res.set('Content-Type', 'image/*');
              res.status(200).send(row.imagefile);
            }
            else {
              // no image file available - send dummy image
              res.status(200).sendFile(UNKNOWN_COMPOSER_IMAGE);
            }
            imageFound = true;
          }
        });
        if (imageFound === false) {
          res.status(404).json({ 'message': 'Unknown composer: ' + composerName });
        }
      }
    });
  }
  else {
    res.status(200).sendFile(UNKNOWN_COMPOSER_IMAGE);
  }
}
