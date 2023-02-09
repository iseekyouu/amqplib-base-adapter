import { Message, Replies } from 'amqplib';
import { Connector } from './connector';
import { Rmq } from './types';
interface BaseConsumerConfig {
    queue: string;
    exchange: string;
    exchangeType: string;
    routingKey: string;
    prefetch: number;
    rmq: Rmq;
    environment?: string;
}
declare abstract class BaseConsumer extends Connector {
    private readonly queue;
    private readonly exchange;
    private readonly exchangeType;
    private readonly routingKey;
    private readonly prefetch;
    constructor(config: BaseConsumerConfig);
    run(): Promise<void>;
    consume(): Promise<Replies.Consume>;
    abstract handleMessage(content: unknown, message: Message): Promise<void>;
}
export { BaseConsumer };
export type { BaseConsumerConfig, Message };
