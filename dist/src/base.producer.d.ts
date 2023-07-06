import { Connector } from './connector';
import { Rmq } from './types';
interface BaseProducerConfig {
    exchange: string;
    exchangeType: string;
    routingKey: string;
    rmq: Rmq;
    environment?: string;
    reconnectDelay?: number;
}
declare abstract class BaseProducer extends Connector {
    private readonly exchangeType;
    protected readonly exchange: string;
    protected readonly routingKey: string;
    constructor(config: BaseProducerConfig);
    onClose(): void;
    onError(error: any): void;
    run(): Promise<void>;
    abstract publish(): Promise<void>;
}
export { BaseProducer };
export type { BaseProducerConfig };
