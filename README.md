# seal-mongo-notification

An event emitter and receiver that uses MongoDB capped collections.

## Installation

```bash
$ npm install seal-mongo-notification
```

## Quick start

First you need to add a reference to seal-mongo-notification to your application.

```javascript
const mongoNotification = require('seal-mongo-notification');
```

Then connect to a MongoDB by calling the function `mongoNotification`. Provide an options object and a callback:

```javascript
mongoNotification({
  url: 'mongodb://...',
  topic: 'messages',
  writeOnly: false
}, (err, notification) => {
  // ...
});
```

The options contain:
- `url` mandatory, a connection string,
- `topic` mandatory, the name of a topic collection
- `writeOnly` optional, the open mode, default: false

## Emit events

Call the `emit` function for actually emitting an event:

```javascript
notification.emit('foo', { foo: 'bar' });
```

Optionally you may specify a callback to get notified when the event has been persisted:

```javascript
notification.emit('foo', { foo: 'bar' }, (err) => {
  // ...
});
```

## Receive events

If you want to receive events send by your application use the `on` function:

```javascript
notification.on('foo', (payload) => {
  // ...
});
```

## Write only mode

If you only want to emit events but not receive any you can set the `writeOnly` option to `true` when connecting.

```javascript
mongoNotification({
  ...
  writeOnly: true
}, (err, notification) => {
  // ...
});
```

## Running the build

To build this module use [roboter](https://www.npmjs.com/package/roboter).

```bash
$ bot
```
