module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['cucumber/support/**/*.ts', 'cucumber/step_definitions/**/*.ts'],
    format: ['progress-bar', 'html:cucumber-report.html'],
  },
};
