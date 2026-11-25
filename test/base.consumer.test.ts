import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { Logger } from 'winston';
import { BaseConsumer, BaseConsumerConfig } from '../src/base.consumer';

class RetryableError extends Error {}

type Handler = (consumer: TestConsumer, attempt: number) => Promise<void>;

const config: BaseConsumerConfig = {
  queue: 'test.queue',
  exchange: 'test_exchange',
  exchangeType: 'topic',
  routingKey: 'test_route',
  prefetch: 1,
  retryIntervalMs: 0,
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

const createMessage = (content: string): ConsumeMessage => ({
  content: Buffer.from(content),
  fields: {},
  properties: {},
} as unknown as ConsumeMessage);

class TestConsumer extends BaseConsumer {
  acks: ConsumeMessage[] = [];

  nacks: { message: ConsumeMessage, allUpTo: boolean, requeue: boolean }[] = [];

  handled = 0;

  readyChecks = 0;

  successHooks = 0;

  errorHooks: unknown[] = [];

  handler: Handler = async () => undefined;

  readyImpl: (check: number) => Promise<boolean> = async () => true;

  onMessageSuccessImpl: () => Promise<void> = async () => undefined;

  onMessageErrorImpl: () => Promise<void> = async () => undefined;

  prefetchCount: number | null = null;

  consumeCallback: ((message: ConsumeMessage | null) => void) | null = null;

  private setup: ((ch: unknown) => Promise<unknown>) | null = null;

  private readonly rawChannel = {
    assertQueue: async () => undefined,
    assertExchange: async () => undefined,
    prefetch: async (count: number) => { this.prefetchCount = count; },
    bindQueue: async () => undefined,
    consume: async (queue: string, callback: (message: ConsumeMessage | null) => void) => {
      this.consumeCallback = callback;
    },
  };

  constructor(overrides: Partial<BaseConsumerConfig> = {}) {
    super({ ...config, ...overrides });
    this.logger = silentLogger;
    this.channel = {
      ack: (message: ConsumeMessage) => { this.acks.push(message); },
      nack: (message: ConsumeMessage, allUpTo: boolean, requeue: boolean) => {
        this.nacks.push({ message, allUpTo, requeue });
      },
      addSetup: async (setup: (ch: unknown) => Promise<unknown>) => {
        this.setup = setup;
        await this.runChannelSetup();
      },
    } as unknown as ChannelWrapper;
  }

  connect() {
    this.connection = {} as unknown as AmqpConnectionManager;
  }

  get generation(): number {
    return this.channelGeneration;
  }

  async runChannelSetup() {
    if (this.setup) {
      await this.setup(this.rawChannel);
    }
  }

  simulateReconnect() {
    this.channelGeneration += 1;
  }

  async handleMessage(): Promise<void> {
    this.handled += 1;
    await this.handler(this, this.handled);
  }

  isRetryableError(error: unknown): boolean {
    return error instanceof RetryableError;
  }

  async isReady(): Promise<boolean> {
    this.readyChecks += 1;
    return this.readyImpl(this.readyChecks);
  }

  async onMessageSuccess(): Promise<void> {
    this.successHooks += 1;
    await this.onMessageSuccessImpl();
  }

  async onMessageError(message: ConsumeMessage, error: unknown): Promise<void> {
    this.errorHooks.push(error);
    await this.onMessageErrorImpl();
  }
}

class DefaultConsumer extends BaseConsumer {
  acks = 0;

  nacks = 0;

  handled = 0;

  constructor() {
    super(config);
    this.logger = silentLogger;
    this.channel = {
      ack: () => { this.acks += 1; },
      nack: () => { this.nacks += 1; },
    } as unknown as ChannelWrapper;
  }

  async handleMessage(): Promise<void> {
    this.handled += 1;
    throw new RetryableError('db is down');
  }
}

test('acks message and runs success hook when handler succeeds', async () => {
  const consumer = new TestConsumer();
  const message = createMessage('{"id":1}');

  await consumer.onMessage(message);

  assert.deepEqual(consumer.acks, [message]);
  assert.equal(consumer.nacks.length, 0);
  assert.equal(consumer.successHooks, 1);
  assert.equal(consumer.errorHooks.length, 0);
});

test('nacks with default config and runs error hook on non-retryable error', async () => {
  const consumer = new TestConsumer();
  const error = new Error('bad message');
  consumer.handler = async () => { throw error; };
  const message = createMessage('{"id":1}');

  await consumer.onMessage(message);

  assert.equal(consumer.acks.length, 0);
  assert.deepEqual(consumer.nacks, [{ message, allUpTo: false, requeue: true }]);
  assert.deepEqual(consumer.errorHooks, [error]);
  assert.equal(consumer.handled, 1);
});

test('nacks with configured nack options', async () => {
  const consumer = new TestConsumer({ nack: { allUpTo: false, requeue: false } });
  consumer.handler = async () => { throw new Error('bad message'); };
  const message = createMessage('{"id":1}');

  await consumer.onMessage(message);

  assert.deepEqual(consumer.nacks, [{ message, allUpTo: false, requeue: false }]);
});

test('keeps default behavior when retry hooks are not overridden', async () => {
  const consumer = new DefaultConsumer();

  await consumer.onMessage(createMessage('{"id":1}'));

  assert.equal(consumer.handled, 1);
  assert.equal(consumer.acks, 0);
  assert.equal(consumer.nacks, 1);
});

test('retries after waiting on retryable error and acks once handler succeeds', async () => {
  const consumer = new TestConsumer();
  consumer.handler = async (_, attempt) => {
    if (attempt < 3) {
      throw new RetryableError('db is down');
    }
  };
  const message = createMessage('{"id":1}');

  await consumer.onMessage(message);

  assert.equal(consumer.handled, 3);
  assert.equal(consumer.readyChecks, 3);
  assert.deepEqual(consumer.acks, [message]);
  assert.equal(consumer.nacks.length, 0);
  assert.equal(consumer.errorHooks.length, 0);
});

test('nacks invalid JSON without calling handler', async () => {
  const consumer = new TestConsumer();
  const message = createMessage('not json');

  await consumer.onMessage(message);

  assert.equal(consumer.handled, 0);
  assert.equal(consumer.acks.length, 0);
  assert.equal(consumer.nacks.length, 1);
  assert.equal(consumer.errorHooks.length, 1);
});

test('leaves message unacknowledged when channel reconnects during retry', async () => {
  const consumer = new TestConsumer();
  consumer.handler = async (self) => {
    self.simulateReconnect();
    throw new RetryableError('db is down');
  };

  await consumer.onMessage(createMessage('{"id":1}'));

  assert.equal(consumer.handled, 1);
  assert.equal(consumer.acks.length, 0);
  assert.equal(consumer.nacks.length, 0);
});

test('waits until ready before processing message', async () => {
  const consumer = new TestConsumer();
  consumer.readyImpl = async (check) => check >= 3;
  const message = createMessage('{"id":1}');

  await consumer.onMessage(message);

  assert.equal(consumer.readyChecks, 3);
  assert.equal(consumer.handled, 1);
  assert.deepEqual(consumer.acks, [message]);
});

test('stops waiting without ack or nack when channel reconnects while not ready', async () => {
  const consumer = new TestConsumer();
  consumer.readyImpl = async (check) => {
    if (check === 2) {
      consumer.simulateReconnect();
    }
    return false;
  };

  await consumer.onMessage(createMessage('{"id":1}'));

  assert.equal(consumer.readyChecks, 2);
  assert.equal(consumer.handled, 0);
  assert.equal(consumer.acks.length, 0);
  assert.equal(consumer.nacks.length, 0);
});

test('does not process message when channel reconnects during successful ready check', async () => {
  const consumer = new TestConsumer();
  consumer.readyImpl = async () => {
    consumer.simulateReconnect();
    return true;
  };

  await consumer.onMessage(createMessage('{"id":1}'));

  assert.equal(consumer.handled, 0);
  assert.equal(consumer.acks.length, 0);
  assert.equal(consumer.nacks.length, 0);
});

test('does not ack when channel reconnects while handler succeeds', async () => {
  const consumer = new TestConsumer();
  consumer.handler = async (self) => { self.simulateReconnect(); };

  await consumer.onMessage(createMessage('{"id":1}'));

  assert.equal(consumer.handled, 1);
  assert.equal(consumer.acks.length, 0);
  assert.equal(consumer.nacks.length, 0);
  assert.equal(consumer.successHooks, 0);
});

test('treats throwing ready check as not ready and keeps waiting', async () => {
  const consumer = new TestConsumer();
  consumer.readyImpl = async (check) => {
    if (check === 1) {
      throw new Error('probe failed');
    }
    return true;
  };
  const message = createMessage('{"id":1}');

  await consumer.onMessage(message);

  assert.equal(consumer.readyChecks, 2);
  assert.equal(consumer.handled, 1);
  assert.deepEqual(consumer.acks, [message]);
  assert.equal(consumer.nacks.length, 0);
});

test('uses 1000 ms retry interval by default', () => {
  class IntervalConsumer extends BaseConsumer {
    get interval(): number {
      return this.retryIntervalMs;
    }

    async handleMessage(): Promise<void> {
      return;
    }
  }

  const { retryIntervalMs, ...withoutInterval } = config;

  assert.equal(new IntervalConsumer(withoutInterval).interval, 1000);
  assert.equal(new IntervalConsumer({ ...withoutInterval, retryIntervalMs: 250 }).interval, 250);
});

test('does not throw when error hook fails', async () => {
  const consumer = new TestConsumer();
  consumer.handler = async () => { throw new Error('bad message'); };
  consumer.onMessageErrorImpl = async () => { throw new Error('inbox is down'); };

  await assert.doesNotReject(consumer.onMessage(createMessage('{"id":1}')));
  assert.equal(consumer.nacks.length, 1);
});

test('does not nack after ack when success hook fails', async () => {
  const consumer = new TestConsumer();
  consumer.onMessageSuccessImpl = async () => { throw new Error('inbox is down'); };

  await assert.doesNotReject(consumer.onMessage(createMessage('{"id":1}')));
  assert.equal(consumer.acks.length, 1);
  assert.equal(consumer.nacks.length, 0);
});

test('ignores null message sent on consumer cancel', async () => {
  const consumer = new TestConsumer();

  await consumer.onMessage(null);

  assert.equal(consumer.handled, 0);
  assert.equal(consumer.acks.length, 0);
  assert.equal(consumer.nacks.length, 0);
});

test('run sets up channel and counts every channel setup as a new generation', async () => {
  const consumer = new TestConsumer();

  await consumer.run();

  assert.equal(consumer.generation, 1);
  assert.equal(consumer.prefetchCount, 1);
  assert.notEqual(consumer.consumeCallback, null);

  await consumer.runChannelSetup();

  assert.equal(consumer.generation, 2);
});

test('run routes consumed messages to onMessage', async () => {
  const consumer = new TestConsumer();
  const message = createMessage('{"id":1}');
  await consumer.run();

  consumer.consumeCallback?.(message);
  await new Promise((resolve) => { setImmediate(resolve); });

  assert.equal(consumer.handled, 1);
  assert.deepEqual(consumer.acks, [message]);
});

test('drops delivery without ack or nack when channel is set up again during retry', async () => {
  const consumer = new TestConsumer();
  await consumer.run();
  consumer.handler = async (self, attempt) => {
    if (attempt === 1) {
      await self.runChannelSetup();
      throw new RetryableError('db is down');
    }
  };

  await consumer.onMessage(createMessage('{"id":1}'));

  assert.equal(consumer.handled, 1);
  assert.equal(consumer.acks.length, 0);
  assert.equal(consumer.nacks.length, 0);
});
