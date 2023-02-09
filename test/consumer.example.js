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
exports.ConsumerExampleConfig = void 0;
const base_consumer_1 = require("../src/base.consumer");
const config_1 = require("./config");
exports.ConsumerExampleConfig = {
    queue: 'example.queue',
    exchange: 'example_exchange',
    exchangeType: 'topic',
    routingKey: 'example_route',
    prefetch: 1,
    rmq: {
        host: config_1.env.RMQ_CLUSTER_ADDRESSES,
        password: config_1.env.RMQ_CLUSTER_PASSWORD,
        port: config_1.env.RMQ_CLUSTER_PORT,
        username: config_1.env.RMQ_CLUSTER_USERNAME,
    },
    environment: config_1.env.ENVIRONMENT,
};
class ConsumerExample extends base_consumer_1.BaseConsumer {
    handleMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.info({ message });
            }
            catch (err) {
                this.logger.error('Reactivation consumer error handle message', err);
            }
        });
    }
}
const consumerExample = new ConsumerExample(exports.ConsumerExampleConfig);
void consumerExample.run();
