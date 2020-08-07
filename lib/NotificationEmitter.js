'use strict';

const { EventEmitter } = require('events');

const { v4: uuidv4 } = require('uuid');

const assertMongoError = require('./assertMongoError');

class NotificationEmitter extends EventEmitter {
  constructor({ collection, writeOnly = false }) {
    if (!collection) {
      throw new Error('Collection is missing.');
    }

    super();

    this.originalEmit = EventEmitter.prototype.emit;
    this.collection = collection;
    this.writeOnly = writeOnly;
  }

  async init() {
    if (this.writeOnly) {
      return;
    }

    const id = uuidv4();

    try {
      await this.collection.insertOne({ id });
    } catch (ex) {
      assertMongoError(ex);

      return this.originalEmit('error', ex);
    }

    let doEmitEvents = false;

    this.eventCursor = this.collection.find(
      {},
      {
        tailable: true,
        awaitdata: true,
        numberOfRetries: Number.MAX_VALUE,
        tailableRetryInterval: 500
      }
    );
    this.eventStream = this.eventCursor.stream();

    this.eventStream.on('error', (errEventStream) => {
      assertMongoError(errEventStream);
    });
    this.eventStream.on('data', (document) => {
      if (!doEmitEvents) {
        if (document.id === id) {
          doEmitEvents = true;
        }

        return;
      }

      if (!document.event || !document.payload) {
        return;
      }

      this.originalEmit(document.event, document.payload);
    });
  }

  emit(event, payload, callback) {
    this.collection.insertOne({ event, payload }, (err) => {
      if (!callback) {
        return;
      }
      if (err) {
        /* eslint-disable consistent-return */
        return callback(err);
        /* eslint-enable consistent-return */
      }

      callback(null);
    });
  }

  close(callback) {
    if (!this.eventStream) {
      return callback(null);
    }
    this.eventStream.removeAllListeners();
    this.eventCursor.close((err) => {
      callback(err);
    });
  }
}

module.exports = NotificationEmitter;
