import { BaseProducer } from '../src'
import { env } from './config';

const express = require('express')
const app = express()

export const producerExampleConfig = {
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

class MyProducer extends BaseProducer {
  async publish() {
    try {
      const message: Buffer = Buffer.from(JSON.stringify({
        test: 'testdata2',
      }));

      const result = this.channel?.publish(this.exchange, this.routingKey, message);
      this.logger.info('[MyProducer] publish result: ', { result, message, r: this.routingKey, e: this.exchange });
    } catch (error) {
      this.logger.error('[MyProducer] error publish messages', error);
    }
  }

  onClose() {
    this.logger.error('[MyProducer] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[MyProducer] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[MyProducer] Connection failed:', error);
  }
}

app.get('/', async function (req: any, res: any) {
  const my = new MyProducer(producerExampleConfig);
  const result = await my.run();
  res.send('Hello World')
})

app.listen(3018, () => console.log('listening on http://localhost:3018'))
