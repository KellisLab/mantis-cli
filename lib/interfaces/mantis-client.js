/** @typedef {import('../types.js').Space} Space */
/** @typedef {import('../types.js').Thread} Thread */
/** @typedef {import('../types.js').SpacePage} SpacePage */

/** @typedef {Object} MantisClient
 * @property {(opts?: object) => Promise<SpacePage>} listSpaces
 * @property {(spaceId: string, opts?: object) => Promise<{ space_states: Thread[], total: number }>} listSpaceStates
 * @property {() => Promise<{ access_mode: string, capabilities: string[], destructive_unlocked: boolean }>} getKeyStatus
 * @property {() => Promise<{ approval_token: string, destructive_unlocked: true }>} unlockDestructive
 * @property {() => Promise<{ destructive_unlocked: false }>} lockDestructive
 * @property {(spaceId: string, name?: string) => Promise<Thread>} createSpaceState
 * @property {(opts: { name: string, isPublic?: boolean }) => Promise<Space>} createSpace
 * @property {(spaceId: string, opts: object) => Promise<object>} createMapInSpace
 * @property {(mapId: string, opts: { text?: string, embedding?: number[], serviceName?: string, model?: string, persist?: boolean }) => Promise<object>} projectToMap
 * @property {(opts: { uri: string, spaceStateId: string, fields?: string[], includeEmbedding?: boolean }) => Promise<{ data: Buffer, rows: number, fields: string[] }>} exportUri
 * @property {(spaceId: string, file: string) => Promise<object>} installExtensionInSpace
 */

export {};
