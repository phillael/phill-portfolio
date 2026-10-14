import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)', '<rootDir>/src/**/*.test.ts?(x)'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/node_modules.nosync/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules.nosync/next/dist/compiled/',
  ],
  haste: {
    enableSymlinks: false,
  },
}

// three ships the meshopt decoder the 3D resume's cast uses as an ES module: let Jest transform it,
// so the tests run the same decoder the site does
const transformThree = (pattern: string) => pattern.replace('(?!(geist|', '(?!(three/examples/jsm|geist|')

const jestConfig = async (): Promise<Config> => {
  const resolved = await createJestConfig(config)()
  return { ...resolved, transformIgnorePatterns: resolved.transformIgnorePatterns?.map(transformThree) }
}

export default jestConfig
