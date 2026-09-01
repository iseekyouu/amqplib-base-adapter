import { Connector, ConnectorConfig } from 'connector';

export default class Initializer extends Connector {
  constructor(config: ConnectorConfig) {
    super(config);
  }

  async stop() {
    await this.channel?.close();
    await this.connection?.close();
    this.connection = null;
    this.channel = null;
    this.logger.info('Connection closed');
  }

  async establishConnection() {
    if (!this.connection || !this.channel) {
      this.connect();
    }

    if (!this.connection || !this.channel) {
      this.logger.error('Failed to establish connection');
      process.exit(1);
    }

    await this.channel?.waitForConnect();
  }

  async establishQueue({
    queue,
    exchange,
    routingKey,
    durable = true,
    queueArguments = {},
    queueType = 'quorum',
    exchangeType = 'direct',
    deadLetterExchange,
    deadLetterRoutingKey,
    messageTtl,
  }: {
    queue: string,
    exchange: string,
    routingKey: string,
    durable?: boolean,
    queueArguments?: Record<string, any>,
    queueType?: string,
    exchangeType?: string,
    messageTtl?: number,
    deadLetterExchange?: string,
    deadLetterRoutingKey?: string,
  }) {
    await this.establishConnection();
    await this.establishExchange({ exchange, exchangeType, durable, autoClose: false });
    await this.channel?.assertQueue(queue, {
      durable,
      deadLetterExchange,
      deadLetterRoutingKey,
      messageTtl,
      arguments: {
        'x-queue-type': queueType,
        ...queueArguments,
      },
    });

    this.logger.info(`Queue ${queue} asserted`);

    await this.channel?.bindQueue(
      queue,
      exchange,
      routingKey,
    );

    this.logger.info(`Queue ${queue} bound to exchange ${exchange} with routing key ${routingKey}`);
    await this.stop();
  }

  async establishExchange({
    exchange,
    exchangeType,
    durable = true,
    autoClose = true,
  }: {
    exchange: string,
    exchangeType: string,
    durable?: boolean,
    autoClose?: boolean,
  }) {
    await this.establishConnection();

    await this.channel?.assertExchange(
      exchange,
      exchangeType,
      { durable: Boolean(durable) },
    );

    this.logger.info(`Exchange ${exchange} asserted`);

    if (autoClose) {
      await this.stop();
    }
  }
}
