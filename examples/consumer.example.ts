import { BaseConsumer, BaseConsumerConfig, Message } from '../src/base.consumer';
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
  },
  retryIntervalMs: 5000,
};

const isDatabaseAvailable = async (): Promise<boolean> => true;

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
