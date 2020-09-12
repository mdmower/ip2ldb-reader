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
        console.log(`Status: ${ip2lData.status || 'null'}`);
      } else {
        if ((iteration - 1) % 40 === 0) {
          const country_short = ip2lData.country_short || '';
          const region = ip2lData.region || '';
          const subdivision = ip2lData.subdivision || '';
          console.log(
            `Iteration: ${iteration}, Status: ${ip2lData.status}\n  Country: ${country_short}, Region: ${region}, Subdivision: ${subdivision}`
          );
        }
      }
    } catch (ex) {
      console.error(ex instanceof Error ? ex.message : ex);
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

  const csvFiles = databaseDirContents.filter((x) => x.isFile() && /\.csv$/i.test(x.name));
  const csvSelection = csvFiles.map((f, i) => `  ${i + 1}: ${f.name}`);

  console.log('Type CTRL+C at any time to exit...\n');
  console.log('Available BIN databases:\n' + databaseSelection.join('\n') + '\n');
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
  let geoNameIdFilename: string | undefined;
  if (csvSelection.length) {
    console.log('\nAvailable CSV databases:\n' + csvSelection.join('\n') + '\n');
    const selectedSubdivision = await new Promise<string>((resolve) => {
      rl.question('Select a subdivision database by number (optional): ', resolve);
    });

    if (/^\d+$/.test(selectedSubdivision)) {
      subdivisionFilename = csvFiles[parseInt(selectedSubdivision) - 1]?.name;
    } else if (selectedSubdivision) {
      console.log('Invalid subdivision selection');
    }

    const selectedGeoNameId = await new Promise<string>((resolve) => {
      rl.question('Select a GeoName ID database by number (optional): ', resolve);
    });

    if (/^\d+$/.test(selectedGeoNameId)) {
      geoNameIdFilename = csvFiles[parseInt(selectedGeoNameId) - 1]?.name;
    } else if (selectedGeoNameId) {
      console.log('Invalid GeoName ID selection');
    }
  }

  console.log('\nLoading database(s):');
  console.log(`  ${databaseFilename}`);
  if (subdivisionFilename) {
    console.log(`  ${subdivisionFilename}`);
  }
  if (geoNameIdFilename) {
    console.log(`  ${geoNameIdFilename}`);
  }
  process.stdout.write('  ... ');

  let ip2Location: Ip2lReader;
  try {
    ip2Location = new Ip2lReader();
    await ip2Location.init('./database/' + databaseFilename, {
      reloadOnDbUpdate: true,
      subdivisionCsvPath: subdivisionFilename ? './database/' + subdivisionFilename : undefined,
      geoNameIdCsvPath: geoNameIdFilename ? './database/' + geoNameIdFilename : undefined,
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
    (key) => `  ${key}: ${supportedOperations[key] || ''}`
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
})().catch((error) => {
  console.error(`Unexpected error in main program\n`, error);
  process.exit(1);
});
