import type { InteropBroker } from 'openfin-adapter/src/api/interop';
import { fin } from 'openfin-adapter/src/mock';

const interopOverride = async (InteropBroker, provider, options, ...args) => {
    class Override extends InteropBroker {
        constructor(provider, options, ...args) {
            super(provider, options, ...args);
            this.externalBrokers = ['platform-2'];
            this.externalClients = new Map();
            this.initializeBrokers();
        }

        async initializeBrokers(): Promise<void> {
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

        async setupContextGroups(brokerUuid: string): Promise<void> {
            const client = fin.Interop.connectSync(brokerUuid, {});
            const contextGroups = await client.getContextGroups();
            const colorClientsMap = new Map();
            const tempClient = fin.Interop.connectSync(fin.me.uuid, {});
            const ctxGrps = await tempClient.getContextGroups();

            contextGroups.forEach(async (ctxGrpInfo) => {
                const colorClient = fin.Interop.connectSync(brokerUuid, {});
                await colorClient.joinContextGroup(ctxGrpInfo.id);
                const hasGrp = ctxGrps.some(info => info.id === ctxGrpInfo.id);
                
                if (hasGrp) {           
                    await colorClient.addContextHandler(async (context: any) => {
                        if (!context.uuid || (context?.uuid && context.uuid !== fin.me.uuid)) {
                            await tempClient.joinContextGroup(ctxGrpInfo.id);
                            const newContext = { ...context, uuid: brokerUuid };
                            tempClient.setContext(newContext);
                        }
                    });
                }

                colorClientsMap.set(ctxGrpInfo.id, colorClient);
            });

            this.externalClients.set(brokerUuid, colorClientsMap);
        }

        async setContext(payload: any, clientIdentity: OpenFin.ClientIdentity): Promise<void> {
            const { context } = payload;
            const newContext = { ...context, uuid: fin.me.uuid };

            if (this.externalClients.size > 0) {
                const state = this.getClientState(clientIdentity);

                this.externalClients.forEach((colorClientsMap, brokerUuid) => {
                    if (colorClientsMap.has(state.contextGroupId) && (!context.uuid || (context?.uuid && context.uuid !== brokerUuid))) {
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
