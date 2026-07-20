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

  async establishConnection({ exchange, exchangeType, durable = true }: { exchange?: string, exchangeType?: string, durable?: boolean } = {}): Promise<void> {
    this.connect();

    if (!this.connection || !this.channel) {
      return;
    }

    await this.channel.waitForConnect();
    await this.channel.assertExchange(
      exchange ?? this.exchange,
      exchangeType ?? this.exchangeType,
      { durable: Boolean(durable) },
    );

    this.logger.info(`Exchange ${this.exchange} asserted`);
  }

  async ensureConnection({ exchange, exchangeType, durable = true }: { exchange?: string, exchangeType?: string, durable?: boolean } = {}): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    return this.establishConnection({ exchange, exchangeType, durable });
  }

  // single send
  async run(): Promise<void> {
    await this.establishConnection();
    await this.publish();
    await this.stop();
  }

  abstract publish(): Promise<void>;

  async onSendError(error: unknown): Promise<void> {
    return;
  }

  async send(payload: any, {exchange, routingKey}: {exchange?: string, routingKey?: string} = {}): Promise<boolean> {
    try {
      const message = Buffer.from(JSON.stringify(payload));
      if (message) {
        await this.channel?.publish(exchange ?? this.exchange, routingKey ?? this.routingKey, message);
      }

      return true;
    } catch (error) {
      this.logger.error(error);
      await this.onSendError(error);
      return false;
    }
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

export { BaseProducer }

export type { BaseProducerConfig };
