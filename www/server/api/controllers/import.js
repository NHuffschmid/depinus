const logger = require("./helpers/logger")(__filename);
const fs = require('fs');
const path = require('path');
const AdmZip = require("adm-zip");
const utils = require('./helpers/utils');
const readline = require('readline');
const db = require('./helpers/db');

const ARCHIVEFILENAME = 'depinus.zip';
//const ARCHIVEFILENAME = 'archive.dep';

const TEMPARCHIVEFOLDER = utils.getTempFolder();


module.exports = {
  importArchiveFile: importArchiveFile,
  inspectArchiveFile: inspectArchiveFile
};

function importArchiveFile(req, res) {

  const tempFolder = unzipFile(req);

  const selection = JSON.parse(req.swagger.params.importdata.value);
  logger.info('Selection for archive import: ' + JSON.stringify(selection));

  // determine total number of selected compositions
  const callback_counter = { value: 0 }; // use object for references instead of integer values
  selection.forEach((composer) => {
    composer.compositionIds.forEach((composition) => {
      callback_counter.value++;
    });
  });

  if (callback_counter.value === 0) {
    logger.warn('Empty selection received. Should be prevented by client!');
    res.json();
    cleanup(tempFolder);
  }
  else {
    readArchive(tempFolder, function (err, archive) {
      if (err) {
        res.status(500).json({ 'message': err.toString() });
      } else {
        logger.info('Transmitted archive: ' + JSON.stringify(archive));
        for (const composer of selection) {
          const archiveComposer = archive.find(item => item.id === composer.composerId);
          // determine composerId on importing machine
          db.get('SELECT id,imagefile FROM composer WHERE firstname=? AND surname=?;',
            [archiveComposer.firstname, archiveComposer.surname], (err, row) => {
              if (callback_counter.value === 0) {
                return; // an error already has occured before
              }

              if (err) {
                res.status(500).json({ 'message': err.toString() });
                callback_counter.value = 0;
                return;
              }

              let localComposerId = 0;
              if (row === undefined) {
                // composer is not in DB yet.
                const imagefilePath = tempFolder + '/' + composer.composerId + '/image.png';
                let imagefileBuffer = null;
                try {
                  fs.accessSync(imagefilePath, fs.constants.F_OK);
                  imagefileBuffer = fs.readFileSync(imagefilePath);
                }
                catch (err) { } // this is the recommended fs way to test if a file exists :(

                db.run('INSERT INTO composer(firstname, surname, imagefile) VALUES (?, ?, ?)',
                  [archiveComposer.firstname, archiveComposer.surname, imagefileBuffer], function (err, lastID) {
                    if (callback_counter.value === 0) {
                      return; // an error already has occured before
                    }

                    if (err) {
                      res.status(500).json({ 'message': err.toString() });
                      callback_counter.value = 0;
                      return;
                    }
                    localComposerId = lastID;
                    addCompositions(tempFolder, archive, composer, localComposerId, res, callback_counter);
                  });
              }
              else {
                // composer is already in DB
                localComposerId = row['id'];
                addCompositions(tempFolder, archive, composer, localComposerId, res, callback_counter);

                // TODO: check if image is already in DB - if not: add it if available
              }
            });
        }
      }
    });
  }
}

function inspectArchiveFile(req, res) {

  const tempFolder = unzipFile(req);

  readArchive(tempFolder, function (err, archive) {
    if (err) {
      res.status(500).json({ 'message': err.toString() });
    } else {
      res.status(200).json(archive); // send back for inspection
    }

    cleanup(tempFolder);
  });
}


//////////////////////////
// INTERNAL FUNCTIONS:  //
//////////////////////////

function unzipFile(req) {
  const tempFolder = fs.mkdtempSync(TEMPARCHIVEFOLDER)
  const tempZipFile = tempFolder + '/archive.zip';

  // store received zip file in temporary folder
  const fileDescriptor = fs.openSync(tempZipFile, 'w');
  const buffer = req.swagger.params.archivefile.value.buffer;
  fs.writeSync(fileDescriptor, buffer, 0, buffer.length, 0);
  fs.closeSync(fileDescriptor);

  // unzip file
  const zip = new AdmZip(tempZipFile);
  zip.extractAllTo(tempFolder);
  fs.rmSync(tempZipFile);

  return tempFolder;
}

