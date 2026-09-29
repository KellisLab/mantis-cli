import { spawn } from 'node:child_process';

import { parseToolArgs } from '../utils/tool-args.js';

function openInBrowser(url) {
  const [bin, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  spawn(bin, args, { stdio: 'ignore', detached: true }).unref();
}

export function registerDriveCommands(program, { drive }, {
  output = (value) => console.log(JSON.stringify(value, null, 2)),
  failure = (error) => {
    console.error(JSON.stringify({ error: error.message, ...(error.code ? { code: error.code } : {}),
      ...(error.hint ? { hint: error.hint } : {}), ...(error.retryable ? { retryable: true } : {}) }));
    process.exitCode = error.exitCode || 1;
  },
  launch = openInBrowser,
} = {}) {
  const action = (operation) => async (...args) => {
    try { output(await operation(...args)); } catch (error) { failure(error); }
  };
  const ui = (command, build = () => ({})) => action((...args) => {
    const options = args[args.length - 2];
    return drive.command(command, build(...args), options);
  });
  const targeted = (cmd) => cmd.option('--map <id>', 'map the command is about').option('--tab <id>', 'one tab from `mantis ui status`')
    .option('--timeout <seconds>', 'seconds to wait for the tab, 1–30');

  program.command('open').description('Open (or print) the link that puts a tab on this thread')
    .option('--thread <id>', 'thread to open; default is the active thread').option('--chat <id>', 'Composer chat to open')
    .option('--print', 'print the link for a browser agent instead of opening it')
    .action(action((options) => {
      const link = drive.openLink(options);
      if (!options.print) launch(link.url);
      return link;
    }));

  program.command('doctor').description('Check key, API, thread and tools; optionally require an attached tab')
    .option('--ui', 'also require an attached browser tab')
    .action(async (options) => {
      try {
        const report = await drive.doctor({ requireUi: Boolean(options.ui) });
        output(report);
        if (!report.ok) process.exitCode = report.checks.some((c) => c.check === 'tab attached' && !c.ok) ? 5 : 1;
      } catch (error) { failure(error); }
    });

  program.command('state [fields...]').description('Live thread state: selection, plotSettings, bags, dataStore, pendingPage')
    .option('--map <id>', 'narrow per-map fields to one map')
    .action(action((fields, options) => drive.state({ fields, map: options.map })));

  program.command('selection [uris...]').description('Select points, clusters, bags or a map on the live map; with no URI, show the selection')
    .option('--focus <point-uri>', 'open one selected point as the focused point').option('--clear', 'clear the selection')
    .option('--map <id>', 'map to read or clear when the space has several')
    .action(action((uris, options) => {
      if (options.clear) return drive.clearSelection(options.map);
      return uris.length ? drive.select(uris, options) : drive.state({ fields: ['selection'], map: options.map });
    }));

  targeted(program.command('focus <uri>').description('Fly the camera to a point, cluster or bag'))
    .action(ui('view.focus', (uri) => ({ uri })));
  targeted(program.command('fit').description('Fit the whole map in view')).action(ui('view.fit'));

  const panel = program.command('panel').description('Open, close or list workspace panels in the tab');
  targeted(panel.command('open <panel>').option('--location <side>', 'left, right, top, bottom or center'))
    .action(ui('panel.open', (name, options) => ({ panel: name, ...(options.location ? { location: options.location } : {}) })));
  targeted(panel.command('close <panel>')).action(ui('panel.close', (name) => ({ panel: name })));
  targeted(panel.command('list')).action(ui('panel.list'));

  const group = program.command('ui').description('Drive your open tab: any command from `mantis ui status`');
  group.command('status').description('Attached tabs, your access level and the commands it allows')
    .option('--log <count>', 'recent drive commands with latency and outcome (developer access)')
    .action(action((options) => drive.status(options)));
  targeted(group.command('run <command>').description('Run one drive command, e.g. view.get, demo.caption, debug.perf')
    .allowUnknownOption().allowExcessArguments())
    .action(action((command, options) => {
      const index = process.argv.indexOf(command);
      const reserved = new Set(['--map', '--tab', '--timeout']);
      const rest = [];
      for (let i = index + 1; i < process.argv.length; i += 1) {
        if (reserved.has(process.argv[i])) { i += 1; continue; }
        rest.push(process.argv[i]);
      }
      return drive.command(command, parseToolArgs(rest), options);
    }));
  return program;
}
