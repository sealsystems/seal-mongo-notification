'use strict';

const events = require('events');
const util = require('util');

const uuidv4 = require('uuidv4');

const assertMongoError = require('./assertMongoError');

const EventEmitter = events.EventEmitter;

const NotificationEmitter = function (options) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.collection) {
    throw new Error('Collection is missing.');
  }

  EventEmitter.call(this);

  this.collection = options.collection;

  if (options.writeOnly) {
    return;
  }

  const id = uuidv4();

  this.collection.insert({ id }, (errInsert) => {
    assertMongoError(errInsert);
    if (errInsert) {
      return this.originalEmit('error', errInsert);
    }

    let doEmitEvents = false;

    this.eventCursor = this.collection.find({}, {
      tailable: true,
      awaitdata: true,
      numberOfRetries: Number.MAX_VALUE,
      tailableRetryInterval: 500
    });
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
  });
};

util.inherits(NotificationEmitter, EventEmitter);

NotificationEmitter.prototype.originalEmit = NotificationEmitter.prototype.emit;

NotificationEmitter.prototype.emit = function (event, payload, callback) {
  this.collection.insert({ event, payload }, (err) => {
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
};

NotificationEmitter.prototype.close = function (callback) {
  if (!this.eventStream) {
    return callback(null);
  }
  this.eventStream.removeAllListeners();
  this.eventCursor.close((err) => {
    callback(err);
  });
};

module.exports = NotificationEmitter;
