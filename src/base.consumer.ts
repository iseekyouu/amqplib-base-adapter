import {
  Message,
  Replies,
} from 'amqplib';
import { Connector } from './connector';
import { createLogger, Logger } from './logger';
import { Rmq } from './types';

type Nack = {
  allUpTo: boolean,
  requeue: boolean,
}

interface BaseConsumerConfig {
  queue: string,
  exchange: string,
  exchangeType: string,
  routingKey: string,
  prefetch: number
  rmq: Rmq,
  environment?: string,
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
    await this.createConnection();
    await this.createChannel();

    if (this.prefetch) {
      await this.channel.prefetch(this.prefetch);
    }

    await this.channel.assertExchange(
      this.exchange,
      this.exchangeType,
      { durable: true },
    );
    this.logger.info(`Exchange ${this.exchange} asserted`);

    await this.channel.assertQueue(this.queue, {
      arguments: {
        durable: true,
        'x-queue-type': 'quorum',
      },
    });
    this.logger.info(`Queue ${this.queue} asserted`);

    await this.channel.bindQueue(
      this.queue,
      this.exchange,
      this.routingKey,
    );
    this.logger.info(`${this.queue} bound to ${this.exchange}`);

    await this.consume();
  }

  async consume(): Promise<Replies.Consume> {
    return this.channel.consume(this.queue, async (message: Message) => {
      if (message === null) {
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
    });
  }

  abstract handleMessage(content: unknown, message: Message): Promise<void>;
}

export { BaseConsumer };

export type { BaseConsumerConfig, Message };
