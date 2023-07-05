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
exports.Connector = void 0;
const amqplib_1 = require("amqplib");
const logger_1 = require("./logger");
class Connector {
    constructor(config) {
        this.errorCode = 'rabbit_connection_error';
        this.rmq = config.rmq;
        const level = config.environment === 'development' ?
            'debug' : 'error';
        this.logger = (0, logger_1.createLogger)(level);
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createConnection();
            yield this.createChannel();
        });
    }
    createConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.info('[rabbitmq] Connected');
                const connection = yield (0, amqplib_1.connect)({
                    protocol: 'amqp',
                    hostname: this.rmq.host,
                    port: this.rmq.port,
                    username: this.rmq.username,
                    password: this.rmq.password,
                });
                this.connection = connection;
            }
            catch (err) {
                this.logger.error('[rabbitmq] Connection failed', err);
                return;
            }
        });
    }
    createChannel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connection) {
                this.channel = yield this.connection.createChannel();
                this.logger.info('[rabbitmq] Channel created');
                return this.channel;
            }
            this.logger.error('[rabbitmq] must be connected');
        });
    }
}
exports.Connector = Connector;
