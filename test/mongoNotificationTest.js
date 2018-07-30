'use strict';

const { EventEmitter } = require('events');

const assert = require('assertthat');
const nodeenv = require('nodeenv');
const uuidv4 = require('uuidv4');

const mongo = require('@sealsystems/mongo');

const mongoNotification = require('../lib/mongoNotification');

let restore;

suite('mongoNotification', () => {
  let mongoUrl;

  suiteSetup((done) => {
    restore = nodeenv('TLS_UNPROTECTED', 'world');
    mongoUrl = `mongodb://localhost:27717/${uuidv4()}`;
    done();
  });

  suiteTeardown(async function () {
    this.timeout(10000);

    const db = await mongo.db(mongoUrl);

    await db.dropDatabase();
    restore();
  });

  test('is a function.', async () => {
    assert.that(mongoNotification).is.ofType('function');
  });

  test('throws an error if url is missing.', async () => {
    await assert.that(async () => {
      await mongoNotification({});
    }).is.throwingAsync('Url is missing.');
  });

  test('throws an error if topic is missing.', async () => {
    await assert.that(async () => {
      await mongoNotification({ url: mongoUrl });
    }).is.throwingAsync('Topic is missing.');
  });

  test('returns an event emitter.', async () => {
    const notificationEmitter = await mongoNotification({ url: mongoUrl, topic: uuidv4() });

    assert.that(notificationEmitter).is.instanceOf(EventEmitter);

    await new Promise((resolve) => {
      notificationEmitter.on('EOT', () => {
        notificationEmitter.close(resolve);
      });
      notificationEmitter.emit('EOT', {});
    });
  });

  test('returns a writeOnly event emitter.', async () => {
    const notificationEmitter = await mongoNotification({ url: mongoUrl, topic: uuidv4(), writeOnly: true });

    assert.that(notificationEmitter).is.instanceOf(EventEmitter);

    await new Promise((resolve) => {
      setTimeout(() => {
        assert.that(notificationEmitter.eventStream).is.undefined();
        notificationEmitter.close(resolve);
      }, 250);
    });
  });
});
