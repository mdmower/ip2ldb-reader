import Ip2lReader from './index';
import fs from 'fs';
import readline from 'readline';

const fsp = fs.promises;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('SIGINT', () => {
  process.stdout.write('\n');
  process.exit(0);
});

const exitWithError = (...args: string[]) => {
  console.log(...args);
  process.exit(1);
};

const exitWithInstructions = () => {
  exitWithError(
    'Download sample databases from\n' +
      'https://www.ip2location.com/development-libraries\n' +
      'into directory "database/" an run CLI test again.'
  );
};

(async function () {
  let databaseDirContents;
  try {
    databaseDirContents = await fsp.readdir('./database', {withFileTypes: true});
  } catch (ex) {
    return exitWithInstructions();
  }

  const databaseFiles = databaseDirContents.filter((x) => x.isFile() && /\.bin$/i.test(x.name));
  if (!databaseFiles.length) {
    return exitWithInstructions();
  }

  const databaseSelection = databaseFiles.map((f, i) => `  ${i + 1}: ${f.name}`);

  console.log('Type CTRL+C at any time to exit...\n');
  console.log('Available databases:\n' + databaseSelection.join('\n') + '\n');
  const selectedDatabase = await new Promise<string>((resolve) => {
    rl.question('Select a database (by number): ', resolve);
  });

  if (!/^\d+$/.test(selectedDatabase)) {
    return exitWithError('Invalid database selection');
  }

  const databaseFilename = databaseFiles[parseInt(selectedDatabase) - 1]?.name;
  if (!databaseFilename) {
    return exitWithError('Invalid database selection');
  }

  process.stdout.write(`Loading database '${databaseFilename}'... `);

  let ip2Location: Ip2lReader;
  try {
    ip2Location = new Ip2lReader('./database/' + databaseFilename, {reloadOnDbUpdate: true});
  } catch (ex) {
    return exitWithError(
      'Failed to initialize IP2Location' + (ex instanceof Error ? '\n' + ex.message : '')
    );
  }

  process.stdout.write('done.\n\n');

  const sampleIps = [
    '192.168.0.1',
    '8.8.8.8',
    '::FFFF:8.8.8.8',
    '2A04:0000:0000:0000:0000:0000:0000:0000',
    '2A04:6800:4001:c01::93',
  ];

  console.log('Sample IPs:\n' + sampleIps.join('\n') + '\n');

  const promptForIp = (): void => {
    rl.question('IP: ', (answer) => {
      try {
        const ip2lData = ip2Location.get(answer);
        console.log(ip2lData);
      } catch (ex) {
        console.error(ex);
      }

      promptForIp();
    });
  };

  promptForIp();

  // TODO: Move this to test suite once created
  // Loop test to ensure database watch feature doesn't cause a fatal
  // failure while .get() requests continue to arrive.
  /*
  let iteration = 0;
  setInterval(() => {
    iteration += 1;
    try {
      const ip2lData = ip2Location.get('2A04:6800:4001:c01::93');
      if (ip2lData.status !== 'OK') {
        console.log(`Status: ${ip2lData.status}`);
      } else {
        if (iteration % 40 === 0) {
          console.log(`Status: ${ip2lData.status}, Country: ${ip2lData.country_short}`);
        }
      }
    } catch (ex) {
      console.error(ex.message);
    }
  }, 50);
  */
})();
