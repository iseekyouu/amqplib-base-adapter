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
exports.producerExampleConfig = void 0;
const src_1 = require("../src");
const config_1 = require("./config");
const express = require('express');
const app = express();
exports.producerExampleConfig = {
    exchange: 'example_exchange',
    exchangeType: 'topic',
    routingKey: 'example_route',
    rmq: {
        host: config_1.env.RMQ_CLUSTER_ADDRESS,
        password: config_1.env.RMQ_CLUSTER_PASSWORD,
        port: config_1.env.RMQ_CLUSTER_PORT,
        username: config_1.env.RMQ_CLUSTER_USERNAME,
    },
    environment: config_1.env.ENVIRONMENT,
};
class MyProducer extends src_1.BaseProducer {
    publish() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = Buffer.from(JSON.stringify({
                    test: 'testdata2',
                }));
                const result = (_a = this.channel) === null || _a === void 0 ? void 0 : _a.publish(this.exchange, this.routingKey, message);
                this.logger.info('[rabbitmq] publish result: ', { result, message, r: this.routingKey, e: this.exchange });
            }
            catch (error) {
                this.logger.error('[ProducerExample] error publish messages', error);
            }
        });
    }
}
app.get('/', function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const my = new MyProducer(exports.producerExampleConfig);
        const result = yield my.run();
        res.send('Hello World');
    });
});
app.listen(3018, () => console.log('listening on http://localhost:3018'));
