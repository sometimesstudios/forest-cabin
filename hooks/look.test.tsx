import { expect, test } from 'claude-code/testing'

test('the backdrop draws the forest scene on desktop', async $ => {
  const ui = await $.ui.mount({
    plugin: 'forest-cabin',
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'forest-cabin', plugin: 'forest-cabin', glass: { blur: 18, opacity: 0.78 } },
  })

  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.unmount()
})
