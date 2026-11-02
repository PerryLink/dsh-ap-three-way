import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('quickstart sample reproduces the shipped gold output', () => {
  const output = execFileSync(process.execPath, [path.join(root, 'samples/quickstart/run.mjs'), '--json'], {
    cwd: root,
    encoding: 'utf8',
  })
  const gold = JSON.parse(readFileSync(path.join(root, 'samples/quickstart/expected/result.json'), 'utf8'))
  assert.deepEqual(JSON.parse(output), gold)
})
