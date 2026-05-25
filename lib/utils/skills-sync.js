import fs from 'node:fs';
import path from 'node:path';

export function installSkillName(sourceDir) {
  return sourceDir === 'mantis' ? 'mantis' : `mantis-${sourceDir}`;
}

export function listSkillSources(skillsDir) {
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')))
    .map((d) => d.name)
    .sort();
}

export function prepareSkillContent(content, installName) {
  if (!content.startsWith('---\n')) {
    return `---\nname: ${installName}\n---\n\n${content}`;
  }
  const match = content.match(/^---\n([\s\S]*?)\n---([\s\S]*)$/);
  if (!match) return content;
  let yaml = match[1];
  const body = match[2];
  yaml = /^name:\s/m.test(yaml)
    ? yaml.replace(/^name:\s.*$/m, `name: ${installName}`)
    : `name: ${installName}\n${yaml}`;
  if (!/^description:\s/m.test(yaml)) {
    yaml = `${yaml}\ndescription: Mantis CLI skill (${installName}).`;
  }
  return `---\n${yaml}\n---${body}`;
}

export function syncSkills({ skillsDir, targets, installName = installSkillName }) {
  const installed = [];
  for (const source of listSkillSources(skillsDir)) {
    const name = installName(source);
    const raw = fs.readFileSync(path.join(skillsDir, source, 'SKILL.md'), 'utf8');
    const content = prepareSkillContent(raw, name);
    for (const root of targets) {
      const dest = path.join(root, name);
      fs.mkdirSync(dest, { recursive: true });
      fs.writeFileSync(path.join(dest, 'SKILL.md'), content);
    }
    installed.push({ source, name, slash: `/${name}` });
  }
  return installed;
}
