const logger = require("./helpers/logger")(__filename);
const db = require('./helpers/db');
const fs = require('fs');
const AdmZip = require("adm-zip");
const utils = require('./helpers/utils');

const ARCHIVEFILENAME = 'depinus.zip';
//const ARCHIVEFILENAME = 'archive.dep';

const TEMPARCHIVEFOLDER = utils.getTempFolder();

module.exports = {
  getArchiveExportFile: getArchiveExportFile,
};

function getArchiveExportFile(req, res) {

  const tempFolder = fs.mkdtempSync(TEMPARCHIVEFOLDER)

  createDirectoryTree(req.swagger.params.body.value, tempFolder, (err) => {
    if (err) {
      res.status(500).json({ 'message': err.toString() });
    }
    else {
      // create zip file
      const zipFilePath = tempFolder + '/archive.zip'
      const zip = new AdmZip();
      zip.addLocalFolder(tempFolder);
      zip.writeZip(zipFilePath);

      // send zip file
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename=' + ARCHIVEFILENAME,
        'Content-Length': fs.statSync(zipFilePath).size
      });
      const stream = fs.createReadStream(zipFilePath);
      stream.pipe(res);
      stream.on('error', error => {
        logger.error('error during sending zipfile: ', error);
      });
      stream.on('close', function () {
        // clean up
        fs.rmSync(tempFolder, { recursive: true, force: true });
      });
    }
  });
}


//////////////////////////
// INTERNAL FUNCTIONS:  //
//////////////////////////

function createDirectoryTree(data, folder, onDone) {

  // determine total number of compositions for end of asysnc sqlite3 queries
  let compositionCounter = 0;
  data.forEach((composer) => {
    compositionCounter += composer.compositionIds.length;
  });

  if (compositionCounter === 0) {
    onDone('Empty export request received');
  }
  else {
    data.forEach((composer) => {
      db.get('SELECT firstname, surname, imagefile FROM composer WHERE id=?;',
        [composer.composerId], (err, dbComposer) => {
          if (err) {
            onDone(err);
          }
          else {
            const composerFolderPath = folder + '/' + composer.composerId
            fs.mkdirSync(composerFolderPath);
            fs.writeFileSync(composerFolderPath + '/info.txt', 'Firstname: ' + dbComposer.firstname + '\n');
            fs.writeFileSync(composerFolderPath + '/info.txt', 'Surname: ' + dbComposer.surname + '\n', { flag: 'a' });
            if (dbComposer.imagefile) {
              const buffer = Buffer.from(dbComposer.imagefile)
              fs.writeFileSync(composerFolderPath + '/image.png', buffer);
            }

            composer.compositionIds.forEach((compositionId) => {
              db.get('SELECT name, duration, midifile FROM composition WHERE id=?;',
                [compositionId], (err, row) => {
                  if (err) {
                    onDone(err);
                  }
                  else {
                    const compositionFolderPath = composerFolderPath + '/' + compositionId;
                    fs.mkdirSync(compositionFolderPath);
                    fs.writeFileSync(compositionFolderPath + '/info.txt', 'Name: ' + row.name + '\n');
                    fs.writeFileSync(compositionFolderPath + '/info.txt', 'Duration: ' + row.duration + '\n', { flag: 'a' });
                    if (row.midifile) {
                      const buffer = Buffer.from(row.midifile)
                      fs.writeFileSync(compositionFolderPath + '/composition.mid', buffer);
                    }

                    compositionCounter--;
                    if (compositionCounter === 0) {
                      onDone();
                    }
                  }
                }
              )
            });
          }
        });
    });
  }
}
