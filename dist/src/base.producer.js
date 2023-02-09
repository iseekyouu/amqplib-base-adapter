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
exports.BaseProducer = void 0;
const amqplib_1 = require("amqplib");
const winston_1 = require("winston");
class BaseProducer {
    constructor(config) {
        this.exchange = config.exchange;
        this.exchangeType = config.exchangeType;
        this.routingKey = config.routingKey;
        this.rmq = config.rmq;
        const level = config.environment === 'development' ?
            'debug' : 'error';
        this.logger = (0, winston_1.createLogger)({
            level,
            format: winston_1.format.combine(winston_1.format.errors({ stack: true }), winston_1.format.metadata(), winston_1.format.timestamp(), winston_1.format.json()),
            exitOnError: false,
            transports: [
                new winston_1.transports.Console(),
            ],
        });
    }
    getConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.info('[rabbitmq] Connected');
                return yield (0, amqplib_1.connect)({
                    protocol: 'amqp',
                    hostname: this.rmq.host,
                    port: this.rmq.port,
                    username: this.rmq.username,
                    password: this.rmq.password,
                });
            }
            catch (err) {
                this.logger.error('[rabbitmq] Connection failed', err);
                return this.getConnection();
            }
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            this.connection = yield this.getConnection();
            this.connection.on('error', (error) => {
                this.logger.error(error);
                process.exit(1);
            });
            this.channel = yield this.connection.createChannel();
            this.logger.info('[rabbitmq] Channel created');
            yield this.channel.assertExchange(this.exchange, this.exchangeType, { durable: true });
            this.logger.info(`Exchange ${this.exchange} asserted`);
            yield this.publish();
            yield this.channel.close();
            yield this.connection.close();
        });
    }
}
exports.BaseProducer = BaseProducer;
