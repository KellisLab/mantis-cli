#!/usr/bin/env node
import { pickSpace } from '../lib/picker.js';

const filter = process.argv.slice(2).join(' ').trim();
await pickSpace(filter);
