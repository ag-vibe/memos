export default {
  paths: ["e2e/src/features/**/*.feature"],
  import: ["e2e/src/steps/**/*.ts", "e2e/src/support/**/*.ts"],
  format: ["progress-bar", "html:e2e/artifacts/cucumber-report.html"],
  parallel: 1,
  publishQuiet: true,
  retry: 0,
};