function readArchive(folder, onArchiveRead) {
  const archive = [];

  // walk through folder structure
  fs.readdir(folder, { withFileTypes: true }, (err, dirs) => {
    if (err) {
      console.error(`Error reading ${folder}:`, err);
      onArchiveRead(err, null);
      return;
    }

    // do for all composer folders
    let processedComposerCounter = 0;
    for (const dir of dirs) {
      if (!dir.isDirectory()) {
        onArchiveRead(new Error('Invalid archive format! Found file instead of directories.'), null);
        return;
      }

      readComposerFolder(folder + '/' + dir.name, (composer) => {
        archive.push(composer);
        processedComposerCounter++;
        if (processedComposerCounter === dirs.length) {
          // sort composers alphabetically
          archive.sort((c1, c2) => {
            if (c1.surname < c2.surname) return -1;
            if (c1.surname > c2.surname) return 1;
            return 0;
          });
          onArchiveRead(null, archive);
        }
      });
    };
  });
}

function readComposerFolder(folderPath, onComposerDataCollected) {

  const composer = {};
  composer['id'] = Number(path.basename(folderPath));
  const fileStream = fs.createReadStream(folderPath + '/info.txt');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    if (line.startsWith('Firstname:')) {
      composer['firstname'] = line.substring(10).trim();
    }
    if (line.startsWith('Surname:')) {
      composer['surname'] = line.substring(8).trim();
    }
  });

  rl.on('close', () => {
    composer['name'] = composer['firstname'] + ' ' + composer['surname'];
    const compositions = [];
    fs.readdir(folderPath, { withFileTypes: true }, (err, dirs) => {
      if (err) {
        console.error(`Error reading ${folderPath}:`, err);
        return;
      }
      let processedCompositionsCounter = 0;
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          readCompositionFolder(folderPath + '/' + dir.name, (composition) => {
            compositions.push(composition);
            processedCompositionsCounter++;
            if (processedCompositionsCounter === dirs.length) {
              composer['compositions'] = compositions;
              onComposerDataCollected(composer);
            }
          });
        }
        else {
          processedCompositionsCounter++;
          if (processedCompositionsCounter === dirs.length) {
            composer['compositions'] = compositions;
            onComposerDataCollected(composer);
          }
        }
      };
    });
  });
}

function readCompositionFolder(folderPath, onCompositionDataCollected) {

  const composition = {};
  composition['id'] = Number(path.basename(folderPath));
  const fileStream = fs.createReadStream(folderPath + '/info.txt');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    if (line.startsWith('Name:')) {
      composition['name'] = line.substring(5).trim();
    }
    if (line.startsWith('Duration:')) {
      composition['duration'] = Number(line.substring(9).trim());
    }
  });

  rl.on('close', () => {
    onCompositionDataCollected(composition);
  });
}


function addCompositions(tempFolder, archive, composer, localComposerId, res, callback_counter) {
  // TODO: check order, e.g. Mozart compositions get mixed up!
  for (const compositionId of composer.compositionIds) {
    const composition = archive.find(item => item.id === composer.composerId).compositions.find(item => item.id === compositionId)
    const compositionName = composition.name;
    const duration = composition.duration;
    const midifilePath = tempFolder + '/' + composer.composerId + '/' + compositionId + '/composition.mid';
    const midifileBuffer = fs.readFileSync(midifilePath);
    db.run('INSERT INTO composition(name, composer_id, duration, midifile) VALUES (?, ?, ?, ?)', [
      compositionName,
      localComposerId,
      duration,
      midifileBuffer
    ],
      function (err) {

        if (callback_counter.value === 0) {
          return; // an error already has occured before
        }

        if (err) {
          res.status(500).json({ 'message': err.toString() });
          callback_counter.value = 0;
          return;
        }

        callback_counter.value--;
        if (callback_counter.value === 0) {
          res.json();
          //console.log('Cleaning up...');
          cleanup(tempFolder);
        }
      });
  }
}

function cleanup(folder) {
  fs.rm(folder, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error(`Error during removing ${folder}:`, err);
    }
  });
}
