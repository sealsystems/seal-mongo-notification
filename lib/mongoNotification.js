'use strict';

const async = require('async');
const filesizeParser = require('filesize-parser');

const mongo = require('seal-mongo');

const assertMongoError = require('./assertMongoError');
const NotificationEmitter = require('./NotificationEmitter');

const mongoNotification = function (options, callback) {
  if (!options) {
    throw new Error('Options are missing.');
  }
  if (!options.url) {
    throw new Error('Url is missing.');
  }
  if (!options.topic) {
    throw new Error('Topic is missing.');
  }
  if (!callback) {
    throw new Error('Callback is missing.');
  }

  async.waterfall([
    (next) => {
      mongo.db(options.url, options, next);
    },
    (db, next) => {
      db.createCollection(options.topic, {
        capped: true,
        size: options.collectionSize ? filesizeParser(options.collectionSize) : 1024 * 1024
      }, next);
    }
  ], (err, collection) => {
    assertMongoError(err);
    if (err) {
      return callback(err);
    }
    callback(null, new NotificationEmitter({
      collection,
      writeOnly: options.writeOnly
    }));
  });
};

module.exports = mongoNotification;
