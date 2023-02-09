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
exports.ProducerExampleConfig = void 0;
const base_producer_1 = require("../src/base.producer");
const config_1 = require("./config");
exports.ProducerExampleConfig = {
    exchange: 'example_exchange',
    exchangeType: 'topic',
    routingKey: 'example_route',
    rmq: {
        host: config_1.env.RMQ_CLUSTER_ADDRESSES,
        password: config_1.env.RMQ_CLUSTER_PASSWORD,
        port: config_1.env.RMQ_CLUSTER_PORT,
        username: config_1.env.RMQ_CLUSTER_USERNAME,
    },
    environment: config_1.env.ENVIRONMENT,
};
class ProducerExample extends base_producer_1.BaseProducer {
    publish() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = Buffer.from(JSON.stringify({
                    test: 'testdata1',
                }));
                const result = (_a = this.channel) === null || _a === void 0 ? void 0 : _a.publish(this.exchange, this.routingKey, message);
                this.logger.info('[rabbitmq] publish result: ', { result, message });
            }
            catch (error) {
                this.logger.error('[ProducerExample] error publish messages', error);
            }
        });
    }
}
const producerExample = new ProducerExample(exports.ProducerExampleConfig);
void producerExample.run();
