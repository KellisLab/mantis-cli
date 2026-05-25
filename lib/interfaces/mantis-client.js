/** @typedef {import('../types.js').Space} Space */
/** @typedef {import('../types.js').Thread} Thread */
/** @typedef {import('../types.js').SpacePage} SpacePage */

/** @typedef {Object} MantisClient
 * @property {(opts?: object) => Promise<SpacePage>} listSpaces
 * @property {(spaceId: string, opts?: object) => Promise<{ space_states: Thread[], total: number }>} listSpaceStates
 * @property {(spaceId: string, name?: string) => Promise<Thread>} createSpaceState
 * @property {(opts: { name: string, isPublic?: boolean }) => Promise<Space>} createSpace
 * @property {(spaceId: string, opts: object) => Promise<object>} createMapInSpace
 */

export {};
