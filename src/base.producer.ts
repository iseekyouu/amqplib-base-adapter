import { Channel, connect, Connection } from 'amqplib';
import { Connector } from './connector';
import { createLogger, format, Logger, transports } from 'winston';
import { Rmq } from './types';

interface BaseProducerConfig {
  exchange: string,
  exchangeType: string,
  routingKey: string,
  rmq: Rmq,
  environment?: string,
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
    await this.createConnection();
    await this.createChannel();

    await this.channel.assertExchange(
      this.exchange,
      this.exchangeType,
      { durable: true },
    );

    this.logger.info(`Exchange ${this.exchange} asserted`);

    await this.publish();

    await this.channel.close();
    await this.connection?.close();
  }

  abstract publish(): Promise<void>;
}

export { BaseProducer }

export type { BaseProducerConfig };
