import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Logger } from 'winston';
import { BaseProducer, BaseProducerConfig } from '../src/base.producer';

const config: BaseProducerConfig = {
  exchange: 'test_exchange',
  exchangeType: 'topic',
  routingKey: 'test_route',
  rmq: {
    host: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
  },
};

const silentLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
} as unknown as Logger;

class SendOnlyProducer extends BaseProducer {
  published: { exchange: string, routingKey: string, content: Buffer }[] = [];

  sendErrors: unknown[] = [];

  publishError: Error | null = null;

  constructor() {
    super(config);
    this.logger = silentLogger;
    this.channel = {
      publish: async (exchange: string, routingKey: string, content: Buffer) => {
        if (this.publishError) {
          throw this.publishError;
        }
        this.published.push({ exchange, routingKey, content });
        return true;
      },
    } as unknown as ChannelWrapper;
  }

  async onSendError(error: unknown): Promise<void> {
    this.sendErrors.push(error);
  }
}

test('publish rejects by default so a producer can use send() without implementing it', async () => {
  const producer = new SendOnlyProducer();

  await assert.rejects(producer.publish(), /publish\(\) is not implemented/);
});

test('send serializes payload to JSON once and uses config exchange and routing key', async () => {
  const producer = new SendOnlyProducer();

  const sent = await producer.send({ id: 1 });

  assert.equal(sent, true);
  assert.equal(producer.published.length, 1);
  assert.equal(producer.published[0].exchange, 'test_exchange');
  assert.equal(producer.published[0].routingKey, 'test_route');
  assert.deepEqual(JSON.parse(producer.published[0].content.toString()), { id: 1 });
});

test('send uses exchange and routing key passed in options', async () => {
  const producer = new SendOnlyProducer();

  await producer.send({ id: 1 }, { exchange: 'other_exchange', routingKey: 'other_route' });

  assert.equal(producer.published[0].exchange, 'other_exchange');
  assert.equal(producer.published[0].routingKey, 'other_route');
});

test('send returns false and calls onSendError when publishing fails', async () => {
  const producer = new SendOnlyProducer();
  const error = new Error('channel closed');
  producer.publishError = error;

  const sent = await producer.send({ id: 1 });

  assert.equal(sent, false);
  assert.deepEqual(producer.sendErrors, [error]);
});
