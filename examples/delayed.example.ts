import { BaseConsumer, BaseConsumerConfig } from '../src/base.consumer';
import { BaseDelayed, BaseDelayedConfig } from '../src/base.delayed';
import { BaseProducer, BaseProducerConfig } from '../src/base.producer';
import { env } from './config';

const rmq = {
  host: env.RMQ_CLUSTER_ADDRESS,
  password: env.RMQ_CLUSTER_PASSWORD,
  port: env.RMQ_CLUSTER_PORT,
  username: env.RMQ_CLUSTER_USERNAME,
};

export const DelayedExampleConfig: BaseDelayedConfig = {
  exchange: 'delay.exchange',
  exchangeType: 'direct',
  deadLetterExchange: 'example_exchange',
  deadLetterExchangeType: 'topic',
  deadLetterRoutingKey: 'example_route',
  queues: [
    { queue: 'delay.1m', routingKey: 'delay.1m', delayMs: 60_000 },
    { queue: 'delay.2m', routingKey: 'delay.2m', delayMs: 120_000 },
    { queue: 'delay.3m', routingKey: 'delay.3m', delayMs: 180_000 },
  ],
  rmq,
  environment: env.ENVIRONMENT,
};

const DelayedProducerConfig: BaseProducerConfig = {
  exchange: 'delay.exchange',
  exchangeType: 'direct',
  routingKey: 'delay.1m',
  rmq,
  environment: env.ENVIRONMENT,
};

const DelayedConsumerConfig: BaseConsumerConfig = {
  queue: 'example.queue',
  exchange: 'example_exchange',
  exchangeType: 'topic',
  routingKey: 'example_route',
  prefetch: 1,
  rmq,
  environment: env.ENVIRONMENT,
  nack: {
    allUpTo: false,
    requeue: false,
  },
};

class DelayedExample extends BaseDelayed {
  onClose() {
    this.logger.error('[DelayedExample] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[DelayedExample] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[DelayedExample] Connection failed:', error);
  }
}

class DelayedConsumerExample extends BaseConsumer {
  async handleMessage(message: any) {
    try {
      this.logger.info('[DelayedConsumerExample] received after delay', message);
    } catch (err) {
      this.logger.error('[DelayedConsumerExample] error handle message', err);
    }
  }

  onClose() {
    this.logger.error('[DelayedConsumerExample] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[DelayedConsumerExample] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[DelayedConsumerExample] Connection failed:', error);
  }
}

class DelayedProducerExample extends BaseProducer {
  async publish() {
    for (const queue of DelayedExampleConfig.queues) {
      const result = await this.send({ test: queue.routingKey }, {
        exchange: 'delay.exchange',
        routingKey: queue.routingKey,
      });
      this.logger.info('[DelayedProducerExample] publish result: ', { result });
    }
  }

  onClose() {
    this.logger.error('[DelayedProducerExample] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[DelayedProducerExample] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[DelayedProducerExample] Connection failed:', error);
  }
}

async function main() {
  const delayedExample = new DelayedExample(DelayedExampleConfig);
  await delayedExample.run();

  const delayedConsumerExample = new DelayedConsumerExample(DelayedConsumerConfig);
  await delayedConsumerExample.run();

  const delayedProducerExample = new DelayedProducerExample(DelayedProducerConfig);
  await delayedProducerExample.run();
}

void main();
