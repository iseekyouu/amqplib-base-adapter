import { Connector } from './connector';
import { Rmq } from './types';
interface BaseProducerConfig {
    exchange: string;
    exchangeType: string;
    routingKey: string;
    rmq: Rmq;
    environment?: string;
}
declare abstract class BaseProducer extends Connector {
    private readonly exchangeType;
    protected readonly exchange: string;
    protected readonly routingKey: string;
    attemp: number;
    constructor(config: BaseProducerConfig);
    reconnect(): Promise<void>;
    onClose(): void;
    onError(error: any): void;
    run(): Promise<void>;
    abstract publish(): Promise<void>;
}
export { BaseProducer };
export type { BaseProducerConfig };
