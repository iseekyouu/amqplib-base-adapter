import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { Logger } from './logger';
import { Rmq } from './types';
interface ConnectorConfig {
    rmq: Rmq;
    environment?: string;
}
declare class Connector {
    protected logger: Logger;
    private readonly rmq;
    environment?: string;
    protected connection: AmqpConnectionManager | null;
    protected channel: ChannelWrapper | null;
    errorCode: string;
    constructor(config: ConnectorConfig);
    connect(): Promise<void>;
    createConnection(): Promise<void>;
    createChannel(): Promise<import("amqp-connection-manager/dist/esm/ChannelWrapper").default | undefined>;
}
export { Connector };
