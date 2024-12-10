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

  async run(): Promise<void> {
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

    // await this.publish();
  }

  abstract publish(): Promise<void>;


  async start(): Promise<void> {
    return this.run();
  }

  async publish(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

export { BaseProducer }

export type { BaseProducerConfig };
