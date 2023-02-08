import {
  Channel,
  connect,
  Connection,
  Message,
  Replies,
} from 'amqplib';
import {
  createLogger,
  format,
  Logger,
  transports,
} from 'winston';
import Consume = Replies.Consume;

type Rmq = {
  host: string,
  port: number,
  username: string,
  password: string,
};

interface BaseConsumerConfig {
  queue: string,
  exchange: string,
  exchangeType: string,
  routingKey: string,
  prefetch: number
  rmq: Rmq,
  environment?: string,
}

abstract class BaseConsumer {
  private readonly queue: string;

  private readonly exchange: string;

  private readonly exchangeType: string;

  private readonly routingKey: string;

  private readonly prefetch: number;

  private readonly rmq: Rmq;

  private connection: Connection | undefined;

  private channel: Channel | any;

  protected logger: Logger;

  constructor(config: BaseConsumerConfig) {
    this.queue = config.queue;
    this.exchange = config.exchange;
    this.exchangeType = config.exchangeType;
    this.routingKey = config.routingKey;
    this.prefetch = config.prefetch;
    this.rmq = config.rmq;

    const level = config.environment === 'development' ?
      'debug' : 'error';

    this.logger = createLogger({
      level,
      format: format.combine(
        format.errors({ stack: true }),
        format.metadata(),
        format.timestamp(),
        format.json(),
      ),
      exitOnError: false,
      transports: [
        new transports.Console(),
      ],
    });
  }

  async getConnection(): Promise<Connection> {
    try {
      this.logger.info('[rabbitmq] Connected');
      return await connect({
        protocol: 'amqp',
        hostname: this.rmq.host,
        port: this.rmq.port,
        username: this.rmq.username,
        password: this.rmq.password,
      });
    } catch (err) {
      this.logger.error('[rabbitmq] Connection failed', err);
      return this.getConnection();
    }
  }

  async run(): Promise<void> {
    this.connection = await this.getConnection();
    this.connection.on('error', (error: any) => {
      this.logger.error(error);
      process.exit(1);
    });

    this.channel = await this.connection.createChannel();
    this.logger.info('[rabbitmq] Channel created');

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

  async consume(): Promise<Consume> {
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

        await this.channel.nack(message);
      }
    });
  }

  abstract handleMessage(content: unknown, message: Message): Promise<void>;
}

export { BaseConsumer };

export type { BaseConsumerConfig, Message };
