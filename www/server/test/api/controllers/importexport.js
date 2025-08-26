const should = require('should');
const request = require('supertest');
const fs = require("fs");

const BACKEND_URL = 'http://localhost:5000';

describe('controllers', function () {

  describe('Import and export', function () {

    const ARCHIVEFILE = 'archive.zip';

    before((done) => {
      // perform export before the import tests are done
      request(BACKEND_URL)
        .post('/archive/export')
        .send([{ "composerId": 2, "compositionIds": [7, 8] }])
        .set('Accept', 'application/json')
        .expect('Content-Type', 'application/octet-stream/')
        .expect(200)
        .end(function (err, res) {
          const buffer = Buffer.from(res.body);
          fs.writeFileSync(ARCHIVEFILE, buffer);
          done();
        });
    });

    describe('GET /archive/inspect', function () {

      it('should inspect the content of a depinus archive', function (done) {

        request(BACKEND_URL)
          .post('/archive/inspect')
          .attach('archivefile', ARCHIVEFILE)
          .set('Accept', 'application/json')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            const responseBodySize = Buffer.byteLength(JSON.stringify(res.body), 'utf8');
            responseBodySize.should.eql(247); // size of inspection data  
            done();
          });
      });

      it('should import an (empty) selection of a depinus archive', function (done) {

        request(BACKEND_URL)
          .post('/archive/import')
          .field("importdata", JSON.stringify([])) // we do not want to modify the database
          .attach('archivefile', ARCHIVEFILE)
          .set('Accept', 'application/json')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });
    });

    after(() => {
      fs.rmSync(ARCHIVEFILE);
    });
  });
});
