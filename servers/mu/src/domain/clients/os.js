import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'

let procs = {}

function startMonitoredProcessWith({ logger }) {
    return async ({ id }) => {
        console.log('OS run ID:', id)
        const logFilePath = `${os.tmpdir()}/${id}.log`
        const out = fs.openSync(logFilePath, 'a')
        const err = fs.openSync(logFilePath, 'a')

        const child = spawn('node', ['cranker/src/index.js', id], {
            stdio: ['ignore', out, err], 
        });

        if (child && child.pid) {
            console.log(`Command executed with PID: ${child.pid}`)
            procs[id] = child
            return child.pid
        } else {
            console.log('Failed to execute command');
            throw new Error('Failed to execute command');
        }
    }
}

function killMonitoredProcessWith({ logger }) {
    return async ({ id }) => {
        const proc = procs[id]
        if (proc) {
            proc.kill()
            console.log(`Process with PID: ${proc.pid} has been killed.`)
            delete procs[id]
        } else {
            console.log(`No process found for ID: ${id}`)
            throw new Error(`No process found for ID: ${id}`)
        }
    }
}

export default {
    startMonitoredProcessWith,
    killMonitoredProcessWith
};