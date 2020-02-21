'use strict';

const { EventEmitter } = require('events');

const assert = require('assertthat');
const nodeenv = require('nodeenv');
const proxyquire = require('proxyquire');
const uuid = require('uuid/v4');

const mongo = require('@sealsystems/mongo');

let sizeOk = false;
let expectedSize;

const mongoNotification = require('../lib/mongoNotification');
const mongoNotificationMock = proxyquire('../lib/mongoNotification', {
  '@sealsystems/mongo': {
    db() {
      return {
        createCollection(topic, options) {
          assert.that(options.size).is.equalTo(expectedSize);
          sizeOk = true;

          return {};
        }
      };
    }
  }
});

let restore;

suite('mongoNotification', () => {
  let mongoUrl;

  suiteSetup(async () => {
    restore = nodeenv('TLS_UNPROTECTED', 'world');
    mongoUrl = `mongodb://localhost:27017/${uuid()}`;
  });

  suiteTeardown(async function() {
    this.timeout(10000);

    const db = await mongo.db(mongoUrl);

    await db.dropDatabase();
    restore();
  });

  setup(async () => {
    expectedSize = 1024 * 1024;
  });

  test('is a function.', async () => {
    assert.that(mongoNotification).is.ofType('function');
  });

  test('throws an error if url is missing.', async () => {
    await assert
      .that(async () => {
        await mongoNotification({});
      })
      .is.throwingAsync('Url is missing.');
  });

  test('throws an error if topic is missing.', async () => {
    await assert
      .that(async () => {
        await mongoNotification({ url: mongoUrl });
      })
      .is.throwingAsync('Topic is missing.');
  });

  test('returns an event emitter.', async function() {
    this.timeout(10 * 1000);

    const notificationEmitter = await mongoNotification({ url: mongoUrl, topic: uuid() });

    assert.that(notificationEmitter).is.instanceOf(EventEmitter);

    await new Promise((resolve) => {
      notificationEmitter.on('EOT', () => {
        notificationEmitter.close(resolve);
      });
      notificationEmitter.emit('EOT', {});
    });
  });

  test('returns a writeOnly event emitter.', async () => {
    const notificationEmitter = await mongoNotification({ url: mongoUrl, topic: uuid(), writeOnly: true });

    assert.that(notificationEmitter).is.instanceOf(EventEmitter);

    await new Promise((resolve) => {
      setTimeout(() => {
        assert.that(notificationEmitter.eventStream).is.undefined();
        notificationEmitter.close(resolve);
      }, 250);
    });
  });

  test('uses default collection size.', async () => {
    try {
      await mongoNotificationMock({ url: 'http://localhost', topic: 'huhu' });
    } catch (e) {
      /* eslint-disable no-empty */
    } finally {
      assert.that(sizeOk).is.true();
    }
  });

  test('allows to overwrite default collection size.', async () => {
    try {
      expectedSize = 7 * 1024 * 1024;
      await mongoNotificationMock({ url: 'http://localhost', topic: 'huhu', collectionSize: '7MB' });
    } catch (e) {
      /* eslint-disable no-empty */
    } finally {
      assert.that(sizeOk).is.true();
    }
  });
});
