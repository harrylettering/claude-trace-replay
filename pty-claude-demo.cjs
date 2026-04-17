const pty = require('node-pty');
const fs = require('fs');

// Use a regex instead of strip-ansi to keep the PoC dependency-free.
const stripAnsi = (str) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
};

function getShell() {
    const shells = [process.env.SHELL, '/bin/zsh', '/bin/bash', '/bin/sh'];
    for (const s of shells) {
        if (s && fs.existsSync(s)) return s;
    }
    return 'sh';
}

const SHELL = getShell();
console.log(`--- [PoC] Deep PTY automation interception check (dependency-free) ---`);
console.log(`[System] Connected to background shell: ${SHELL}`);
console.log(`[Instructions]`);
console.log(`1. Type a command to verify bidirectional communication (for example: ls).`);
console.log(`2. To test automation, manually type or paste the following line and press Enter:`);
console.log(`   echo "1. Restore code and conversation"`);
console.log(`3. Watch whether the script automatically types "1" after 300ms.\n`);

// Start the PTY
const ptyProcess = pty.spawn(SHELL, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env 
});

let buffer = '';

// Listen to PTY output and mirror it to the terminal
ptyProcess.onData((data) => {
  // 1. Print the raw output to the current terminal
  process.stdout.write(data);

  // 2. Automation trigger detection
  buffer += stripAnsi(data);
  
  // Check whether the target menu text appears
  if (/Restore code and conversation/i.test(buffer)) {
    console.log('\n\n[!!! AUTOMATION TRIGGERED !!!] >>> Target menu detected, sending: 1');
    
    // Add a short delay for demonstration
    setTimeout(() => {
        ptyProcess.write('1\r');
        buffer = ''; // Reset the buffer
        console.log('[System] >>> Command "1" was sent to the background PTY.\n');
    }, 300);
  }
});

// Forward keyboard input to the PTY
process.stdin.on('data', (data) => {
  ptyProcess.write(data);
});

ptyProcess.onExit(({ exitCode }) => {
  console.log(`\n[System] PTY process exited.`);
  process.exit();
});
