import { Channel, connect, Connection } from 'amqplib';
import { createLogger, format, Logger, transports } from 'winston';

type Rmq = {
  host: string,
  port: number,
  username: string,
  password: string,
};

interface BaseProducerConfig {
  exchange: string,
  exchangeType: string,
  routingKey: string,
  rmq: Rmq,
  environment?: string,
}

abstract class BaseProducer {
  private readonly exchangeType: string;

  private connection?: Connection;

  protected readonly exchange: string;

  protected readonly routingKey: string;

  protected channel?: Channel;

  protected logger: Logger;

  private readonly rmq: Rmq;

   constructor(config: BaseProducerConfig) {
    this.exchange = config.exchange;
    this.exchangeType = config.exchangeType;
    this.routingKey = config.routingKey;
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

    await this.channel.assertExchange(
      this.exchange,
      this.exchangeType,
      { durable: true },
    );

    this.logger.info(`Exchange ${this.exchange} asserted`);

    await this.publish();

    await this.channel.close();
    await this.connection.close();
  }

  abstract publish(): Promise<void>;
}


export { BaseProducer }

export type { BaseProducerConfig };
