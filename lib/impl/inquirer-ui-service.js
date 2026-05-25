import { confirm, input, password, search, select } from '@inquirer/prompts';

export class InquirerUiService {
  isCancel(err) {
    return err?.name === 'ExitPromptError';
  }

  die(msg) {
    console.error(`\n  ✖ ${msg}\n`);
    process.exit(1);
  }

  banner(title, subtitle) {
    console.log('');
    console.log(`  \x1b[36m${title}\x1b[0m`);
    if (subtitle) console.log(`  \x1b[2m${subtitle}\x1b[0m`);
    console.log('');
  }

  success(msg) {
    console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
  }

  info(msg) {
    console.log(`  \x1b[2m→\x1b[0m ${msg}`);
  }

  async promptInput(message, { default: def } = {}) {
    try {
      return await input({ message, default: def });
    } catch (e) {
      if (this.isCancel(e)) this.die('Cancelled.');
      throw e;
    }
  }

  async promptSecret(message, { default: def } = {}) {
    if (def) return this.promptInput(message, { default: def });
    try {
      return await password({ message, mask: '•' });
    } catch (e) {
      if (this.isCancel(e)) this.die('Cancelled.');
      throw e;
    }
  }

  async promptSearch(message, source, { pageSize = 12 } = {}) {
    try {
      return await search({ message, pageSize, source });
    } catch (e) {
      if (this.isCancel(e)) this.die('Cancelled.');
      throw e;
    }
  }

  async promptSelect(message, choices) {
    try {
      return await select({ message, choices });
    } catch (e) {
      if (this.isCancel(e)) this.die('Cancelled.');
      throw e;
    }
  }

  async promptConfirm(message, { default: def = false } = {}) {
    try {
      return await confirm({ message, default: def });
    } catch (e) {
      if (this.isCancel(e)) this.die('Cancelled.');
      throw e;
    }
  }
}
