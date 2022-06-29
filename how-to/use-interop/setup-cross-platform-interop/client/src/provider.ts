import type { InteropBroker } from 'openfin-adapter/src/api/interop';
import { fin } from 'openfin-adapter/src/mock';

const crossPlatformOverride = async (InteropBroker, provider, options, ...args) => {
    class Override extends InteropBroker {
        constructor(provider, options, ...args) {
            super(provider, options, ...args);
            this.externalBroker = 'platform-3';
            this.externalClients = new Map();
            this.initializeBrokers();
        }

        async initializeBrokers(): Promise<void> {
            const platform = fin.Platform.wrapSync({ uuid: this.externalBroker });

            if (await platform.Application.isRunning()) {
                await this.setupContextGroups(this.externalBroker);
            }

            platform.on('platform-api-ready', async () => {
                await this.setupContextGroups(this.externalBroker);
            });

            platform.Application.once('closed', () => {
                this.externalClients.delete(this.externalBroker);
            });
        }

        async setupContextGroups(brokerUuid: string): Promise<void> {
            const client = fin.Interop.connectSync(brokerUuid, {});
            const contextGroups = await client.getContextGroups();
            const tempClient = fin.Interop.connectSync(fin.me.uuid, {});
            const ctxGrps = await tempClient.getContextGroups();

            const contextGroupsPromises = contextGroups.map(async (ctxGrpInfo) => {
                const hasGrp = ctxGrps.some(info => info.id === ctxGrpInfo.id);

                if (hasGrp) {
                    const colorClient = fin.Interop.connectSync(brokerUuid, {});
                    await colorClient.joinContextGroup(ctxGrpInfo.id);

                    await colorClient.addContextHandler(async (context: any) => {
                        await tempClient.joinContextGroup(ctxGrpInfo.id);
                        const newContext = context.metadata?.uuid ? context : { ...context, metadata: { uuid: this.externalBroker } };
                        await tempClient.setContext(newContext);
                    });

                    return this.externalClients.set(ctxGrpInfo.id, colorClient);
                }
            });

            try {
                await Promise.all(contextGroupsPromises);
            } catch (error) {
                throw new Error(`Not able to setup handlers for external brokers: ${error}`);
            }
        }

        async setContextOnExternalClients(context, clientIdentity): Promise<void> {
            const state = this.getClientState(clientIdentity);

            if (this.externalClients.has(state.contextGroupId)) {
                const colorClient = this.externalClients.get(state.contextGroupId);
                colorClient.setContext(context);
            }
        }

        async setContext(payload: any, clientIdentity: OpenFin.ClientIdentity): Promise<void> {
            const { context } = payload;

            if (context.metadata) {
                const { metadata: { uuid } } = context; 
                
                if ((uuid !== fin.me.uuid && uuid !== this.externalBroker) || uuid === this.externalBroker) {
                    await super.setContext(payload, clientIdentity);
                }
            } else {
                const newContext = { ...context, metadata: { uuid: fin.me.uuid } };
                this.setContextOnExternalClients(newContext, clientIdentity);
                await super.setContext(payload, clientIdentity);
            }
        }
    }

    return (new Override(provider, options, ...args) as unknown as InteropBroker);
}

const platformConfig = (fin.me.uuid === 'platform-1' || fin.me.uuid === 'platform-2') ? { interopOverride: crossPlatformOverride } : null;

fin.Platform.init(platformConfig);
