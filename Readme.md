# Overview
Base adapter for [amqplib](https://www.npmjs.com/package/amqplib)

With all connection logic and logs!

As logger it uses winston.

You can find producer, consumer and queue examples in /examples directory

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

## Consumer example
```typescript
const ConsumerExampleConfig: BaseConsumerConfig = {
  queue: 'example.queue',
  exchange: 'example_exchange',
  exchangeType: 'topic',
  routingKey: 'example_route',
  prefetch: 1,
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
    try {
      this.logger.info({ message });
    } catch (err) {
      this.logger.error('[ConsumerExample] error handle message', err);
    }
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
}

const consumerExample = new ConsumerExample(ConsumerExampleConfig);
void consumerExample.run();
```

## Producer example
```typescript
const ProducerExampleConfig = {
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

class ProducerExample extends BaseProducer {
  async publish() {
    try {
    const message: Buffer = Buffer.from(JSON.stringify({
      test: 'testdata1',
    }));

    const result = this.channel?.publish(this.exchange, this.routingKey, message);
    this.logger.info('[ProducerExample] publish result: ', { result, message });
    } catch (error) {
      this.logger.error('[ProducerExample] error publish messages', error);
    }
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
}

const producerExample = new ProducerExample(ProducerExampleConfig);
void producerExample.run();

```

## Queue setup

`BaseQueue` asserts one exchange and one queue with custom `assertQueue` options, then binds them. It does not consume. `run()` declares topology and closes the connection. One instance per queue — create several instances for several queues.

Queues are durable quorum by default. Pass extra `arguments` (TTL, DLX, etc.) per queue. Use `extraExchanges` when a queue needs another exchange, for example a dead-letter exchange.

Delay queues are one use of the same API — one queue per TTL, do not mix different delays in the same queue.

```
BaseProducer.send
  -> delay.exchange
    -> delay.1h  (TTL 1h)
    -> delay.24h (TTL 24h)
    -> delay.3d  (TTL 3d)
      --expired DLX--> work exchange -> work queue
                                          -> BaseConsumer
```

```typescript
import { BaseQueue, BaseQueueConfig } from 'amqplib-base-adapter';

const Delay1hConfig: BaseQueueConfig = {
  queue: 'delay.1h',
  exchange: 'delay.exchange',
  exchangeType: 'direct',
  routingKey: 'delay.1h',
  extraExchanges: [
    { exchange: 'example_exchange', type: 'topic' },
  ],
  options: {
    arguments: {
      'x-message-ttl': 3_600_000,
      'x-dead-letter-exchange': 'example_exchange',
      'x-dead-letter-routing-key': 'example_route',
    },
  },
  rmq: {
    host: env.RMQ_CLUSTER_ADDRESS,
    password: env.RMQ_CLUSTER_PASSWORD,
    port: env.RMQ_CLUSTER_PORT,
    username: env.RMQ_CLUSTER_USERNAME,
  },
  environment: env.ENVIRONMENT,
};

const delay1h = new BaseQueue(Delay1hConfig);
await delay1h.run();

// later, with BaseProducer:
await producer.send(payload, {
  exchange: 'delay.exchange',
  routingKey: 'delay.1h',
});
```
