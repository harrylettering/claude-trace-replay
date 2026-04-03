
const fs = require('fs');
const readline = require('readline');

const logPath = '/Users/harlihao/.claude/projects/-Users-harlihao-claude-project-claude-log-visualization/82f06c1c-e7a9-4824-a7fb-1b166490f792.jsonl';

const rl = readline.createInterface({
    input: fs.createReadStream(logPath),
    crlfDelay: Infinity
});

const types = new Map();
let count = 0;
const samples = [];

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const obj = JSON.parse(line);
        const type = obj.type || 'unknown';
        types.set(type, (types.get(type) || 0) + 1);
        count++;

        if (samples.length < 20) {
            samples.push({
                type,
                keys: Object.keys(obj),
                sample: obj
            });
        }
    } catch (e) {
        console.error('Parse error:', e.message);
    }
});

rl.on('close', () => {
    console.log('=== Log Analysis ===');
    console.log(`Total entries: ${count}`);
    console.log('\nEvent types:');
    types.forEach((cnt, type) => {
        console.log(`  ${type}: ${cnt}`);
    });

    console.log('\n=== Sample Entries ===');
    samples.forEach((s, i) => {
        console.log(`\n--- Sample ${i + 1} (${s.type}) ---`);
        console.log('Keys:', s.keys.join(', '));
        console.log('Content:', JSON.stringify(s.sample, null, 2).substring(0, 500));
    });
});
