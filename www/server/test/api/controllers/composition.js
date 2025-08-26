const should = require('should');
const request = require('supertest');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';

describe('controllers', function () {

  var compositionId;

  describe('composition', function () {

    describe('GET /archive/compositions', function () {

      it('should return Balakirews composition', function (done) {

        this.slow(500);

        request(BACKEND_URL)
          .get('/archive/compositions')
          .query({ composerId: 3 })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);

            res.body.should.eql([{
              composer_id: 3,
              duration: 497,
              id: 10,
              name: 'Islamei (Orientalische Fantasie) (1869)'
            }]);

            done();
          });
      });

      it('should return all compositions available in the database', function (done) {

        this.slow(500);

        request(BACKEND_URL)
          .get('/archive/compositions')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);

            res.body.length.should.be.above(100); // number of compositions in DB

            done();
          });
      });
    });

    describe('POST /archive/composition', function () {

      it('should add a new composition to the archive', function (done) {

        this.slow(5000);

        const midiFilePath = path.resolve(__dirname,
          '../../../../../midi_archive/BerndKrueger/Beethoven/appass_1.mid');

        request(BACKEND_URL)
          .post('/archive/composition')
          .field('name', 'Supertest Composition')
          .field('composerId', 1)
          .attach('midifile', midiFilePath)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);

            res.body.should.have.property('name', 'Supertest Composition');
            res.body.should.have.property('composer_id', 1);
            res.body.should.have.property('duration').which.is.a.Number().and.equal(560);

            compositionId = res.body.id

            done();
          });
      });
    });

    describe('PATCH /archive/composition', function () {

      it('should update the added composition in the database', function (done) {

        request(BACKEND_URL)
          .patch('/archive/composition/' + compositionId)
          .field('name', 'Updated Composition Name')
          .set('Accept', 'application/json')
          .expect(204)
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });
    });

    describe('DELETE /archive/composition', function () {

      it('should delete the added composition from the database', function (done) {

        request(BACKEND_URL)
          .delete('/archive/composition/' + compositionId)
          .set('Accept', 'application/json')
          .expect(204)
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });
    });
  });
});
