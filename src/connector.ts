import ampq, { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
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

  protected connection: AmqpConnectionManager | null = null;

  protected channel: ChannelWrapper | null = null;

  errorCode = 'rabbit_connection_error';

  constructor(config: ConnectorConfig) {
    this.rmq = config.rmq;

    const level = config.environment === 'development' ?
      'debug' : 'error';

    this.logger = createLogger(level);
  }

  onClose() {
    this.logger.error('[rabbitmq] Connection closed, reconnecting', { errorCode: this.errorCode });
  }

  onError(error: any) {
    this.logger.error('[rabbitmq] Connection error', error, { errorCode: this.errorCode });
  }

  onConnectionFailed(error: Error) {
    this.logger.error('[rabbitmq] Connection failed:', error, { errorCode: this.errorCode });
  }

  async connect() {
    await this.createConnection();
    await this.createChannel();
  }

  async createConnection(): Promise<void> {
    try {
      this.logger.info('[rabbitmq] Connected');
      const connection = await ampq.connect({
        protocol: 'amqp',
        hostname: this.rmq.host,
        port: this.rmq.port,
        username: this.rmq.username,
        password: this.rmq.password,
      });

      this.connection = connection;

      this.connection.once('error', this.onError.bind(this));
      this.connection.once('close', this.onClose.bind(this));
      this.connection.on('connectFailed', this.onConnectionFailed.bind(this));
    } catch (err) {
      this.logger.error('[rabbitmq] Connection failed', err);
      return;
    }
  }

  async createChannel() {
    if (this.connection) {
      this.channel = await this.connection.createChannel({
        json: false,
        confirm: true,
      });

      this.logger.info('[rabbitmq] Channel created');
      return this.channel;
    }

    this.logger.error('[rabbitmq] Must be connected');
  }
}


export { Connector, ConnectorConfig };
