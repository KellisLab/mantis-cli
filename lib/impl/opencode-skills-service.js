import os from 'node:os';
import path from 'node:path';

import { SKILLS_DIR } from '../utils/package-root.js';
import { syncSkills } from '../utils/skills-sync.js';

export class OpencodeSkillsService {
  sync(cwd = process.cwd()) {
    const globalSkillsDir = path.join(os.homedir(), '.config', 'opencode', 'skills');
    const projectSkillsDir = path.join(cwd, '.opencode', 'skills');
    const installed = syncSkills({
      skillsDir: SKILLS_DIR,
      targets: [globalSkillsDir, projectSkillsDir],
    });
    return { globalSkillsDir, projectSkillsDir, installed };
  }
}
