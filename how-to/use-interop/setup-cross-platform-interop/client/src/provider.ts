import type { InteropBroker } from 'openfin-adapter/src/api/interop';
import { fin } from 'openfin-adapter/src/mock';

const interopOverride = async (InteropBroker, provider, options, ...args) => {
    class Override extends InteropBroker {
        constructor(provider, options, ...args) {
            super(provider, options, ...args);
            this.externalBrokers = ['platform-3', 'platform-4', 'platform-5'];
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

            const contextGroupsPromises = contextGroups.map(async (ctxGrpInfo) => {
                const hasGrp = ctxGrps.some(info => info.id === ctxGrpInfo.id);
                
                if (hasGrp) {           
                    const colorClient = fin.Interop.connectSync(brokerUuid, {});
                    await colorClient.joinContextGroup(ctxGrpInfo.id);

                    await colorClient.addContextHandler(async (context: any) => {
                        console.log('########addContextHandlert##########', context);
                        await tempClient.joinContextGroup(ctxGrpInfo.id);

                        let newContext;

                        if (context.uuid) {
                            if (!context.uuid.includes(brokerUuid)) {
                                newContext = { ...context, uuid: [...context.uuid, brokerUuid] } ;
                                await tempClient.setContext(newContext);
                            }

                            if (!context.uuid.includes(fin.me.uuid)) {
                                await tempClient.setContext(context);
                            }
                        } else {
                            newContext = { ...context, uuid: [brokerUuid] };
                            await tempClient.setContext(newContext);
                        }
                    });

                    return colorClientsMap.set(ctxGrpInfo.id, colorClient);
                }
            });

            try {
                await Promise.all(contextGroupsPromises);
            } catch (error) {
                throw new Error(`Not able to setup handlers for external brokers: ${error}`); 
            }

            this.externalClients.set(brokerUuid, colorClientsMap);
        }

        async setContextOnExternalClients(context, clientIdentity): Promise<void> {
            if (this.externalClients.size > 0) {
                const state = this.getClientState(clientIdentity);

                this.externalClients.forEach((colorClientsMap, brokerUuid) => {
                    if (colorClientsMap.has(state.contextGroupId) && !context.uuid.includes(brokerUuid)) {
                        const colorClient = colorClientsMap.get(state.contextGroupId);
                        const newContext = { ...context, uuid: [...context.uuid, brokerUuid] };
                        colorClient.setContext(newContext);
                    }
                });
            }
        }

        async setContext(payload: any, clientIdentity: OpenFin.ClientIdentity): Promise<void> {
            const { context } = payload;
            console.log('########setContext##########', context);
            
            if (context.uuid) {
                const newContext = { ...context, uuid: [...context.uuid, fin.me.uuid] }
                console.log('########setContext-context.uuid##########', newContext);
                await this.setContextOnExternalClients(newContext, clientIdentity);
                
                if (!context.uuid.includes(fin.me.uuid)) {
                    console.log('########setContext-context-uuid-##########', newContext);
                    return super.setContext({ ...payload, newContext }, clientIdentity);
                }
            } else if (!context.uuid) {
                const newContext = { ...context, uuid: [fin.me.uuid] }
                await this.setContextOnExternalClients(newContext, clientIdentity);
                return super.setContext({ ...payload, newContext }, clientIdentity);
            }
        }
    }

    return (new Override(provider, options, ...args) as unknown as InteropBroker);
}

// const interopOverride2 = async (InteropBroker, provider, options, ...args) => {
//     class Override extends InteropBroker {
//         constructor(provider, options, ...args) {
//             super(provider, options, ...args);
//             this.externalBrokers = ['platform-3', 'platform-4'];
//             this.externalClients = new Map();
//             this.initializeBrokers();
//         }

//         async initializeBrokers(): Promise<void> {
//             this.externalBrokers.forEach(async (brokerUuid) => {
//                 const platform = fin.Platform.wrapSync({ uuid: brokerUuid });

//                 if (await platform.Application.isRunning()) {
//                     await this.setupContextGroups(brokerUuid);
//                 }

//                 platform.on('platform-api-ready', async () => {
//                     await this.setupContextGroups(brokerUuid);
//                 });

//                 platform.Application.once('closed', () => {
//                     this.externalClients.delete(brokerUuid);
//                 });
//             });
//         }

//         async setupContextGroups(brokerUuid: string): Promise<void> {
//             const client = fin.Interop.connectSync(brokerUuid, {});
//             const contextGroups = await client.getContextGroups();
//             const colorClientsMap = new Map();
//             const tempClient = fin.Interop.connectSync(fin.me.uuid, {});
//             const ctxGrps = await tempClient.getContextGroups();

//             const contextGroupsPromises = contextGroups.map(async (ctxGrpInfo) => {
//                 const hasGrp = ctxGrps.some(info => info.id === ctxGrpInfo.id);
                
//                 if (hasGrp) {           
//                     const colorClient = fin.Interop.connectSync(brokerUuid, {});
//                     await colorClient.joinContextGroup(ctxGrpInfo.id);

//                     await colorClient.addContextHandler(async (context: any) => {
//                         await tempClient.joinContextGroup(ctxGrpInfo.id);
//                         await tempClient.setContext(context);
//                     });

//                     return colorClientsMap.set(ctxGrpInfo.id, colorClient);
//                 }
//             });

//             try {
//                 await Promise.all(contextGroupsPromises);
//             } catch (error) {
//                 throw new Error(`Not able to setup handlers for external brokers: ${error}`); 
//             }

//             this.externalClients.set(brokerUuid, colorClientsMap);
//         }

//         async setContextOnExternalClients(context, clientIdentity): Promise<void> {
//             if (this.externalClients.size > 0) {
//                 const state = this.getClientState(clientIdentity);

//                 this.externalClients.forEach((colorClientsMap, brokerUuid) => {
//                     if (colorClientsMap.has(state.contextGroupId) && !context.uuid.includes(brokerUuid)) {
//                         const colorClient = colorClientsMap.get(state.contextGroupId);
//                         const newContext = { ...context, uuid: [...context.uuid, brokerUuid] };
//                         colorClient.setContext(newContext);
//                     }
//                 });
//             }
//         }

//         async setContext(payload: any, clientIdentity: OpenFin.ClientIdentity): Promise<void> {
//             const { context } = payload;

            
//             if (context.uuid && !context.uuid.includes(fin.me.uuid)) {
//                 const newContext = { ...context, uuid: [...context.uuid, fin.me.uuid] }
//                 await this.setContextOnExternalClients(newContext, clientIdentity);
//                 return super.setContext({ ...payload, newContext }, clientIdentity);
//             } else if (!context.uuid) {
//                 const newContext = { ...context, uuid: [fin.me.uuid] }
//                 await this.setContextOnExternalClients(newContext, clientIdentity);
//                 return super.setContext({ ...payload, newContext }, clientIdentity);
//             }
//         }
//     }

//     return (new Override(provider, options, ...args) as unknown as InteropBroker);
// }

// let platformConfig = null;

// if (fin.me.uuid === 'platform-1') {
//     platformConfig = { interopOverride };
// }

// if (fin.me.uuid === 'platform-2') {
//     platformConfig = { interopOverride: interopOverride2 };
// }

const platformConfig = (fin.me.uuid === 'platform-1' || fin.me.uuid === 'platform-2') ? { interopOverride } : null;

fin.Platform.init(platformConfig);
