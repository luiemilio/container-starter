import { InteropBroker } from 'openfin-adapter/src/api/interop';
import { fin } from 'openfin-adapter/src/mock';

const interopOverride = async (InteropBroker, provider, options, ...args) => {
    class Override extends InteropBroker {
        constructor(provider, options, ...args) {
            super(provider, options, ...args);
            this.externalBrokers = ['platform-2'];
            this.externalClients = new Map();
            this.initializeBrokers();
            this.contextUuids = [];
        }

        async initializeBrokers() {
            this.externalBrokers.forEach(async (brokerUuid) => {
                const platform = fin.Platform.wrapSync({ uuid: brokerUuid });

                if (await platform.Application.isRunning()) {
                    await this.setupContextGroups(brokerUuid);
                }

                platform.on('platform-api-ready', async () => {
                    await this.setupContextGroups(brokerUuid);
                });

                platform.Application.once('closed', () => {
                    this.externalClients.delete(brokerUuid);
                });
            });
        }

        async setupContextGroups(brokerUuid) {
            const client = fin.Interop.connectSync(brokerUuid, {});
            const contextGroups = await client.getContextGroups();
            const colorClientsMap = new Map();

            contextGroups.forEach(async (ctxGrpInfo) => {
                const colorClient = fin.Interop.connectSync(brokerUuid, {});
                await colorClient.joinContextGroup(ctxGrpInfo.id);

                await colorClient.addContextHandler(async (context: any) => {
                    if (!context.uuid || (context?.uuid && !this.contextUuids.includes(context.uuid))) {
                        const tempClient = fin.Interop.connectSync(fin.me.uuid, {});
                        await tempClient.joinContextGroup(ctxGrpInfo.id);
                        tempClient.setContext(context);
                    }
                });

                colorClientsMap.set(ctxGrpInfo.id, colorClient);
            });

            this.externalClients.set(brokerUuid, colorClientsMap);
        }

        async setContext(payload, clientIdentity) {
            const { context } = payload;
            const uuid = crypto.randomUUID();
            const newContext = { ...context, uuid };

            this.contextUuids.push(uuid);

            if (this.externalClients.size > 0) {
                const state = this.getClientState(clientIdentity);

                this.externalClients.forEach((colorClientsMap) => {
                    if (colorClientsMap.has(state.contextGroupId)) {
                        const colorClient = colorClientsMap.get(state.contextGroupId);
                        colorClient.setContext(newContext);
                    }
                });
            }

            super.setContext({ ...payload, context: newContext }, clientIdentity);
        }
    }

    return (new Override(provider, options, ...args) as unknown as InteropBroker);
}

const platformConfig = fin.me.uuid === 'platform-1' ? { interopOverride } : null;

fin.Platform.init(platformConfig);
