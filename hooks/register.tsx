import type { Register, ThemeSetArgs } from 'claude-code'

import { problems, theme } from './colors.js'
import { SCENE } from './scene.js'

// Colors and the night-forest scene: the part every build that draws themes takes.
export const BASE: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'forest-cabin', glass: { blur: 18, opacity: 0.78 } },
}

// Quiet campfire ambience and soft wooden cues, played only once the person turns sound on.
export const SOUND: ThemeSetArgs['sound'] = {
  ambience: {
    reverb: 0.25,
    layers: [
      // wind through the pines
      { wave: 'brown', drone: true, gain: 0.12, filter: { type: 'lowpass', hz: 380, to: 620 } },
      // the fire's low breath
      { wave: 'pink', drone: true, gain: 0.05, filter: { type: 'lowpass', hz: 900 }, tremolo: { hz: 0.15, depth: 0.4 } },
      // crackling logs
      { wave: 'crackle', scatter: 2.5, gain: 0.22, attack: 0.002, release: 0.08, filter: { type: 'bandpass', hz: 2400 } },
      // a pop now and then
      { wave: 'crackle', scatter: 0.12, gain: 0.3, attack: 0.002, release: 0.25, filter: { type: 'lowpass', hz: 1800 } },
      // far crickets
      { wave: 'sine', notes: [4200, 4400], scatter: 0.35, gain: 0.03, attack: 0.01, release: 0.12, tremolo: { hz: 28, depth: 0.9 }, pan: 0.5 },
    ],
  },
  cues: {
    send: { layers: [{ wave: 'triangle', notes: ['G3'], gain: 0.22, attack: 0.002, release: 0.18, filter: { type: 'lowpass', hz: 1200 } }] },
    done: { reverb: 0.3, layers: [{ wave: 'triangle', notes: ['C4', 'G4'], step: 0.12, gain: 0.22, attack: 0.002, release: 0.35, filter: { type: 'lowpass', hz: 1600 } }] },
    ask: { layers: [{ wave: 'bell', notes: ['E5'], gain: 0.16, release: 0.6 }] },
    error: { layers: [{ wave: 'triangle', notes: ['D3', 'A2'], step: 0.14, gain: 0.2, release: 0.3, filter: { type: 'lowpass', hz: 900 } }] },
  },
}

// Messages sit on near-solid wood-toned cards so the words read over the scene.
export const STYLE: ThemeSetArgs['style'] = {
  UserMessage: { backgroundColor: 'surface-3', borderColor: 'border-strong', borderWidth: 1, radius: 14, paddingX: 14, paddingY: 10 },
  AssistantMessage: { backgroundColor: 'surface-1', radius: 12, paddingX: 16, paddingY: 12, shadow: { y: 2, blur: 10, color: '#0006' } },
  ToolUse: { backgroundColor: 'surface-2', radius: 8, paddingX: 8 },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    let set
    try {
      set = await $.theme.set({ ...BASE, sound: SOUND, style: STYLE })
    } catch (error) {
      // An older build that refuses sound or style: keep the colors and the scene.
      $.ui.log(String(error))
      set = await $.theme.set(BASE)
    }

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    if (e.props.scene !== 'forest-cabin') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="밤의 소나무 숲. 왼쪽 오두막의 큰 창 안에서 머리를 틀어 올린 여자가 한 손으로 턱을 괴고 다른 손으로 노트북을 치며 일하고, 벽에는 메모지가, 책상 위에는 잠든 고양이가 있다. 오른쪽 전구 줄 아래 모닥불 옆 통나무에 비니 쓴 남자가 무릎 위 노트북에 집중해 일하고, 옆에는 펼친 노트와 펜, 불 옆에는 잠든 강아지, 뒤에는 불빛이 새어 나오는 텐트가 있다." isInteractive />
  })
}
