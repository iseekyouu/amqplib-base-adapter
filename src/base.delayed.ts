import { Connector, ConnectorConfig } from './connector';

interface DelayedQueueConfig {
  queue: string,
  routingKey: string,
  delayMs: number,
}

interface BaseDelayedConfig extends ConnectorConfig {
  exchange: string,
  exchangeType: string,
  deadLetterExchange?: string,
  deadLetterExchangeType?: string,
  deadLetterRoutingKey: string,
  queues: DelayedQueueConfig[],
}

class BaseDelayed extends Connector {
  private readonly exchange: string;

  private readonly exchangeType: string;

  private readonly deadLetterExchange: string;

  private readonly deadLetterExchangeType: string;

  private readonly deadLetterRoutingKey: string;

  private readonly queues: DelayedQueueConfig[];

  constructor(config: BaseDelayedConfig) {
    super(config);
    this.exchange = config.exchange;
    this.exchangeType = config.exchangeType;
    this.deadLetterExchange = config.deadLetterExchange || '';
    this.deadLetterExchangeType = config.deadLetterExchangeType || 'direct';
    this.deadLetterRoutingKey = config.deadLetterRoutingKey;
    this.queues = config.queues;
  }

  async establishConnection(): Promise<void> {
    this.connect();

    if (!this.connection || !this.channel) {
      return;
    }

    await this.channel.waitForConnect();
    await this.channel.assertExchange(this.exchange, this.exchangeType, { durable: true });

    if (this.deadLetterExchange) {
      await this.channel.assertExchange(
        this.deadLetterExchange,
        this.deadLetterExchangeType,
        { durable: true },
      );
    }

    await Promise.all(this.queues.map((queue) => this.setupDelayQueue(queue)));

    this.logger.info('[BaseDelayed] Delay queues asserted', {
      exchange: this.exchange,
      deadLetterExchange: this.deadLetterExchange,
      queues: this.queues.map((queue) => queue.queue),
    });
  }

  async run(): Promise<void> {
    await this.establishConnection();
    await this.stop();
  }

  private async setupDelayQueue(queue: DelayedQueueConfig): Promise<void> {
    if (!this.channel) {
      return;
    }

    await this.channel.assertQueue(queue.queue, {
      durable: true,
      arguments: {
        'x-queue-type': 'quorum',
        'x-message-ttl': queue.delayMs,
        'x-dead-letter-exchange': this.deadLetterExchange,
        'x-dead-letter-routing-key': this.deadLetterRoutingKey,
      },
    });
    await this.channel.bindQueue(queue.queue, this.exchange, queue.routingKey);
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

export { BaseDelayed };

export type { BaseDelayedConfig, DelayedQueueConfig };
