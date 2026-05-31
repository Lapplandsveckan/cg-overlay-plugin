import amqp, {AmqpConnectionManager, ChannelWrapper} from 'amqp-connection-manager';
import type {ConfirmChannel, ConsumeMessage} from 'amqplib';
import LappisOverlayPlugin from './index';

export type TopicHandler = (payload: any, msg: ConsumeMessage) => void | Promise<void>;

interface Subscription {
    exchange: string;
    routingKey: string;
    handler: TopicHandler;
}

export class RabbitManager {
    private plugin: LappisOverlayPlugin;
    private connection: AmqpConnectionManager | null = null;
    private channel: ChannelWrapper | null = null;
    private readonly subscriptions: Subscription[] = [];

    public constructor(plugin: LappisOverlayPlugin) {
        this.plugin = plugin;
    }

    public connect(url: string) {
        if (this.connection) return;
        const logger = this.plugin.getLogger();

        this.connection = amqp.connect([url]);
        this.connection.on('connect', () => logger.info(`AMQP connected to ${url}`));
        this.connection.on('disconnect', ({err}) => logger.warn(`AMQP disconnected${err ? `: ${err.message}` : ''}`));

        this.channel = this.connection.createChannel({
            setup: async (channel: ConfirmChannel) => {
                for (const sub of this.subscriptions) await this.applySubscription(channel, sub);
            },
        });
    }

    public async disconnect() {
        await this.channel?.close().catch(() => null);
        await this.connection?.close().catch(() => null);
        this.channel = null;
        this.connection = null;
    }

    /** Bind a handler to a topic exchange + routing key. Replayed on every reconnect. */
    public subscribe(exchange: string, routingKey: string, handler: TopicHandler) {
        const sub: Subscription = {exchange, routingKey, handler};
        this.subscriptions.push(sub);
        if (this.channel) this.channel.addSetup((channel: ConfirmChannel) => this.applySubscription(channel, sub));
    }

    private async applySubscription(channel: ConfirmChannel, sub: Subscription) {
        const logger = this.plugin.getLogger();

        await channel.assertExchange(sub.exchange, 'topic', {durable: true});
        const {queue} = await channel.assertQueue('', {exclusive: true, autoDelete: true});
        await channel.bindQueue(queue, sub.exchange, sub.routingKey);
        await channel.consume(queue, msg => {
            if (!msg) return;

            let payload: any = null;
            try {
                if (msg.content.length) payload = JSON.parse(msg.content.toString('utf8'));
            } catch (err) {
                logger.error(`AMQP: failed to parse message on ${sub.exchange}/${sub.routingKey}: ${err}`);
            }

            Promise.resolve(sub.handler(payload, msg))
                .catch(err => logger.error(`AMQP: handler for ${sub.exchange}/${sub.routingKey} threw: ${err}`));
        }, {noAck: true});
    }
}
