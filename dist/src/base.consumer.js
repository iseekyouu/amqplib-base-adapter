"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseConsumer = void 0;
const connector_1 = require("./connector");
class BaseConsumer extends connector_1.Connector {
    constructor(config) {
        super(config);
        this.queue = config.queue;
        this.exchange = config.exchange;
        this.exchangeType = config.exchangeType;
        this.routingKey = config.routingKey;
        this.prefetch = config.prefetch;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createConnection();
            yield this.createChannel();
            if (this.prefetch) {
                yield this.channel.prefetch(this.prefetch);
            }
            yield this.channel.assertExchange(this.exchange, this.exchangeType, { durable: true });
            this.logger.info(`Exchange ${this.exchange} asserted`);
            yield this.channel.assertQueue(this.queue, {
                arguments: {
                    durable: true,
                    'x-queue-type': 'quorum',
                },
            });
            this.logger.info(`Queue ${this.queue} asserted`);
            yield this.channel.bindQueue(this.queue, this.exchange, this.routingKey);
            this.logger.info(`${this.queue} bound to ${this.exchange}`);
            yield this.consume();
        });
    }
    consume() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.channel.consume(this.queue, (message) => __awaiter(this, void 0, void 0, function* () {
                if (message === null) {
                    return;
                }
                try {
                    const content = JSON.parse(message.content.toString());
                    this.logger.debug(JSON.stringify(content), {
                        type: 'amqp-message',
                        exchange: this.exchange,
                        queue: this.queue,
                        routingKey: this.routingKey,
                    });
                    yield this.handleMessage(content, message);
                    yield this.channel.ack(message);
                }
                catch (err) {
                    this.logger.error(err, {
                        exchange: this.exchange,
                        queue: this.queue,
                        routingKey: this.routingKey,
                        content: message.content.toString(),
                    });
                    yield this.channel.nack(message);
                }
            }));
        });
    }
}
exports.BaseConsumer = BaseConsumer;
