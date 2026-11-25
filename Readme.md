# Overview
Base adapter for [amqplib](https://www.npmjs.com/package/amqplib)

With all connection logic and logs!

As logger it uses winston.

You can find producer and consumer example in /examples directory

Requires Node.js 18 or later.

FOR PUBLISH YOU MUST HAVE 2FA IN NPM

## Config
In the `BaseConsumerConfig` and `BaseProducerConfig` you could pass an array or an object to `rmq`
```typescript
const ExampleConfig = {
  ...
  rmq: [
    {
      host: env.RMQ_CLUSTER_ADDRESS_1,
      password: env.RMQ_CLUSTER_PASSWORD_1,
      port: env.RMQ_CLUSTER_PORT_1,
      username: env.RMQ_CLUSTER_USERNAME_1,
    },
    {
      host: env.RMQ_CLUSTER_ADDRESS_2,
      password: env.RMQ_CLUSTER_PASSWORD_2,
      port: env.RMQ_CLUSTER_PORT_2,
      username: env.RMQ_CLUSTER_USERNAME_2,
    },
  ],
  ...
};
```

## Overridable methods
### Consumer (`BaseConsumer`)
| Method | Required | Default | Override to |
| --- | --- | --- | --- |
| `handleMessage(content, message)` | yes | — | process a message |
| `isRetryableError(error)` | no | `false` | mark transient errors (e.g. database is down) as retryable, see [Retrying transient errors](#retrying-transient-errors) |
| `isReady()` | no | `true` | report whether a dependency (e.g. database) is available, checked before every attempt |
| `onMessageSuccess(message)` | no | does nothing | run code after a message is acked |
| `onMessageError(message, error)` | no | does nothing | run code after a message is nacked |

The pause between readiness checks and between attempts is set with `retryIntervalMs` in `BaseConsumerConfig` (1000 ms by default).

### Producer (`BaseProducer`)
| Method | Required | Default | Override to |
| --- | --- | --- | --- |
| `publish()` | only with `run()` | throws "not implemented" | publish a batch when the producer is started with `run()` |
| `onSendError(error)` | no | does nothing | react to a failed `send()` |

### Connection events (consumer, producer and `Initializer`)
| Method | Default | Override to |
| --- | --- | --- |
| `onClose()` | logs, the connection manager reconnects | log with your logger or stop the process |
| `onError(error)` | logs | log with your logger or stop the process |
| `onConnectionFailed(error)` | logs | log with your logger |
| `onBlocked(error)` | logs | log with your logger |
| `onDisconnected(error)` | logs | log with your logger |

The connection manager reconnects by itself, so overriding the connection events is optional. Override `onClose` and `onError` with `process.exit` only if your service relies on a restart instead of reconnection.

## Consumer example
```typescript
import { BaseConsumer, BaseConsumerConfig, Message } from 'amqplib-base-adapter';

const isDatabaseAvailable = async (): Promise<boolean> => true;

const ConsumerExampleConfig: BaseConsumerConfig = {
  queue: 'example.queue',
  exchange: 'example_exchange',
  exchangeType: 'topic',
  routingKey: 'example_route',
  prefetch: 1,
  retryIntervalMs: 5000,
  rmq: {
    host: env.RMQ_CLUSTER_ADDRESS,
    password: env.RMQ_CLUSTER_PASSWORD,
    port: env.RMQ_CLUSTER_PORT,
    username: env.RMQ_CLUSTER_USERNAME,
  },
  environment: env.ENVIRONMENT,
};

class ConsumerExample extends BaseConsumer {
  async handleMessage(message: any) {
    this.logger.info({ message });
  }

  isRetryableError(error: unknown) {
    return (error as NodeJS.ErrnoException)?.code === 'ECONNREFUSED';
  }

  async isReady() {
    return isDatabaseAvailable();
  }

  async onMessageSuccess(message: Message) {
    this.logger.info('[ConsumerExample] message processed', { deliveryTag: message.fields.deliveryTag });
  }

  async onMessageError(message: Message, error: unknown) {
    this.logger.error('[ConsumerExample] message rejected', { deliveryTag: message.fields.deliveryTag, error });
  }

  onClose() {
    this.logger.error('[ConsumerExample] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[ConsumerExample] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[ConsumerExample] Connection failed:', error);
  }

  onBlocked(error: Error) {
    this.logger.error('[ConsumerExample] Connection blocked:', error);
  }

  onDisconnected(error: Error) {
    this.logger.error('[ConsumerExample] Connection disconnected:', error);
  }
}

const consumerExample = new ConsumerExample(ConsumerExampleConfig);
void consumerExample.run();
```

## Ack and nack
- `handleMessage` resolves: the message is acked, then `onMessageSuccess` is called.
- `handleMessage` throws: the message is nacked with the `nack` config, then `onMessageError` is called.
- The message body is not valid JSON: the message is nacked without calling `handleMessage`.

The default `nack` config is `{ allUpTo: false, requeue: true }`: a failed message goes back to the queue and is redelivered immediately. Pass `requeue: false` to drop it, or to send it to a dead letter exchange if the queue has one.

Do not catch errors in `handleMessage` only to log them: the message is then acked and lost. The consumer already logs every failed message. Catch a specific error only when you deliberately want to ack and skip the message, and rethrow everything else.

## Retrying transient errors
To keep a message while a dependency (e.g. a database) is down, override two methods:
- `isRetryableError(error)` returns `true` for transient errors. Such a message is neither acked nor nacked: the consumer waits and calls `handleMessage` again.
- `isReady()` returns `true` when the dependency is available. Before every attempt, including the first one, the consumer checks it every `retryIntervalMs` until it returns `true`. If `isReady()` throws, the error is logged and the consumer keeps waiting.

```typescript
class ConsumerExample extends BaseConsumer {
  isRetryableError(error: unknown) {
    return error instanceof MongoNetworkError;
  }

  async isReady() {
    return mongoose.connection.readyState === 1;
  }

  async handleMessage(message: any) {
    await Model.create(message);
  }
}
```

Notes:
- Use `prefetch: 1`. With `prefetch: 0` the broker keeps delivering messages while the consumer waits.
- If the process is killed while waiting, the message stays unacknowledged and the broker redelivers it.
- If the channel reconnects while waiting, the broker has already requeued the message, so the consumer stops waiting and drops this delivery without ack or nack.
- `retryIntervalMs` in the config (1000 ms by default) is the pause between readiness checks and between attempts.
- Errors thrown by `onMessageSuccess` and `onMessageError` are logged and do not affect ack/nack.

## Producer
A producer can be used in two ways.

| | Sending on demand | One-shot run |
| --- | --- | --- |
| When to use | a service publishes a message on every event (request, job, consumed message) | a script or a scheduled job connects, publishes a batch and exits |
| Start | `await producer.ensureConnection()` before sending | `await producer.run()` |
| What you implement | nothing | `publish()` with the batch logic |
| Sending | `await producer.send(payload)` from your code | `await this.send(payload)` inside `publish()` |
| Connection | stays open and is reused by every `send()` | `run()` connects, calls `publish()`, then closes the connection |

In both modes send messages with `send(payload, { exchange, routingKey })`:
- pass a plain object: `send()` serializes it to JSON itself, so do not call `JSON.stringify` or `Buffer.from`;
- `exchange` and `routingKey` default to the ones from the config;
- it returns `true` when the message is published and `false` on error. On error it logs the error and calls `onSendError`, it never throws.

### Sending on demand
```typescript
import { BaseProducer, BaseProducerConfig } from 'amqplib-base-adapter';

const ProducerExampleConfig: BaseProducerConfig = {
  exchange: 'example_exchange',
  exchangeType: 'topic',
  routingKey: 'example_route',
  rmq: {
    host: env.RMQ_CLUSTER_ADDRESS,
    password: env.RMQ_CLUSTER_PASSWORD,
    port: env.RMQ_CLUSTER_PORT,
    username: env.RMQ_CLUSTER_USERNAME,
  },
  environment: env.ENVIRONMENT,
};

class EventsProducer extends BaseProducer {
  async onSendError(error: unknown) {
    this.logger.error('[EventsProducer] send failed', { error });
  }
}

const eventsProducer = new EventsProducer(ProducerExampleConfig);

async function onUserCreated(userId: number) {
  await eventsProducer.ensureConnection();
  const sent = await eventsProducer.send({ event: 'user_created', userId });

  if (!sent) {
    throw new Error(`user_created event for user ${userId} was not published`);
  }
}
```

`publish()` is not needed here. Its default implementation throws, so calling `run()` on such a producer fails with a clear error instead of silently doing nothing.

### One-shot run
```typescript
class ProducerExample extends BaseProducer {
  async publish() {
    const sent = await this.send({ test: 'testdata1' });
    this.logger.info('[ProducerExample] publish result', { sent });
  }

  async onSendError(error: unknown) {
    this.logger.error('[ProducerExample] send failed', { error });
  }

  onClose() {
    this.logger.error('[ProducerExample] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[ProducerExample] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[ProducerExample] Connection failed:', error);
  }

  onBlocked(error: Error) {
    this.logger.error('[ProducerExample] Connection blocked:', error);
  }

  onDisconnected(error: Error) {
    this.logger.error('[ProducerExample] Connection disconnected:', error);
  }
}

const producerExample = new ProducerExample(ProducerExampleConfig);
void producerExample.run();
```

## Tests
```bash
yarn test
```

Tests use the built-in `node:test` runner and do not need a running RabbitMQ.
