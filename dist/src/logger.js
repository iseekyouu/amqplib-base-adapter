"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.Logger = void 0;
const winston_1 = require("winston");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return winston_1.Logger; } });
function createLogger(level) {
    return (0, winston_1.createLogger)({
        level,
        format: winston_1.format.combine(winston_1.format.errors({ stack: true }), winston_1.format.metadata(), winston_1.format.timestamp(), winston_1.format.json()),
        exitOnError: false,
        transports: [
            new winston_1.transports.Console(),
        ],
    });
}
exports.createLogger = createLogger;
