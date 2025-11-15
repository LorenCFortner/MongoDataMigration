// Minimal test to check if the issue is with the test setup
const { execSync } = require('child_process');

console.log('Starting minimal test...');

try {
    const result = execSync('npm test Runner.specs.ts -- --testNamePattern="call mongo getMongoDatabase" --testTimeout=2000', { 
        timeout: 5000,
        encoding: 'utf8' 
    });
    console.log('Test completed:', result);
} catch (error) {
    console.log('Test timed out or failed:', error.message);
}

console.log('Minimal test done.');