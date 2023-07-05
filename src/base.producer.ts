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
  reconnectDelay?: number,
}

async function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

abstract class BaseProducer extends Connector {
  private readonly exchangeType: string;

  protected readonly exchange: string;

  protected readonly routingKey: string;

  reconnectDelay;

  attemp = 0;

   constructor(config: BaseProducerConfig) {
    super(config);

    this.exchange = config.exchange;
    this.exchangeType = config.exchangeType;
    this.routingKey = config.routingKey;
    this.reconnectDelay = config.reconnectDelay || 10000;
  }

  async reconnect() {
    this.logger.error(`RMQ reconnecting, attemp ${this.attemp}`);
    this.connection = undefined;
    this.channel = undefined;

    await delay(this.reconnectDelay);
    this.attemp = this.attemp + 1;
    await this.connect();
  }

  onClose() {
    this.logger.error('RMQ connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('RMQ connection Error', error, { errorCode: this.errorCode });
  }

  async run(): Promise<void> {
    await this.connect();

    while (!this.connection) {
      await this.reconnect();
    }

    this.attemp = 0;

    this.connection.once('error', this.onError);
    this.connection.once('close', this.onClose);

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
