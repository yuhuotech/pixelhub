#!/usr/bin/env node

const { execSync } = require('child_process')
const os = require('os')

const PORT = 3003

function killProcessOnPort(port) {
  try {
    if (os.platform() === 'win32') {
      // Windows
      try {
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
        if (result) {
          const pid = result.trim().split(/\s+/).pop()
          if (pid && pid !== 'PID' && !isNaN(pid)) {
            execSync(`taskkill /PID ${pid} /F`)
            console.log(`✓ Killed process ${pid} on port ${port}`)
          }
        }
      } catch (e) {
        // Port is available
      }
    } else {
      // macOS/Linux
      try {
        const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim()
        if (pids) {
          const pidArray = pids.split('\n').filter(p => p.trim())
          for (const pid of pidArray) {
            try {
              execSync(`kill -9 ${pid.trim()}`)
              console.log(`✓ Killed process ${pid.trim()} on port ${port}`)
            } catch (e) {
              // Already killed or permission issue
            }
          }
        }
      } catch (e) {
        // Port is available
      }
    }
    console.log(`✓ Port ${port} is ready`)
  } catch (error) {
    console.error(`✗ Error checking port: ${error.message}`)
  }
}

killProcessOnPort(PORT)
