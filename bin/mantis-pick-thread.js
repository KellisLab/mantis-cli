#!/usr/bin/env node
import { pickThread } from '../lib/picker.js';

const filter = process.argv.slice(2).join(' ').trim();
await pickThread(filter);
