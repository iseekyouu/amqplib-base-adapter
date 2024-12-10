import { Connector, ConnectorConfig } from './connector';

interface BaseProducerConfig extends ConnectorConfig {
  exchange: string,
  exchangeType: string,
  routingKey: string,
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

  async establishConnection(): Promise<void> {
    await this.connect();

    if (!this.connection || !this.channel) {
      return;
    }

    await this.channel.assertExchange(
      this.exchange,
      this.exchangeType,
      { durable: true },
    );

    this.logger.info(`Exchange ${this.exchange} asserted`);
  }

  async run(): Promise<void> {
    await this.establishConnection();
    await this.publish();
    await this.stop();
  }

  abstract publish(): Promise<void>;

  async send(payload: string): Promise<void> {
    try {
      const message = Buffer.from(JSON.stringify(payload));
      if (message) {
        await this.channel?.publish(this.exchange, this.routingKey, message);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

export { BaseProducer }

export type { BaseProducerConfig };
