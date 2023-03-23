# Overview
Base adapter for [amqplib](https://www.npmjs.com/package/amqplib)

With all connection logic and logs!

As logger it uses winston.


You can find producer and consumer example in /examples directory

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

    const result = this.channel?.publish(this.exchange, this.routingKey, message) as boolean;
    this.logger.info('[rabbitmq] publish result: ', { result, message });
    } catch (error) {
      this.logger.error('[ProducerExample] error publish messages', error);
    }
  }
}

const producerExample = new ProducerExample(ProducerExampleConfig);
void producerExample.run();

```
