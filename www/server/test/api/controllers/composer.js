const should = require('should');
const request = require('supertest');

const BACKEND_URL = 'http://localhost:5000';

describe('controllers', function () {

  describe('composer', function () {

    this.slow(1000);
    var composerId;

    describe('GET /archive/composers', function () {

      it('should return all composers available in the database', function (done) {

        request(BACKEND_URL)
          .get('/archive/composers')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);

            res.body.length.should.be.above(10); // number of composers in DB

            res.body[1].should.eql({
              firstname: 'Johann Sebastian',
              id: 2,
              surname: 'Bach'
            });

            done();
          });
      });
    });

    describe('POST /archive/composer', function () {

      it('should add a new composer to the database', function (done) {

        request(BACKEND_URL)
          .post('/archive/composer')
          .field('firstname', 'foo')
          .field('surname', 'bar')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);

            res.body.firstname.should.eql('foo')
            res.body.surname.should.eql('bar')
            composerId = res.body.id
            composerId.should.be.above(1);

            done();
          });
      });
    });

    describe('PATCH /archive/composer', function () {

      it('should update the added composer in the database', function (done) {

        request(BACKEND_URL)
          .patch('/archive/composer/' + composerId)
          .field('firstname', 'fooo')
          .field('surname', 'baz')
          .attach('image', '../../midi_archive/images/bach.png')
          .expect(204)
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });
    });

    describe('DELETE /archive/composer', function () {

      it('should remove the added composer from the database', function (done) {

        request(BACKEND_URL)
          .delete('/archive/composer/' + composerId)
          .expect(204)
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });
    });
  });
});