/** @typedef {Object} UiService
 * @property {(msg: string) => never} die
 * @property {(title: string, subtitle?: string) => void} banner
 * @property {(msg: string) => void} success
 * @property {(msg: string) => void} info
 * @property {(message: string, opts?: object) => Promise<string>} promptInput
 * @property {(message: string, opts?: object) => Promise<string>} promptSecret
 * @property {(message: string, source: Function, opts?: object) => Promise<any>} promptSearch
 * @property {(message: string, choices: object[]) => Promise<any>} promptSelect
 * @property {(message: string, opts?: object) => Promise<boolean>} promptConfirm
 */

export {};
