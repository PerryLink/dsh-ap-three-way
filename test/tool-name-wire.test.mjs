import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import * as plugin from '../lib/plugin/index.js'

// The model wire format only accepts tool names matching ^[a-zA-Z0-9_-]+$.
// A dotted name (the 0.1.x style) is rejected by the provider with
// `Invalid 'tools[N].name'` and takes the whole tools array down with it,
// so the plugin registers but no request that carries the tools can succeed.
const WIRE_NAME = /^[a-zA-Z0-9_-]+$/

const EXPECTED = [
  'ap_import',
  'ap_import_invoice_xml',
  'ap_match',
  'ap_export',
  'ap_tolerance_match',
  'ap_duplicate_check',
]

const kv = () => {
  const map = new Map()
  return {
    get: (key) => map.get(key),
    entries: () => map.entries(),
    get size() {
      return map.size
    },
    put: async (key, value) => {
      map.set(key, value)
    },
    delete: async (key) => map.delete(key),
    values: () => [...map.values()],
  }
}

const fakeHost = () => {
  const tools = []
  const ctx = new Context()
  ctx.provide('tools', {
    register(tool) {
      tools.push(tool)
    },
  })
  ctx.provide('storageDomain', {
    async open() {
      return { table: () => kv(), close() {} }
    },
  })
  return { ctx, tools }
}

test('every registered tool name is a valid model wire name', async () => {
  process.env.DSH_AP_HOME = mkdtempSync(join(tmpdir(), 'dsh-ap-three-way-wire-'))
  const { ctx, tools } = fakeHost()
  await ctx.plugin(plugin)

  const names = tools.map((tool) => tool.name)
  assert.equal(tools.length, 6)
  for (const name of names) {
    assert.match(name, WIRE_NAME, `${name} would be rejected by the provider`)
    assert.ok(!name.includes('.'), `${name} must not contain a dot`)
    assert.ok(name.startsWith('ap_'), `${name} must keep the ap_ namespace`)
  }
  assert.equal(new Set(names).size, names.length, 'tool names must be unique')
  assert.deepEqual([...names].sort(), [...EXPECTED].sort())
})
