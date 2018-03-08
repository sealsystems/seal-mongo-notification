'use strict';

const mongo = require('@sealsystems/mongo');

const NotificationEmitter = require('./NotificationEmitter');

const mongoNotification = async function ({ url, topic, writeOnly = false }) {
  if (!url) {
    throw new Error('Url is missing.');
  }
  if (!topic) {
    throw new Error('Topic is missing.');
  }

  const db = await mongo.db(url, { url, topic, writeOnly });

  const collection = await db.createCollection(topic, {
    capped: true,
    size: 1024 * 1024
  });

  const notification = new NotificationEmitter({
    collection,
    writeOnly
  });

  return notification;
};

module.exports = mongoNotification;
