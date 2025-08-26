const should = require('should');
const request = require('supertest');
const utils = require('../../../api/controllers/helpers/utils');

const BACKEND_URL = 'http://localhost:5000';

describe('controllers', function () {

  describe('info', function () {

    describe('GET /info', function () {

      it('should return some info about the Depinus software', function (done) {

        this.slow(500);

        request(BACKEND_URL)
          .get('/info')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);

            const config = utils.parseConfig();
            res.body.version.should.eql(config.Default.version);

            done();
          });
      });
    });
  });
});
