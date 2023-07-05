import {
  connect,
  Connection,
  Channel,
} from 'amqplib';
import { Logger, createLogger } from './logger';
import { Rmq } from './types';


interface ConnectorConfig {
  rmq: Rmq,
  environment?: string,
}

class Connector {
  protected logger: Logger;

  private readonly rmq: Rmq;

  environment?: string;

  protected connection: Connection | undefined;

  protected channel: Channel | any;

  errorCode = 'rabbit_connection_error';

  constructor(config: ConnectorConfig) {
    this.rmq = config.rmq;

    const level = config.environment === 'development' ?
      'debug' : 'error';

    this.logger = createLogger(level);
  }

  async connect() {
    await this.createConnection();
    await this.createChannel();
  }

  async createConnection(): Promise<void> {
    try {
      this.logger.info('[rabbitmq] Connected');
      const connection = await connect({
        protocol: 'amqp',
        hostname: this.rmq.host,
        port: this.rmq.port,
        username: this.rmq.username,
        password: this.rmq.password,
      });

      this.connection = connection;
    } catch (err) {
      this.logger.error('[rabbitmq] Connection failed', err);
      return;
    }
  }

  async createChannel() {
    if (this.connection) {
      this.channel = await this.connection.createChannel();
      this.logger.info('[rabbitmq] Channel created');
      return this.channel;
    }

    this.logger.error('[rabbitmq] must be connected');
  }
}


export { Connector };
