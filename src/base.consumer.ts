import { setTimeout as sleep } from 'timers/promises';
import { Channel } from 'amqp-connection-manager';
import { Connector, ConnectorConfig } from './connector';
import { ConsumeMessage } from 'amqplib';

type Nack = {
  allUpTo: boolean,
  requeue: boolean,
}

interface BaseConsumerConfig extends ConnectorConfig {
  queue: string,
  exchange: string,
  exchangeType: string,
  routingKey: string,
  prefetch: number
  nack?: Nack,
  retryIntervalMs?: number,
}

abstract class BaseConsumer extends Connector {
  private readonly queue: string;

  private readonly exchange: string;

  private readonly exchangeType: string;

  private readonly routingKey: string;

  private readonly prefetch: number;

  public nack: Nack;

  protected readonly retryIntervalMs: number;

  protected channelGeneration = 0;

  private static readonly retryLogIntervalMs = 60_000;

  constructor(config: BaseConsumerConfig) {
    super(config);
    this.queue = config.queue;
    this.exchange = config.exchange;
    this.exchangeType = config.exchangeType;
    this.routingKey = config.routingKey;
    this.prefetch = config.prefetch;
    this.nack = config.nack || {
      allUpTo: false,
      requeue: true,
    };
    this.retryIntervalMs = config.retryIntervalMs ?? 1000;
  }

  async run(): Promise<void> {
    this.connect();

    if (!this.connection || !this.channel) {
      process.exit(1);
    }

    await this.channel.addSetup(async (ch: Channel) => {
      this.channelGeneration += 1;

      return Promise.all([
        ch.assertQueue(this.queue, {
          arguments: {
            durable: true,
            'x-queue-type': 'quorum',
          },
        }),
        ch.assertExchange(this.exchange, this.exchangeType, { durable: true }),
        ch.prefetch(this.prefetch ? 1 : 0),
        ch.bindQueue(
          this.queue,
          this.exchange,
          this.routingKey,
        ),
        ch.consume(
          this.queue,
          (message) => { void this.onMessage(message); },
        ),
      ]);
    });
  }

  isRetryableError(error: unknown, attempt: number): boolean {
    return false;
  }

  async isReady(): Promise<boolean> {
    return true;
  }

  async onMessageSuccess(message: ConsumeMessage): Promise<void> {
    return;
  }

  async onMessageError(message: ConsumeMessage, error: unknown): Promise<void> {
    return;
  }

  async onMessage(message: ConsumeMessage | null) {
    if (message === null) {
      return;
    }

    if (!this.channel) {
      return;
    }

    const generation = this.channelGeneration;
    let content: unknown;

    try {
      content = JSON.parse(message.content.toString());
    } catch (err) {
      await this.rejectMessage(message, err, generation);
      return;
    }

    this.logger.debug(JSON.stringify(content), {
      type: 'amqp-message',
      exchange: this.exchange,
      queue: this.queue,
      routingKey: this.routingKey,
    });

    let attempt = 0;
    let lastRetryLogAt = 0;

    while (await this.waitUntilReady(generation)) {
      attempt += 1;

      try {
        await this.handleMessage(content, message);
      } catch (err) {
        if (generation !== this.channelGeneration) {
          return;
        }
        if (!this.isRetryableError(err, attempt)) {
          await this.rejectMessage(message, err, generation);
          return;
        }
        if (Date.now() - lastRetryLogAt >= BaseConsumer.retryLogIntervalMs) {
          lastRetryLogAt = Date.now();
          this.logRetry(message, err, attempt);
        }
        await sleep(this.retryIntervalMs);
        continue;
      }

      if (generation === this.channelGeneration) {
        this.channel.ack(message);
        await this.runHook('onMessageSuccess', () => this.onMessageSuccess(message));
      }
      return;
    }
  }

  private async waitUntilReady(generation: number): Promise<boolean> {
    while (generation === this.channelGeneration) {
      if (await this.checkReady()) {
        return generation === this.channelGeneration;
      }
      await sleep(this.retryIntervalMs);
    }
    return false;
  }

  private async checkReady(): Promise<boolean> {
    try {
      return await this.isReady();
    } catch (err: any) {
      this.logger.error(err, {
        type: 'amqp-ready-check-failed',
        queue: this.queue,
      });
      return false;
    }
  }

  async stop(): Promise<void> {
    this.channelGeneration += 1;
    await this.channel?.close();
    await this.connection?.close();
  }

  private logRetry(message: ConsumeMessage, error: any, attempt: number): void {
    this.logger.error(error, {
      type: 'amqp-message-retry',
      attempt,
      exchange: this.exchange,
      queue: this.queue,
      routingKey: this.routingKey,
      content: message.content.toString(),
    });
  }

  private async rejectMessage(message: ConsumeMessage, error: any, generation: number): Promise<void> {
    this.logger.error(error, {
      exchange: this.exchange,
      queue: this.queue,
      routingKey: this.routingKey,
      content: message.content.toString(),
    });

    if (generation !== this.channelGeneration) {
      return;
    }

    this.channel?.nack(message, this.nack.allUpTo, this.nack.requeue);
    await this.runHook('onMessageError', () => this.onMessageError(message, error));
  }

  private async runHook(name: string, hook: () => Promise<void>): Promise<void> {
    try {
      await hook();
    } catch (err: any) {
      this.logger.error(err, {
        type: 'amqp-hook-failed',
        hook: name,
        queue: this.queue,
      });
    }
  }

  abstract handleMessage(content: unknown, message: ConsumeMessage): Promise<void>;
}

export { BaseConsumer };

export type { BaseConsumerConfig, ConsumeMessage as Message };
