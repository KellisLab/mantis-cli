/** @typedef {Object} MantisConfig
 * @property {string} [apiBaseUrl]
 * @property {string} [apiKey]
 * @property {string} [spaceId]
 * @property {string} [spaceName]
 * @property {string} [spaceStateId]
 * @property {string} [spaceStateName]
 */

/** @typedef {Object} Space
 * @property {string} id
 * @property {string} name
 * @property {number} [map_count]
 * @property {string} [role]
 */

/** @typedef {Object} Thread
 * @property {string} id
 * @property {string} name
 * @property {string} [updated_at]
 */

/** @typedef {Object} SpacePage
 * @property {Space[]} spaces
 * @property {number} total
 * @property {number} [limit]
 * @property {number} [offset]
 */

export {};
