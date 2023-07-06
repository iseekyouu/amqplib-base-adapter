import { Connector } from './connector';
import { Rmq } from './types';

interface BaseProducerConfig {
  exchange: string,
  exchangeType: string,
  routingKey: string,
  rmq: Rmq,
  environment?: string,
  reconnectDelay?: number,
}

abstract class BaseProducer extends Connector {
  private readonly exchangeType: string;

  protected readonly exchange: string;

  protected readonly routingKey: string;
  constructor(config: BaseProducerConfig) {
    super(config);

    this.exchange = config.exchange;
    this.exchangeType = config.exchangeType;
    this.routingKey = config.routingKey;
  }

  onClose() {
    this.logger.error('RMQ connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('RMQ connection Error', error, { errorCode: this.errorCode });
  }

  async run(): Promise<void> {
    await this.connect();

    if (!this.connection || !this.channel) {
      return;
    }

    this.connection.once('error', this.onError.bind(this));
    this.connection.once('close', this.onClose.bind(this));

    await this.channel.assertExchange(
      this.exchange,
      this.exchangeType,
      { durable: true },
    );

    this.logger.info(`Exchange ${this.exchange} asserted`);

    await this.publish();
  }

  abstract publish(): Promise<void>;
}

export { BaseProducer }

export type { BaseProducerConfig };
