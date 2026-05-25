import os from 'node:os';
import path from 'node:path';

import { SKILLS_DIR } from '../utils/package-root.js';
import { syncSkills } from '../utils/skills-sync.js';

export class ClaudeSkillsService {
  sync() {
    const skillsDir = path.join(os.homedir(), '.claude', 'skills');
    const installed = syncSkills({ skillsDir: SKILLS_DIR, targets: [skillsDir] });
    return { skillsDir, installed };
  }
}
