import path from 'node:path';

import { fieldSummary, inferFieldTypes } from '../utils/fields.js';
import { boolOption } from '../utils/cli-args.js';
import { spaceUrl } from '../utils/url.js';

export class MapService {
  constructor({ configStore, client, spaces, csvReader, ui }) {
    this.configStore = configStore;
    this.client = client;
    this.spaces = spaces;
    this.csvReader = csvReader;
    this.ui = ui;
  }

  async _chooseExistingSpace(filter = '') {
    const page = await this.spaces.search({ q: filter, limit: 12 });
    if (!page.spaces?.length) throw new Error('No spaces found.');
    return this.ui.promptSelect('Which space should receive this map?', page.spaces.map((s) => ({
      name: `${s.name} · ${s.map_count ?? 0} map(s) · ${s.role || 'space'}`,
      value: s,
      description: s.id,
    })));
  }

  async _resolveSpaceTarget(cfg, opts) {
    let mode = opts.spaceMode;
    if (!mode) {
      mode = await this.ui.promptSelect('Where should this map go?', [
        { name: 'Create a new space', value: 'new' },
        { name: 'Add to an existing space', value: 'existing' },
      ]);
    }

    if (mode === 'existing') {
      if (opts.spaceId) {
        const space = opts.spaceName ? null : await this.spaces.fetchById(opts.spaceId);
        return { spaceId: opts.spaceId, spaceName: opts.spaceName || space?.name };
      }
      const picked = await this._chooseExistingSpace(opts.spaceSearch || '');
      return { spaceId: picked.id, spaceName: picked.name };
    }

    const spaceName = opts.spaceName || await this.ui.promptInput('New space name', {
      default: path.basename(opts.file, path.extname(opts.file)) || 'Mantis Map',
    });
    const isPublic = opts.public != null
      ? boolOption(opts.public)
      : await this.ui.promptConfirm('Make this space public?', { default: false });
    return { spaceName, isPublic };
  }

  async createMap(file, opts = {}) {
    const cfg = this.configStore.requireAuth();
    const mapName = opts.mapName || await this.ui.promptInput('Map name', {
      default: path.basename(file, path.extname(file)),
    });
    const headers = this.csvReader.readHeaders(file);
    const dataTypes = opts.dataTypes ? JSON.parse(opts.dataTypes) : inferFieldTypes(headers, opts);
    this.ui.info(`Fields: ${fieldSummary(headers, dataTypes).join(' | ')}`);

    const target = await this._resolveSpaceTarget(cfg, { ...opts, file });

    let spaceId = target.spaceId;
    let spaceName = target.spaceName;
    if (!spaceId) {
      const space = await this.client.createSpace({ name: target.spaceName, isPublic: target.isPublic });
      spaceId = space.id;
      spaceName = space.name;
      this.ui.info(`Created space: ${spaceName} (${spaceId})`);
    }

    const result = await this.client.createMapInSpace(spaceId, {
      file,
      mapName,
      dataTypes,
      selectedFields: opts.selectedFields,
      fieldWeights: opts.fieldWeights,
    });

    const primaryMapId = result.map_id || result.base_map_id || result.map_ids?.[0];
    target.spaceName = spaceName;
    this.ui.success('Map creation started');
    this.ui.info(`Space: ${target.spaceName || spaceId} (${spaceId})`);
    this.ui.info(`Map:   ${mapName}${primaryMapId ? ` (${primaryMapId})` : ''}`);
    if (spaceId) this.ui.info(`Link:  ${spaceUrl(cfg.apiBaseUrl, spaceId)}`);

    const activate = opts.activate != null
      ? boolOption(opts.activate)
      : await this.ui.promptConfirm('Set this as the active Mantis space and thread?', { default: true });
    let thread = null;
    if (activate) {
      const threadName = opts.threadName || await this.ui.promptInput('Thread name', { default: `${mapName} Exploration` });
      thread = await this.client.createSpaceState(spaceId, threadName);
      const next = {
        ...cfg,
        spaceId,
        spaceName: target.spaceName || mapName,
        spaceStateId: thread.id,
        spaceStateName: thread.name,
      };
      this.configStore.save(next);
      this.ui.success(`Active thread: ${thread.name}`);
    }

    return {
      ...result,
      space_id: spaceId,
      map_id: primaryMapId,
      space_url: spaceId ? spaceUrl(cfg.apiBaseUrl, spaceId) : undefined,
      thread,
    };
  }
}
