import type {Config} from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest/presets/default-esm', // Use the ESM preset
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Redirect .js imports to the corresponding .ts file
    '^@agent(/?.*)$': '<rootDir>/src/agent$1',
    '^@components(/?.*)$': '<rootDir>/src/components$1',
    '^@contexts(/?.*)$': '<rootDir>/src/contexts$1',
    '^@styles(/?.*)$': '<rootDir>/src/styles$1',
    '^@helpers(/?.*)$': '<rootDir>/src/helpers$1',
    '^@machines(/?.*)$': '<rootDir>/src/machines$1',
    '^@objectstorage(/?.*)$': '<rootDir>/src/helpers/ObjectStorage$1',
    '^@public(/?.*)$': '<rootDir>/public$1',
    '^@typings(/?.*)$': '<rootDir>/src/types$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.(spec|test).+(ts|tsx|js)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

export default config
