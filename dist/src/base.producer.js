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
const connector_1 = require("./connector");
class BaseProducer extends connector_1.Connector {
    constructor(config) {
        super(config);
        this.exchange = config.exchange;
        this.exchangeType = config.exchangeType;
        this.routingKey = config.routingKey;
    }
    run() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createConnection();
            yield this.createChannel();
            yield this.channel.assertExchange(this.exchange, this.exchangeType, { durable: true });
            this.logger.info(`Exchange ${this.exchange} asserted`);
            yield this.publish();
            yield this.channel.close();
            yield ((_a = this.connection) === null || _a === void 0 ? void 0 : _a.close());
        });
    }
}
exports.BaseProducer = BaseProducer;
