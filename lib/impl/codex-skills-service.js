import os from 'node:os';
import path from 'node:path';

import { SKILLS_DIR } from '../utils/package-root.js';
import { syncSkills } from '../utils/skills-sync.js';

export class CodexSkillsService {
  sync(cwd = process.cwd(), { project = false } = {}) {
    const globalSkillsDir = path.join(os.homedir(), '.agents', 'skills');
    const targets = [globalSkillsDir];
    let projectSkillsDir;
    if (project) {
      projectSkillsDir = path.join(cwd, '.agents', 'skills');
      targets.push(projectSkillsDir);
    }
    const installed = syncSkills({ skillsDir: SKILLS_DIR, targets });
    return { globalSkillsDir, projectSkillsDir, installed };
  }
}
