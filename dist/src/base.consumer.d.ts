import { Message, Replies } from 'amqplib';
import { Connector } from './connector';
import { Rmq } from './types';
declare type Nack = {
    allUpTo: boolean;
    requeue: boolean;
};
interface BaseConsumerConfig {
    queue: string;
    exchange: string;
    exchangeType: string;
    routingKey: string;
    prefetch: number;
    rmq: Rmq;
    environment?: string;
    nack?: Nack;
}
declare abstract class BaseConsumer extends Connector {
    private readonly queue;
    private readonly exchange;
    private readonly exchangeType;
    private readonly routingKey;
    private readonly prefetch;
    nack: Nack;
    constructor(config: BaseConsumerConfig);
    onClose(): void;
    onError(error: any): void;
    run(): Promise<void>;
    consume(): Promise<Replies.Consume>;
    abstract handleMessage(content: unknown, message: Message): Promise<void>;
}
export { BaseConsumer };
export type { BaseConsumerConfig, Message };
