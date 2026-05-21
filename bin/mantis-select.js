#!/usr/bin/env node
import { pickSpace, pickThread } from '../lib/picker.js';
import { banner } from '../lib/ui.js';

banner('Mantis — switch space / thread');
await pickSpace();
await pickThread();
