/** @typedef {import('../types.js').Space} Space */
/** @typedef {import('../types.js').SpacePage} SpacePage */
/** @typedef {import('../types.js').Thread} Thread */

/** @typedef {Object} SpaceRepository
 * @property {(spaceId: string) => Promise<Space|null>} fetchById
 * @property {(text: string) => Promise<Space|null>} resolveFromInput
 * @property {(opts?: object) => Promise<SpacePage>} search
 * @property {() => Promise<Space[]>} fetchAccessible
 * @property {(spaceId: string) => Promise<Thread[]>} fetchThreads
 */

export {};
