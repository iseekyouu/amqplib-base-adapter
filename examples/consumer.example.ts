import { BaseConsumer, BaseConsumerConfig } from '../src/base.consumer';
import { env } from './config';

export const ConsumerExampleConfig: BaseConsumerConfig = {
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
  nack: {
    allUpTo: false,
    requeue: false,
  }
};

class ConsumerExample extends BaseConsumer {
  async handleMessage(message: any) {
    try {
      this.logger.info({ message });
    } catch (err) {
      this.logger.error('[ConsumerExample] Reactivation consumer error handle message', err);
    }
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[ConsumerExample] Connection failed:', error);
  }
}

const consumerExample = new ConsumerExample(ConsumerExampleConfig);
void consumerExample.run();
