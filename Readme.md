# Overview
Base adapter for [amqplib](https://www.npmjs.com/package/amqplib)

With all connection logic and logs!

As logger it uses winston.

You can find producer, consumer and delayed queue examples in /examples directory

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

## Delayed queues

`BaseDelayed` asserts TTL + Dead Letter queues for fixed delay slots. After TTL expires, RabbitMQ dead-letters the message to the work exchange. Send with `BaseProducer`, consume with `BaseConsumer`.

One delay queue per TTL — do not mix different delays in the same queue.

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
import { BaseDelayed, BaseDelayedConfig } from 'amqplib-base-adapter';

const DelayedExampleConfig: BaseDelayedConfig = {
  exchange: 'delay.exchange',
  exchangeType: 'direct',
  deadLetterExchange: 'example_exchange',
  deadLetterExchangeType: 'topic',
  deadLetterRoutingKey: 'example_route',
  queues: [
    { queue: 'delay.1h', routingKey: 'delay.1h', delayMs: 3_600_000 },
    { queue: 'delay.24h', routingKey: 'delay.24h', delayMs: 86_400_000 },
    { queue: 'delay.3d', routingKey: 'delay.3d', delayMs: 259_200_000 },
  ],
  rmq: {
    host: env.RMQ_CLUSTER_ADDRESS,
    password: env.RMQ_CLUSTER_PASSWORD,
    port: env.RMQ_CLUSTER_PORT,
    username: env.RMQ_CLUSTER_USERNAME,
  },
  environment: env.ENVIRONMENT,
};

const delayed = new BaseDelayed(DelayedExampleConfig);
await delayed.run();

// later, with BaseProducer:
await producer.send(payload, {
  exchange: 'delay.exchange',
  routingKey: 'delay.1h',
});
```
