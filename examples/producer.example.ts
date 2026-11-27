import { BaseProducer, BaseProducerConfig } from '../src/base.producer';
import { env } from './config';

export const ProducerExampleConfig: BaseProducerConfig = {
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
