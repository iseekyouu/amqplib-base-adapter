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
}

abstract class BaseConsumer extends Connector {
  private readonly queue: string;

  private readonly exchange: string;

  private readonly exchangeType: string;

  private readonly routingKey: string;

  private readonly prefetch: number;

  public nack: Nack;

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
  }

  async run(): Promise<void> {
    await this.connect();

    if (!this.connection || !this.channel) {
      process.exit(1);
    }

    await this.channel.addSetup(async (ch: Channel) => Promise.all([
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
        this.onMessage.bind(this) as any,
      ),
    ]));
  }

  async onMessage(message: ConsumeMessage) {
    if (message === null) {
      return;
    }

    if (!this.channel) {
      return;
    }

    try {
      const content = JSON.parse(message.content.toString());
      this.logger.debug(JSON.stringify(content), {
        type: 'amqp-message',
        exchange: this.exchange,
        queue: this.queue,
        routingKey: this.routingKey,
      });

      await this.handleMessage(content, message);
      await this.channel.ack(message);
    } catch (err: any) {
      this.logger.error(err, {
        exchange: this.exchange,
        queue: this.queue,
        routingKey: this.routingKey,
        content: message.content.toString(),
      });

      await this.channel.nack(message, this.nack.allUpTo, this.nack.requeue);
    }
  }

  abstract handleMessage(content: unknown, message: ConsumeMessage): Promise<void>;
}

export { BaseConsumer };

export type { BaseConsumerConfig, ConsumeMessage as Message };
