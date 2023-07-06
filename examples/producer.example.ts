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
    try {
    const message: Buffer = Buffer.from(JSON.stringify({
      test: 'testdata1',
    }));

    const result = this.channel?.publish(this.exchange, this.routingKey, message);
    this.logger.info('[rabbitmq] publish result: ', { result, message });
    } catch (error) {
      this.logger.error('[ProducerExample] error publish messages', error);
    }
  }
}

const producerExample = new ProducerExample(ProducerExampleConfig);
void producerExample.run();
