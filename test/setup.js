// Test setup file
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}; 