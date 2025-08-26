const should = require('should');
const request = require('supertest');

const BACKEND_URL = 'http://localhost:5000';

describe('controllers', function () {

  describe('composerImage', function () {

    describe('GET /archive/composerImage', function () {

      it('should return Bachs image by ID', function (done) {

        this.slow(500);

        request(BACKEND_URL)
          .get('/archive/composerImage')
          .query({ composerId: 2 })
          .set('Accept', 'image/*')
          .set('Accept', 'application/json')
          .expect('Content-Type', 'image/*')
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.length.should.eql(413804); // image size of Bach's portrait  
            done();
          });
      });

      it('should return Bachs image by name', function (done) {

        this.slow(500);

        request(BACKEND_URL)
          .get('/archive/composerImage')
          .query({ composerName: 'Johann Sebastian Bach' })
          .set('Accept', 'image/*')
          .set('Accept', 'application/json')
          .expect('Content-Type', 'image/*')
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.length.should.eql(413804); // image size of Bach's portrait  
            done();
          });
      });

      it('should return an error in case of an invalid composer ID', function (done) {

        this.slow(500);

        request(BACKEND_URL)
          .get('/archive/composerImage')
          .query({ composerId: 999 })
          .set('Accept', 'image/*')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(404) // why is the response code not checked?
          .end(function (err, res) {
            should.not.exist(err);
            res.body.should.eql({ message: 'No composer found with ID 999' });
            done();
          });
      });

      it('should return an error in case of an unknown composer', function (done) {

        this.slow(500);

        request(BACKEND_URL)
          .get('/archive/composerImage')
          .query({ composerName: 'Hmpflbrmpf' })
          .set('Accept', 'image/*')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(404) // why is the response code not checked?
          .end(function (err, res) {
            should.not.exist(err);
            res.body.should.eql({ message: 'Unknown composer: Hmpflbrmpf' });
            done();
          });
      });
    });
  });
});
