import Ip2lReader from '../lib/index';
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

const queryByIp = (ip2Location: Ip2lReader) => {
  const sampleIps = [
    '  192.168.0.1',
    '  8.8.8.8',
    '  ::FFFF:8.8.8.8',
    '  2A04:0000:0000:0000:0000:0000:0000:0000',
    '  2A04:6800:4001:c01::93',
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

      process.stdout.write('\n');
      promptForIp();
    });
  };

  promptForIp();
};

const loopTest = (ip2Location: Ip2lReader) => {
  let iteration = 0;
  setInterval(() => {
    iteration += 1;
    try {
      const ip2lData = ip2Location.get('2A04:6800:4001:c01::93');
      if (ip2lData.status !== 'OK') {
        console.log(`Status: ${ip2lData.status}`);
      } else {
        if ((iteration - 1) % 40 === 0) {
          console.log(
            `Iteration: ${iteration}, Status: ${ip2lData.status}\n  Country: ${ip2lData.country_short}, Region: ${ip2lData.region}, Subdivision: ${ip2lData.subdivision}`
          );
        }
      }
    } catch (ex) {
      console.error(ex.message);
    }
  }, 50);
};

(async function () {
  let databaseDirContents: fs.Dirent[];
  try {
    databaseDirContents = await fsp.readdir('./database', {withFileTypes: true});
  } catch (ex) {
    return exitWithInstructions();
  }

  const databaseFiles = databaseDirContents.filter((x) => x.isFile() && /\.bin$/i.test(x.name));
  const databaseSelection = databaseFiles.map((f, i) => `  ${i + 1}: ${f.name}`);
  if (!databaseFiles.length) {
    return exitWithInstructions();
  }

  const subdivisionFiles = databaseDirContents.filter((x) => x.isFile() && /\.csv$/i.test(x.name));
  const subdivisionSelection = subdivisionFiles.map((f, i) => `  ${i + 1}: ${f.name}`);

  console.log('Type CTRL+C at any time to exit...\n');
  console.log('Available databases:\n' + databaseSelection.join('\n') + '\n');
  const selectedDatabase = await new Promise<string>((resolve) => {
    rl.question('Select a database by number: ', resolve);
  });

  if (!/^\d+$/.test(selectedDatabase)) {
    return exitWithError('Invalid database selection');
  }

  const databaseFilename = databaseFiles[parseInt(selectedDatabase) - 1]?.name;
  if (!databaseFilename) {
    return exitWithError('Invalid database selection');
  }

  let subdivisionFilename: string | undefined;
  if (subdivisionSelection.length) {
    console.log('\nAvailable subdivision databases:\n' + subdivisionSelection.join('\n') + '\n');
    const selectedSubdivision = await new Promise<string>((resolve) => {
      rl.question('Select a subdivision database by number (optional): ', resolve);
    });

    if (/^\d+$/.test(selectedSubdivision)) {
      subdivisionFilename = subdivisionFiles[parseInt(selectedSubdivision) - 1]?.name;
    } else {
      console.log('Invalid subdivision selection');
    }
  }

  process.stdout.write(`\nLoading database '${databaseFilename}'`);
  if (subdivisionFilename) {
    process.stdout.write(' with subdivision support');
  }
  process.stdout.write('... ');

  let ip2Location: Ip2lReader;
  try {
    ip2Location = new Ip2lReader();
    await ip2Location.init('./database/' + databaseFilename, {
      reloadOnDbUpdate: true,
      subdivisionCsvPath: subdivisionFilename ? './database/' + subdivisionFilename : undefined,
    });
  } catch (ex) {
    return exitWithError(
      'Failed to initialize IP2Location' + (ex instanceof Error ? '\n' + ex.message : '')
    );
  }

  process.stdout.write('done.\n\n');

  const supportedOperations: {[key: string]: string | undefined} = {
    '1': 'Query by IP input',
    '2': 'Loop test',
  };
  const operationsList = Object.keys(supportedOperations).map(
    (key) => `  ${key}: ${supportedOperations[key]}`
  );
  console.log('Operations:\n' + operationsList.join('\n') + '\n');

  const selectedOperation = await new Promise<string>((resolve) => {
    rl.question('Select operation (by number): ', resolve);
  });

  const operation = /^\d+$/.test(selectedOperation) && supportedOperations[selectedOperation];
  if (!operation) {
    return exitWithError('Invalid operation selection');
  }

  process.stdout.write('\n');
  switch (operation) {
    case 'Query by IP input': {
      queryByIp(ip2Location);
      break;
    }
    case 'Loop test': {
      loopTest(ip2Location);
      break;
    }
  }
})();
