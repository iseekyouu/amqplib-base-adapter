import { Connection, Channel } from 'amqplib';
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
    protected connection: Connection | undefined;
    protected channel: Channel | any;
    constructor(config: ConnectorConfig);
    createConnection(): Promise<void>;
    createChannel(): Promise<any>;
}
export { Connector };
