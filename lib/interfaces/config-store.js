/** @typedef {import('../types.js').MantisConfig} MantisConfig */

/** @typedef {Object} ConfigStore
 * @property {() => MantisConfig} load
 * @property {(cfg: MantisConfig) => void} save
 * @property {() => string} configPath
 * @property {() => string[]} allConfigPaths
 * @property {() => MantisConfig} requireAuth
 */

export {};
