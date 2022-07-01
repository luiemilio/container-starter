import OpenFin, { fin } from '@openfin/core';

interface ExternalContext extends OpenFin.Context {
    metadata?: {
        uuid: string;
    }
}

const crossPlatformOverride = async (InteropBroker, provider, options, ...args) => {
    class Override extends InteropBroker {
        constructor(provider, options, ...args) {
            super(provider, options, ...args);
            this.externalBroker = 'platform-2';
            this.externalClients = new Map();
            this.initializeBrokers();
        }

        async initializeBrokers(): Promise<void> {
            const platform = fin.Platform.wrapSync({ uuid: this.externalBroker });

            if (await platform.Application.isRunning()) {
                await this.setupContextGroups();
            }

            platform.on('platform-api-ready', async () => {
                await this.setupContextGroups();
            });

            platform.Application.on('closed', () => {
                this.externalClients = new Map();
            });
        }

        async setupContextGroups(): Promise<void> {
            const client = fin.Interop.connectSync(this.externalBroker, {});
            const contextGroups = await client.getContextGroups();
            const tempClient = fin.Interop.connectSync(fin.me.uuid, {});
            const ctxGrps = await tempClient.getContextGroups();

            const contextGroupsPromises = contextGroups.map(async (ctxGrpInfo) => {
                const hasGrp = ctxGrps.some(info => info.id === ctxGrpInfo.id);

                if (hasGrp) {
                    const colorClient = fin.Interop.connectSync(this.externalBroker, {});
                    await colorClient.joinContextGroup(ctxGrpInfo.id);

                    await colorClient.addContextHandler(async (context: ExternalContext) => {
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

        async setContextOnExternalClient(context, clientIdentity): Promise<void> {
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
                    const newContext = context;
                    delete newContext.metadata;
                    await super.setContext({ ...payload, context: newContext}, clientIdentity);
                }
            } else {
                const newContext = { ...context, metadata: { uuid: fin.me.uuid } };
                this.setContextOnExternalClient(newContext, clientIdentity);
                await super.setContext(payload, clientIdentity);
            }
        }
    }

    return (new Override(provider, options, ...args) as unknown as OpenFin.InteropBroker);
}

fin.Platform.init({ interopOverride: crossPlatformOverride });
