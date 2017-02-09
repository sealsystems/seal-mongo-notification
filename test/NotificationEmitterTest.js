'use strict';

const PassThrough = require('stream').PassThrough;

const assert = require('assertthat');

const uuidv4 = require('uuidv4');

const mongo = require('seal-mongo');

const mongoHost = require('docker-host')().host;

const NotificationEmitter = require('../lib/NotificationEmitter');

suite('NotificationEmitter', () => {
  const mongoUrl = `mongodb://${mongoHost}/${uuidv4()}`;
  let database;
  let collection;

  suiteSetup((done) => {
    mongo.db(mongoUrl, (errConnect, db) => {
      if (errConnect) {
        return done(errConnect);
      }
      database = db;
      done(null);
    });
  });

  setup((done) => {
    database.createCollection(uuidv4(), {
      capped: true,
      size: 1024 * 1024
    }, (errCreateCollection, coll) => {
      if (errCreateCollection) {
        return done(errCreateCollection);
      }
      collection = coll;
      done(null);
    });
  });

  suiteTeardown(function (done) {
    // drop may need far more that 2000 ms
    this.timeout(10000);
    database.dropDatabase((errDrop) => {
      if (errDrop) {
        return done(errDrop);
      }
      done(null);
    });
  });

  test('is a function.', (done) => {
    assert.that(NotificationEmitter).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', (done) => {
    assert.that(() => {
      /* eslint-disable no-new */
      new NotificationEmitter();
      /* eslint-enable no-new */
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if collection is missing.', (done) => {
    assert.that(() => {
      /* eslint-disable no-new */
      new NotificationEmitter({});
      /* eslint-enable no-new */
    }).is.throwing('Collection is missing.');
    done();
  });

  test('emits an event.', function (done) {
    this.timeout(5 * 1000);
    const notificationEmitter = new NotificationEmitter({ collection });

    notificationEmitter.once('foo', (payload) => {
      assert.that(payload).is.equalTo({ foo: 'bar' });
      notificationEmitter.close(done);
    });

    notificationEmitter.emit('foo', { foo: 'bar' });
  });

  test('does not emit an event if opened writeOnly', function (done) {
    this.timeout(5 * 1000);
    const notificationEmitter = new NotificationEmitter({ collection, writeOnly: true });

    notificationEmitter.once('foo', () => {
      assert.that(true).is.false();
    });

    notificationEmitter.emit('foo', {});
    notificationEmitter.emit('bar', {});
    notificationEmitter.emit('baz', {});
    setTimeout(() => {
      notificationEmitter.close(done);
    }, 600);
  });

  /*
  test('close returns null if not initialized', (done) => {
    const notificationEmitter = new NotificationEmitter({ collection });

    notificationEmitter.once('end', () => {
      notificationEmitter.close(done);
    });

    notificationEmitter.close((err) => {
      assert.that(err).is.null();
      notificationEmitter.emit('end', {});
    });
  });
  */

  test('call callback after emitting an event.', (done) => {
    let cbCalled = false;
    let fooReceived = false;
    const notificationEmitter = new NotificationEmitter({ collection });

    notificationEmitter.once('foo', (payload) => {
      assert.that(payload).is.equalTo({ foo: 'bar' });
      fooReceived = true;
      if (cbCalled) {
        notificationEmitter.close(done);
      }
    });

    notificationEmitter.emit('foo', { foo: 'bar' }, (errEmit) => {
      assert.that(errEmit).is.null();
      cbCalled = true;
      if (fooReceived) {
        notificationEmitter.close(done);
      }
    });
  });

  test('does not emit an event if message is malformed', (done) => {
    const notificationEmitter = new NotificationEmitter({ collection });

    notificationEmitter.once('status', (payload) => {
      assert.that(payload).is.equalTo({ foo: 'bar' });
      notificationEmitter.close(done);
    });

    collection.insert({ event: 'status', das: 'ist', eine: 'komische', nachricht: true }, (errInsert) => {
      assert.that(errInsert).is.falsy();

      notificationEmitter.emit('status', { foo: 'bar' }, (errEmit) => {
        assert.that(errEmit).is.null();
      });
    });
  });

  test('throws MongoError', (done) => {
    const myStream = new PassThrough();
    const myCollection = {
      find () {
        return {
          stream () {
            return myStream;
          },
          close () {
          }
        };
      },
      insert (option, cb) {
        cb(null);
      }
    };
    /* eslint-disable no-unused-vars */
    const notificationEmitter = new NotificationEmitter({ collection: myCollection });
    /* eslint-enable no-unused-vars */

    try {
      const myError = new Error('nix geht mehr');

      myError.name = 'MongoError';
      myStream.emit('error', myError);
    } catch (err) {
      assert.that(err.name).is.equalTo('MongoError');
    }
    done();
  });
});
