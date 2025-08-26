const should = require('should');
const request = require('supertest');

const BACKEND_URL = 'http://localhost:5000';

describe('controllers', function () {

  describe('play', function () {

    describe('POST /play', function () {

      it('should start to play spanish music', function (done) {

        this.timeout(10000);
        this.slow(6000);

        request(BACKEND_URL)
          .post('/play')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .send({
            compositionId: 1
          })
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);

            res.body.should.eql({
              "composer_id": 1,
              "duration": 96,
              "id": 1,
              "name": "España, Opus 165, Prélude"
            });

            setTimeout(function () {
              done();
            }, 5000);
          });
      });

      it('should play random music', function (done) {

        this.slow(500);

        request(BACKEND_URL)
          .post('/play')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .send({
            compositionId: 0
          })
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);

            res.body.should.have.property('id');
            res.body.should.have.property('composer_id');
            res.body.should.have.property('duration');
            res.body.should.have.property('name');

            done();
          });
      });
    });
  });
});
