import { aoslocal } from '@permaweb/loco'
import { test } from 'node:test'
import * as assert from 'node:assert'

// skip test first then add back next pr
test('genEnv should return nil', async () => {
    const aos = await aoslocal()

    const result = await aos.eval('if not os.getenv("PATH") then print([[2]]) else print([[1]]) end')
    // const result = await aos.eval('print(os.getenv([[PATH]]))')
    assert.equal(result.Output.data, '2')
})
