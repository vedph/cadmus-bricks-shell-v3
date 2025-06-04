module.exports = {
  preset: "jest-preset-angular",
  setupFilesAfterEnv: ["<rootDir>/src/setup-jest.ts"],
  testEnvironment: "jsdom",
  globals: {
    transform: {
      "^.+\\.(ts|js|html)$": [
        "ts-jest",
        {
          tsconfig: "<rootDir>/tsconfig.spec.json",
          stringifyContentPathRegex: "\\.(html|svg)$",
        },
      ],
    },
  },
  transformIgnorePatterns: ["node_modules/(?!.*\\.mjs$)"],
  displayName: "cadmus-refs-assertion",
  coverageDirectory: "../../coverage/cadmus-refs-assertion",
  moduleNameMapper: {
    "^@myrmidon/(.*)$":
      "<rootDir>/../../../projects/myrmidon/$1/src/public-api",
  },
};
