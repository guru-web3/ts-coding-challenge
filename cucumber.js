/* eslint-disable */
module.exports = {
  default: {
    formatOptions: {
      snippetInterface: 'async-await',
    },
    paths: ['features/**/*.feature'],
    require: ['features/step_definitions/**/*.ts'],
    format: [
      'progress-bar',
      'html:cucumber-report.html',
      'json:test-results/cucumber-report.json',
    ],
    publishQuiet: true,
    requireModule: ['ts-node/register'],
  },
};
