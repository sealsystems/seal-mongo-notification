'use strict';

const { PassThrough } = require('stream');

const assert = require('assertthat');

const uuidv4 = require('uuidv4');

const mongo = require('@sealsystems/mongo');

const mongoHost = require('docker-host')().host;

const NotificationEmitter = require('../lib/NotificationEmitter');

suite('NotificationEmitter', () => {
  const mongoUrl = `mongodb://${mongoHost}/${uuidv4()}`;
  let database;
  let collection;

  suiteSetup(async () => {
    database = await mongo.db(mongoUrl);
  });

  setup(async () => {
    collection = await database.createCollection(uuidv4(), {
      capped: true,
      size: 1024 * 1024
    });
  });

  suiteTeardown(async function () {
    // drop may need far more that 2000 ms
    this.timeout(10000);

    await database.dropDatabase();
  });

  test('is a function.', async () => {
    assert.that(NotificationEmitter).is.ofType('function');
  });

  test('throws an error if collection is missing.', async () => {
    assert.that(() => {
      /* eslint-disable no-new */
      new NotificationEmitter({});
      /* eslint-enable no-new */
    }).is.throwing('Collection is missing.');
  });

  test('emits an event.', async function () {
    this.timeout(5 * 1000);

    const notificationEmitter = new NotificationEmitter({ collection });

    await notificationEmitter.init();

    await new Promise((resolve) => {
      notificationEmitter.once('foo', (payload) => {
        assert.that(payload).is.equalTo({ foo: 'bar' });
        notificationEmitter.close(resolve);
      });

      notificationEmitter.emit('foo', { foo: 'bar' });
    });
  });

  test('does not emit an event if opened writeOnly', async function () {
    this.timeout(5 * 1000);

    const notificationEmitter = new NotificationEmitter({ collection, writeOnly: true });

    await notificationEmitter.init();

    notificationEmitter.once('foo', () => {
      assert.that(true).is.false();
    });

    notificationEmitter.emit('foo', {});
    notificationEmitter.emit('bar', {});
    notificationEmitter.emit('baz', {});

    await new Promise((resolve) => {
      setTimeout(() => {
        notificationEmitter.close(resolve);
      }, 600);
    });
  });

  // test('close returns null if not initialized', async () => {
  //   const notificationEmitter = new NotificationEmitter({ collection });
  //
  //   notificationEmitter.once('end', () => {
  //     notificationEmitter.close(done);
  //   });
  //
  //   notificationEmitter.close((err) => {
  //     assert.that(err).is.null();
  //     notificationEmitter.emit('end', {});
  //   });
  // });

  test('call callback after emitting an event.', async () => {
    let cbCalled = false;
    let fooReceived = false;
    const notificationEmitter = new NotificationEmitter({ collection });

    await notificationEmitter.init();

    await new Promise((resolve) => {
      notificationEmitter.once('foo', (payload) => {
        assert.that(payload).is.equalTo({ foo: 'bar' });
        fooReceived = true;
        if (cbCalled) {
          notificationEmitter.close(resolve);
        }
      });

      notificationEmitter.emit('foo', { foo: 'bar' }, (errEmit) => {
        assert.that(errEmit).is.null();
        cbCalled = true;
        if (fooReceived) {
          notificationEmitter.close(resolve);
        }
      });
    });
  });

  test('does not emit an event if message is malformed', async () => {
    const notificationEmitter = new NotificationEmitter({ collection });

    await notificationEmitter.init();

    await new Promise((resolve) => {
      notificationEmitter.once('status', (payload) => {
        assert.that(payload).is.equalTo({ foo: 'bar' });
        notificationEmitter.close(resolve);
      });

      collection.insert({ event: 'status', das: 'ist', eine: 'komische', nachricht: true }, (errInsert) => {
        assert.that(errInsert).is.falsy();

        notificationEmitter.emit('status', { foo: 'bar' }, (errEmit) => {
          assert.that(errEmit).is.null();
        });
      });
    });
  });

  test('throws MongoError', async () => {
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
      async insert () {
      }
    };
    /* eslint-disable no-unused-vars */
    const notificationEmitter = new NotificationEmitter({ collection: myCollection });
    /* eslint-enable no-unused-vars */

    await notificationEmitter.init();

    try {
      const myError = new Error('nix geht mehr');

      myError.name = 'MongoError';
      myStream.emit('error', myError);
    } catch (err) {
      assert.that(err.name).is.equalTo('MongoError');
    }
  });
});
