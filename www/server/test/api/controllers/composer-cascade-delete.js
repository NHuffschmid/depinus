const should = require('should');
const request = require('supertest');

const BACKEND_URL = 'http://localhost:5000';

describe('controllers', function () {

  describe('composer cascade delete', function () {

    this.slow(2000);

    let composerWithDataId;
    let compositionId1;
    let compositionId2;

    describe('DELETE /archive/composer with compositions and image', function () {

      it('should create a composer with image', function (done) {
        request(BACKEND_URL)
          .post('/archive/composer')
          .field('firstname', 'Test')
          .field('surname', 'Composer')
          .attach('image', '../../midi_archive/images/bach.png')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.firstname.should.eql('Test');
            res.body.surname.should.eql('Composer');
            composerWithDataId = res.body.id;
            composerWithDataId.should.be.above(1);
            done();
          });
      });

      it('should create first composition for the composer', function (done) {
        request(BACKEND_URL)
          .post('/archive/composition')
          .field('name', 'Test Composition 1')
          .field('composerId', composerWithDataId)
          .attach('midifile', '../../midi_archive/BerndKrueger/Bach/bach_846.mid')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            compositionId1 = res.body.id;
            compositionId1.should.be.above(1);
            done();
          });
      });

      it('should create second composition for the composer', function (done) {
        request(BACKEND_URL)
          .post('/archive/composition')
          .field('name', 'Test Composition 2')
          .field('composerId', composerWithDataId)
          .attach('midifile', '../../midi_archive/BerndKrueger/Bach/bach_847.mid')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            compositionId2 = res.body.id;
            compositionId2.should.be.above(1);
            done();
          });
      });

      it('should verify compositions exist before deletion', function (done) {
        request(BACKEND_URL)
          .get('/archive/compositions?composerId=' + composerWithDataId)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.should.be.Array();
            res.body.length.should.be.eql(2);
            
            // Verify our specific compositions exist
            const comp1 = res.body.find(c => c.id === compositionId1);
            const comp2 = res.body.find(c => c.id === compositionId2);
            should.exist(comp1);
            should.exist(comp2);
            comp1.name.should.eql('Test Composition 1');
            comp2.name.should.eql('Test Composition 2');
            done();
          });
      });

      it('should delete the composer', function (done) {
        request(BACKEND_URL)
          .delete('/archive/composer/' + composerWithDataId)
          .expect(204)
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });

      it('should verify composer is deleted', function (done) {
        request(BACKEND_URL)
          .get('/archive/composers')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            const deletedComposer = res.body.find(c => c.id === composerWithDataId);
            should.not.exist(deletedComposer);
            done();
          });
      });

      it('should verify all compositions of deleted composer are also deleted', function (done) {
        request(BACKEND_URL)
          .get('/archive/compositions?composerId=' + composerWithDataId)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            res.body.should.be.Array();
            res.body.length.should.eql(0); // This will fail until bug is fixed
            done();
          });
      });

      it('should verify composition 1 is deleted from database', function (done) {
        request(BACKEND_URL)
          .get('/archive/composition/' + compositionId1)
          .expect(404) // This will fail until bug is fixed - currently returns 200
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });

      it('should verify composition 2 is deleted from database', function (done) {
        request(BACKEND_URL)
          .get('/archive/composition/' + compositionId2)
          .expect(404) // This will fail until bug is fixed - currently returns 200
          .end(function (err, res) {
            should.not.exist(err);
            done();
          });
      });
    });
  });
});
