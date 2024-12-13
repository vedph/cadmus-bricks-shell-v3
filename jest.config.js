module.exports = {
  preset: "jest-preset-angular",
  setupFilesAfterEnv: ["<rootDir>/setup-jest.ts"],
  modulePathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/"
  ],
  coverageReporters: ['html', 'text', 'lcovonly'],
};
