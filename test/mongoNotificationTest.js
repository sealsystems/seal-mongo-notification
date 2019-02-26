'use strict';

const events = require('events');

const assert = require('assertthat');
const uuidv4 = require('uuidv4');

const mongo = require('seal-mongo');
const setenv = require('@sealsystems/setenv');

const mongoHost = require('docker-host')().host;

const mongoNotification = require('../lib/mongoNotification');

const EventEmitter = events.EventEmitter;

suite('mongoNotification', () => {
  let mongoUrl;

  suiteSetup((done) => {
    setenv('TLS_UNPROTECTED', 'world');
    mongoUrl = `mongodb://${mongoHost}/${uuidv4()}`;
    done();
  });

  suiteTeardown(function (done) {
    this.timeout(10000);
    mongo.db(mongoUrl, (errConnect, db) => {
      if (errConnect) {
        return done(errConnect);
      }

      db.dropDatabase((errDrop) => {
        if (errDrop) {
          return done(errDrop);
        }

        done();
      });
    });
  });

  test('is a function.', (done) => {
    assert.that(mongoNotification).is.ofType('function');
    done();
  });

  test('throws an error if options are missing.', (done) => {
    assert.that(() => {
      mongoNotification();
    }).is.throwing('Options are missing.');
    done();
  });

  test('throws an error if url is missing.', (done) => {
    assert.that(() => {
      mongoNotification({});
    }).is.throwing('Url is missing.');
    done();
  });

  test('throws an error if topic is missing.', (done) => {
    assert.that(() => {
      mongoNotification({ url: mongoUrl });
    }).is.throwing('Topic is missing.');
    done();
  });

  test('throws an error if callback is missing.', (done) => {
    assert.that(() => {
      mongoNotification({ url: mongoUrl, topic: uuidv4() });
    }).is.throwing('Callback is missing.');
    done();
  });

  test('returns an event emitter.', (done) => {
    mongoNotification({ url: mongoUrl, topic: uuidv4() }, (err, notificationEmitter) => {
      assert.that(err).is.null();
      assert.that(notificationEmitter).is.instanceOf(EventEmitter);
      notificationEmitter.on('EOT', () => {
        notificationEmitter.close(done);
      });
      notificationEmitter.emit('EOT', {});
    });
  });

  test('returns a writeOnly event emitter.', (done) => {
    mongoNotification({ url: mongoUrl, topic: uuidv4(), writeOnly: true }, (err, notificationEmitter) => {
      assert.that(err).is.null();
      assert.that(notificationEmitter).is.instanceOf(EventEmitter);
      setTimeout(() => {
        assert.that(notificationEmitter.eventStream).is.undefined();
        notificationEmitter.close(done);
      }, 250);
    });
  });
});
