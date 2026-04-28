module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['packages/perf-cucumber/**/*.ts', 'cucumber/step_definitions/**/*.ts'],
    format: ['progress-bar', 'html:cucumber-report.html'],
  },
};
