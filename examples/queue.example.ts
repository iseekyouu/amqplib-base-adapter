import { BaseConsumer, BaseConsumerConfig } from '../src/base.consumer';
import { BaseQueue, BaseQueueConfig } from '../src/base.queue';
import { BaseProducer, BaseProducerConfig } from '../src/base.producer';
import { env } from './config';

const rmq = {
  host: env.RMQ_CLUSTER_ADDRESS,
  password: env.RMQ_CLUSTER_PASSWORD,
  port: env.RMQ_CLUSTER_PORT,
  username: env.RMQ_CLUSTER_USERNAME,
};

const FINISH_EXCHANGE = 'example_exchange'
const FINISH_EXCHANGE_TYPE = 'topic'
const FINISH_ROUTING_KEY = 'example_route'

const extraExchanges = [
  { exchange: FINISH_EXCHANGE, type: FINISH_EXCHANGE_TYPE },
];

export const QueueExampleConfigs: BaseQueueConfig[] = [
  {
    queue: 'delay.1m',
    exchange: 'delay.exchange',
    exchangeType: 'topic',
    routingKey: 'delay.1m',
    extraExchanges,
    options: {
      arguments: {
        'x-message-ttl': 60_000,
        'x-dead-letter-exchange': FINISH_EXCHANGE,
        'x-dead-letter-routing-key': FINISH_ROUTING_KEY,
      },
    },
    rmq,
    environment: env.ENVIRONMENT,
  },
  {
    queue: 'delay.2m',
    exchange: 'delay.exchange',
    exchangeType: 'topic',
    routingKey: 'delay.2m',
    extraExchanges,
    options: {
      arguments: {
        'x-message-ttl': 120_000,
        'x-dead-letter-exchange': FINISH_EXCHANGE,
        'x-dead-letter-routing-key': FINISH_ROUTING_KEY,
      },
    },
    rmq,
    environment: env.ENVIRONMENT,
  },
  {
    queue: 'delay.3m',
    exchange: 'delay.exchange',
    exchangeType: 'topic',
    routingKey: 'delay.3m',
    extraExchanges,
    options: {
      arguments: {
        'x-message-ttl': 180_000,
        'x-dead-letter-exchange': FINISH_EXCHANGE,
        'x-dead-letter-routing-key': FINISH_ROUTING_KEY,
      },
    },
    rmq,
    environment: env.ENVIRONMENT,
  },
];

const QueueProducerConfig: BaseProducerConfig = {
  exchange: 'delay.exchange',
  exchangeType: 'topic',
  routingKey: 'delay.1m',
  rmq,
  environment: env.ENVIRONMENT,
};

const QueueConsumerConfig: BaseConsumerConfig = {
  queue: 'example.queue',
  exchange: FINISH_EXCHANGE,
  exchangeType: FINISH_EXCHANGE_TYPE,
  routingKey: FINISH_ROUTING_KEY,
  prefetch: 1,
  rmq,
  environment: env.ENVIRONMENT,
  nack: {
    allUpTo: false,
    requeue: false,
  },
};

class QueueExample extends BaseQueue {
  onClose() {
    this.logger.error('[QueueExample] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[QueueExample] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[QueueExample] Connection failed:', error);
  }
}

class QueueConsumerExample extends BaseConsumer {
  async handleMessage(message: any) {
    try {
      this.logger.info('[QueueConsumerExample] received after delay', message);
    } catch (err) {
      this.logger.error('[QueueConsumerExample] error handle message', err);
    }
  }

  onClose() {
    this.logger.error('[QueueConsumerExample] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[QueueConsumerExample] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[QueueConsumerExample] Connection failed:', error);
  }
}

class QueueProducerExample extends BaseProducer {
  async publish() {
    for (const config of QueueExampleConfigs) {
      const result = await this.send({ test: config.routingKey }, {
        exchange: config.exchange,
        routingKey: config.routingKey,
      });
      this.logger.info('[QueueProducerExample] publish result: ', { result });
    }
  }

  onClose() {
    this.logger.error('[QueueProducerExample] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[QueueProducerExample] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[QueueProducerExample] Connection failed:', error);
  }
}

async function main() {
  for (const config of QueueExampleConfigs) {
    const queueExample = new QueueExample(config);
    await queueExample.run();
  }

  const queueConsumerExample = new QueueConsumerExample(QueueConsumerConfig);
  await queueConsumerExample.run();

  const queueProducerExample = new QueueProducerExample(QueueProducerConfig);
  await queueProducerExample.run();
}

void main();
