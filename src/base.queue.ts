import { Options } from 'amqplib';
import { Connector, ConnectorConfig } from './connector';

interface ExchangeConfig {
  exchange: string,
  type: string,
  durable?: boolean,
}

interface BaseQueueConfig extends ConnectorConfig {
  queue: string,
  exchange: string,
  exchangeType: string,
  routingKey: string,
  options?: Options.AssertQueue,
  extraExchanges?: ExchangeConfig[],
}

class BaseQueue extends Connector {
  private readonly queue: string;

  private readonly exchange: string;

  private readonly exchangeType: string;

  private readonly routingKey: string;

  private readonly extraExchanges: ExchangeConfig[];

  private readonly options?: Options.AssertQueue;

  constructor(config: BaseQueueConfig) {
    super(config);
    this.queue = config.queue;
    this.exchange = config.exchange;
    this.exchangeType = config.exchangeType;
    this.routingKey = config.routingKey;
    this.extraExchanges = config.extraExchanges || [];
    this.options = config.options;
  }

  async establishConnection(): Promise<void> {
    this.connect();

    if (!this.connection || !this.channel) {
      return;
    }

    await this.channel.waitForConnect();
    await this.channel.assertExchange(this.exchange, this.exchangeType, { durable: true });

    await Promise.all(this.extraExchanges.map((extra) => this.assertExtraExchange(extra)));
    
    await this.channel.assertQueue(this.queue, {
      durable: true,
      ...this.options,
      arguments: {
        'x-queue-type': 'quorum',
        ...this.options?.arguments,
      },
    });
    await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);

    this.logger.info('[BaseQueue] Queue asserted', {
      queue: this.queue,
      exchange: this.exchange,
      routingKey: this.routingKey,
      extraExchanges: this.extraExchanges.map((extra) => extra.exchange),
    });
  }

  async run(): Promise<void> {
    await this.establishConnection();
    await this.stop();
  }

  private async assertExtraExchange(extra: ExchangeConfig): Promise<void> {
    if (!this.channel) {
      return;
    }

    await this.channel.assertExchange(extra.exchange, extra.type, {
      durable: extra.durable ?? true,
    });
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

export { BaseQueue };

export type { BaseQueueConfig, ExchangeConfig };
