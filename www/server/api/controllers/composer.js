const logger = require("./helpers/logger")(__filename);
const db = require('./helpers/db');

module.exports = {
  getComposers: getComposers,
  deleteComposer: deleteComposer,
  patchComposer: patchComposer,
  postComposer: postComposer
};

function getComposers(req, res) {

  // get list of all composers in DB
  db.all('SELECT id, firstname, surname FROM composer ORDER BY surname;',
    [], (err, rows) => {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
        logger.error(err.message);
      }
      else {
        const composers = [];
        rows.forEach((row) => {
          const composer = {};
          composer['id'] = row.id;
          composer['firstname'] = row.firstname;
          composer['surname'] = row.surname;
          composers.push(composer);
        });
        res.json(composers);
      }
    });
}

function deleteComposer(req, res) {

  // delete composer (and all his/her compositions due to foreign key constraint) from DB
  db.run('DELETE FROM composer WHERE id=(?);',
    [req.swagger.params.id.value], (err) => {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
        logger.error(err.message);
      }
      else {
        res.status(204).send();
      }
    });
}

function patchComposer(req, res) {

  // Update composer in DB
  let sql = '';
  const params = [
    req.swagger.params.firstname.value,
    req.swagger.params.surname.value
  ];

  if (req.swagger.params.image.value) {
    sql = `UPDATE composer SET firstname=(?), surname=(?), imagefile=(?) WHERE id=${req.swagger.params.id.value};`;
    params.push(req.swagger.params.image.value.buffer);
  }
  else {
    sql = `UPDATE composer SET firstname=(?), surname=(?) WHERE id=${req.swagger.params.id.value};`;
  }

  db.run(sql, params, (err) => {
    if (err) {
      res.status(500).json({ 'message': err.toString() });
    }
    res.status(204).send();
  });
}

function postComposer(req, res) {

  // insert composer in DB

  let firstname = req.swagger.params.firstname.value;
  if (!firstname) {
    firstname = ''
  }

  let image = null;
  if (req.swagger.params.image.value) {
    image = req.swagger.params.image.value.buffer;
  }

  db.run('INSERT INTO composer (firstname, surname, imagefile) VALUES (?, ?, ?)',
    [firstname, req.swagger.params.surname.value, image],
    (err, lastID) => {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
      }
      else {
        res.status(200).json({
          'id': lastID,
          'firstname': firstname,
          'surname': req.swagger.params.surname.value
        });
      }
    });
}
