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
  displayName: "cadmus-refs-asserted-ids",
  coverageDirectory: "../../coverage/cadmus-refs-asserted-ids",
  moduleNameMapper: {
    "^@myrmidon/(?!cadmus-api|cadmus-core|auth-jwt-login|ngx-tools|ngx-mat-tools)(.*)$":
      "<rootDir>/../../../projects/myrmidon/$1/src/public-api",
  },
};
