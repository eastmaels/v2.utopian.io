#!/usr/bin/env node

const
  // fs = require('fs'),
  parseArgs = require('minimist'),
  // chalk = require('chalk'),
  spawn = require('quasar-cli/lib/helpers/spawn'),
  log = require('quasar-cli/lib/helpers/logger')('app:mode'),
  appPaths = require('quasar-cli/lib/build/app-paths'),
  // logger = require('quasar-cli/lib/helpers/logger'),
  // warn = logger('app:mode-test', 'red'),
  resolveGlobal = require('resolve-global')

let allTests = false

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    h: 'help',
    u: 'unit',
    w: 'watch', // just the -w flag breaks - use --watch
    e: 'e2e',
    t: 'type',
    q: 'quality',
    l: 'lighthouse',
    a: 'all',
    r: 'url',
    y: 'yes',
    o: 'options',
    p: 'outputpath',
    g: 'config'
  },
  boolean: ['h', 'u', 'e', 'a', 'l', 'y', 'w'],
  string: ['o', 'r', 'q', 'p', 'g', 't'],
  default: ['a']
})

if (argv.help) {
  console.log(`
    Description
      This command is a hook to all of the installed test-runners in quasar-cli. Calling it
      without any options is the same as calling it with the --all

     Options     
      --help, -h          Displays this message
      --all, -a           Run all tests 
      --unit, -u          Run unit tests and code coverage (default behaviour)
      --watch,            Watch for code changes       
      --options, -o       Generic options to pass to runners. Use at own peril.

      CYPRESS
      --e2e, -e           Run E2E tests
      --type, -t          Choose type of Cypress runner [verify|run|open]
      
      LIGHTHOUSE FLAGS
      --url, -r           Use this url for testing (needed by Lighthouse)
      --view, -v          Load into the browser
      --config, -g        Which config.js to load
      
      LIGHTHOUSE CLI
      --lighthouse, -l    Analyse site with Lighthouse CLI (requires a global install)
      --yes, -y           Overwrite results (instead of using a timestamp)
      
      LIGHTHOUSE NODE
      --quality, -q       Call Lighthouse with node bindings

    Usage
      § quasar test           # runs all tests 
      $ quasar test -u        # runs mocha-webpack & nyc --watch 
      $ quasar test -e        # runs e2e with cypress
      $ quasar test -l        # runs code quality with lighthouse (CLI)
      $ quasar test -q        # runs code quality with lighthouse (node)
  `)
  process.exit(0)
}

if (argv.all || !argv) {
  log(`Starting All Tests`)
  allTests = true
}

if (argv.unit || allTests !== false) {
  log(`Starting Unit Tests and Coverage`)
  // running mocha-webpack this way creates a secondary terminal
  spawn.sync('./node_modules/.bin/cross-env',
    ['NODE_ENV=test', './node_modules/.bin/nyc', './node_modules/.bin/mocha-webpack', '--watch'])
}

if (argv.e2e || allTests !== false) {
  log(`Starting E2E testing.`)
  let cypress = resolveGlobal.silent('cypress') ? 'cypress' : './node_modules/.bin/cypress'
  const type = !argv.type ? 'run' : argv.type // todo: better method (and check the argv!!!
  const config = !argv.config ? 'test/cypress.json' : argv.config // todo: better method and check that file exists
  spawn.sync(cypress,
    [type, `--config=${config}`])
}

if (argv.lighthouse || allTests !== false) {
  const lighthouse = resolveGlobal.silent('lighthouse') ? 'lighthouse' : null
  if (lighthouse === null) {
    // Not sure if this is good
    log(`Please install lighthouse globally. It won't run in this mode otherwise.
      $ yarn global add lighthouse      
    `)
    process.exit(0)
  } else {
    const url = !argv.url ? 'http://localhost:8080' : argv.url // todo: better method
    const config = !argv.config ? './test/quality/configs/full-config.js' : argv.config // todo: better method
    log(`Starting Lighthouse testing.`)
    const outputPath = !argv.outputpath ? './test/quality/reports/' : argv.outputpath // todo: better method
    const view = !argv.view ? '' : '--view' // todo: better method
    const now = !argv.yes ? '-' + Math.floor((new Date()).getTime() / 1000) : ''
    spawn.sync(lighthouse,
      [url, view, `--output-path=${outputPath}lighthouse-results${now}.html`, `--config-path=${config}`])
  }
}

if (argv.quality) {
  // todo: check for VALID types
  const testurl = !argv.url ? 'http://localhost:8080' : argv.url // todo: better method
  const options = !argv.options ? {
    chromeFlags: ['--show-paint-rects']
  } : argv.options // todo: better method
  // const quality = 'full' // !argv.quality ? 'full' : argv.quality
  const Performance = require(appPaths.testDir + '/quality/lighthouse-runner')
  const config = !argv.config ? './test/quality/configs/full-config.js' : argv.config // todo: better method
  const configPath = require(config)
  Performance.launchChromeAndRunLighthouse(testurl, options, configPath).then(results => {
    console.log(JSON.stringify(results))
  })
}
