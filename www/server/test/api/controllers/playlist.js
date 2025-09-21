const should = require('should');
const request = require('supertest');

const BACKEND_URL = 'http://localhost:5000';

describe('controllers', function () {
  describe('playlist', function () {
    this.slow(1000);
    let playlistId;
    let compositionId = 1; // Set to a valid composition ID in your DB

    describe('GET /playlist', function () {
      it('should return all playlists', function (done) {
        request(BACKEND_URL)
          .get('/playlist')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.should.be.an.Array();
            done();
          });
      });
    });

    describe('POST /playlist', function () {
      it('should create a new playlist', function (done) {
        request(BACKEND_URL)
          .post('/playlist')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Accept', 'application/json')
          .send('name=Test Playlist')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.name.should.eql('Test Playlist');
            playlistId = res.body.id;
            playlistId.should.be.above(0);
            done();
          });
      });
    });

    describe('GET /playlist/{id}', function () {
      it('should return the created playlist', function (done) {
        request(BACKEND_URL)
          .get('/playlist/' + playlistId)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.id.should.eql(playlistId);
            res.body.name.should.eql('Test Playlist');
            done();
          });
      });
    });

    describe('PATCH /playlist/{id}', function () {
      it('should rename the playlist', function (done) {
        request(BACKEND_URL)
          .patch('/playlist/' + playlistId)
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Accept', 'application/json')
          .send('name=Renamed Playlist')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.should.have.property('id', playlistId);
            res.body.should.have.property('name', 'Renamed Playlist');
            done();
          });
      });
      it('should reflect the new name when fetching the playlist', function (done) {
        request(BACKEND_URL)
          .get('/playlist/' + playlistId)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.id.should.eql(playlistId);
            res.body.name.should.eql('Renamed Playlist');
            done();
          });
      });
    });

    describe('POST /playlist/{id}/compositions', function () {
      it('should add a composition to the playlist', function (done) {
        request(BACKEND_URL)
          .post('/playlist/' + playlistId + '/compositions')
          .send({ compositionId: compositionId })
          .set('Content-Type', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.should.have.property('playlistId', playlistId);
            res.body.should.have.property('compositionId', compositionId);
            res.body.should.have.property('position').which.is.a.Number();
            res.body.position.should.be.greaterThanOrEqual(0);
            done();
          });
      });
    });

    describe('GET /playlist/{id}/compositions', function () {
      it('should return compositions in the playlist', function (done) {
        request(BACKEND_URL)
          .get('/playlist/' + playlistId + '/compositions')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.should.be.an.Array();
            done();
          });
      });
    });

    describe('PATCH /playlist/{id}/compositions/{compositionId}', function () {
      it('should update the position of a composition in the playlist', function (done) {
        const patchObj = { position: 0 };
        request(BACKEND_URL)
          .patch('/playlist/' + playlistId + '/compositions/' + compositionId)
          .send(patchObj)
          .set('Accept', 'application/json')
          .expect(204)
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });

      describe('DELETE /playlist/{id}/compositions/{compositionId}', function () {
        it('should remove a composition from the playlist', function (done) {
          request(BACKEND_URL)
            .delete('/playlist/' + playlistId + '/compositions/' + compositionId)
            .expect(204)
            .end(function (err, res) {
              should.not.exist(err);
              done();
            });
        });
      });

      describe('DELETE /playlist/{id}', function () {
        it('should delete the playlist', function (done) {
          request(BACKEND_URL)
            .delete('/playlist/' + playlistId)
            .expect(204)
            .end(function (err, res) {
              should.not.exist(err);
              done();
            });
        });
      });
    });
  });
});
