// Builds the forest-cabin backdrop SVG and writes it into the mod as hooks/scene.ts.
// Usage: node tools/gen-scene.mjs hooks/scene.ts
import { writeFileSync } from 'node:fs'

const out = process.argv[2]
if (!out) throw new Error('usage: node gen-scene.mjs <path/to/scene.ts>')

// Deterministic pseudo-random so the scene is the same each build.
let seed = 20261125
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5
const r1 = n => Math.round(n * 10) / 10
const pts = list => list.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')

const W = 1600
const H = 1000

// ---------------------------------------------------------------- trees
// A pine with drooping, feathered tiers that differ left and right.
function pine(x, base, h, w, tiers) {
  const top = base - h
  const crown = h * 0.93
  const half = w / 2
  const R = []
  const L = []
  let prevR = [x, top]
  let prevL = [x, top]
  for (let k = 1; k <= tiers; k++) {
    const t = k / tiers
    const y = top + crown * Math.pow(t, 0.95)
    const spread = half * (0.16 + 0.84 * t)
    const sr = spread * (1 + (rand() - 0.5) * 0.32)
    const sl = spread * (1 + (rand() - 0.5) * 0.32)
    const droop = h * (0.012 + rand() * 0.012)
    const tipR = [x + sr, y + droop]
    const tipL = [x - sl, y + droop]
    // a feathered edge between the last notch and this tip
    const jag = (a, b, s) => [a[0] + (b[0] - a[0]) * 0.55 + s * h * 0.006, a[1] + (b[1] - a[1]) * 0.55 - h * 0.014]
    R.push(jag(prevR, tipR, 1), tipR)
    L.push(jag(prevL, tipL, -1), tipL)
    if (k < tiers) {
      const ny = y - h * 0.01
      prevR = [x + sr * (0.32 + rand() * 0.12), ny + h * 0.022]
      prevL = [x - sl * (0.32 + rand() * 0.12), ny + h * 0.022]
      R.push(prevR)
      L.push(prevL)
    }
  }
  const tw = Math.max(1.5, w * 0.045)
  const trunkTop = top + crown + h * 0.01
  const apex = [x + (rand() - 0.5) * 1.5, top]
  const right = [...R, [x + tw, trunkTop], [x + tw * 1.15, base]]
  const left = [[x - tw * 1.15, base], [x - tw, trunkTop], ...L.reverse()]
  return 'M' + pts([apex, ...right, ...left]) + 'Z'
}

function treeRow({ count, baseY, hMin, hMax, wRatio, jitter, tiers, skip }) {
  const trees = []
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * (W + 120) - 60 + (rand() - 0.5) * jitter
    const h = hMin + rand() * (hMax - hMin)
    const base = baseY + rand() * 16
    if (skip && skip(x)) continue
    trees.push(pine(x, base, h, h * wRatio * (0.9 + rand() * 0.2), tiers))
  }
  return trees
}

// ---------------------------------------------------------------- land
function ridge(y, amp, steps, smooth) {
  const p = []
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W
    p.push([x, y - Math.sin(i * smooth) * amp * 0.5 - Math.sin(i * smooth * 2.3 + 1) * amp * 0.25 - rand() * amp * 0.35])
  }
  return `M0 ${H}L` + pts(p) + `L${W} ${H}Z`
}

const groundY = x => 968 + 4 * Math.sin(x / 90) + 2.5 * Math.sin(x / 31 + 2)

function groundPath() {
  const p = []
  for (let x = 0; x <= W; x += 20) p.push([x, groundY(x)])
  return `M0 ${H}L` + pts(p) + `L${W} ${H}Z`
}

function grass() {
  let d = ''
  for (let x = 4; x < W; x += 6 + rand() * 9) {
    if (rand() < 0.25) continue
    const y = groundY(x) + 1.5
    const blades = 2 + Math.floor(rand() * 3)
    for (let b = 0; b < blades; b++) {
      const bx = x + (b - blades / 2) * 2.2
      const h = 5 + rand() * 11
      const lean = (rand() - 0.5) * 6
      d += `M${r1(bx - 1.1)} ${r1(y)}L${r1(bx + lean)} ${r1(y - h)}L${r1(bx + 1.1)} ${r1(y)}Z`
    }
  }
  return d
}

// ---------------------------------------------------------------- sky
let stars = ''
for (let i = 0; i < 150; i++) {
  const x = r1(rand() * W)
  const y = r1(rand() * 540)
  const rr = r1(0.45 + rand() * rand() * 1.5)
  const tint = ['', ' s-warm', ' s-cool'][Math.floor(rand() * 3)]
  const tw = i % 4 === 0 ? ` tw tw${i % 3}` : ''
  stars += `<circle cx="${x}" cy="${y}" r="${rr}" class="st${tint}${tw}"/>`
}
// dust of the milky way, along a tilted band
let dust = ''
for (let i = 0; i < 170; i++) {
  const x = rand() * W
  const y = 470 - x * 0.2 + gauss() * 55
  if (y < 0 || y > 540) continue
  dust += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(0.3 + rand() * 0.6)}"/>`
}
// a few bright stars with soft cross glints
let glints = ''
const glintAt = [[260, 210], [560, 120], [890, 260], [1110, 160], [1330, 330], [720, 420]]
glintAt.forEach(([x, y], i) => {
  glints += `<g class="glint gl${i % 3}" transform="translate(${x} ${y})"><circle r="9" fill="url(#fc-star-glow)"/><path d="M-7 0H7M0 -7V7"/><circle r="1.5" class="glint-core"/></g>`
})

// ---------------------------------------------------------------- fireflies
let flies = ''
for (let i = 0; i < 18; i++) {
  const side = i % 2 === 0 ? 240 + rand() * 300 : W - rand() * 300
  const x = r1(side)
  const y = r1(700 + rand() * 230)
  const dur = r1(9 + rand() * 8)
  const delay = r1(-rand() * 14)
  flies += `<g class="fly" style="animation-duration:${dur}s;animation-delay:${delay}s"><circle cx="${x}" cy="${y}" r="9" fill="url(#fc-fly-glow)"/><circle cx="${x}" cy="${y}" r="1.6" class="fly-core"/></g>`
}

// ---------------------------------------------------------------- cabin (C: a big window close by)
let planks = ''
for (let y = 196; y < 412; y += 15) planks += `M-200 ${y}H352`

const cabin = `
<g transform="translate(150 560)">
  <!-- the window's glow on the wall, and the light it lays on the grass -->
  <circle cx="202" cy="292" r="240" fill="url(#c-halo)" class="win-halo"/>
  <ellipse cx="205" cy="414" rx="200" ry="20" fill="url(#c-pool)"/>
  <!-- the cabin wall, cut by the left edge of the picture -->
  <path d="M-200 110L370 172V412H-200Z" class="c-wall"/>
  <path d="${planks}" class="c-plank"/>
  <circle cx="202" cy="292" r="200" fill="url(#c-wall-lit)"/>
  <rect x="352" y="166" width="18" height="246" class="c-post"/>
  <rect x="368" y="166" width="3" height="246" class="c-post-rim"/>
  <path d="M-200 98L370 180V214L-200 134Z" class="c-eave-shadow"/>
  <!-- deep roof eave -->
  <path d="M-220 56L398 152L392 184L-220 90Z" class="c-roof"/>
  <path d="M-220 90L392 184L390 191L-220 98Z" class="c-roof-under"/>
  <path d="M-220 56L398 152" class="c-roof-rim"/>
  <!-- the window -->
  <rect x="104" y="214" width="196" height="150" rx="3" class="c-frame"/>
  <rect x="114" y="224" width="176" height="130" fill="url(#c-room)"/>
  <g clip-path="url(#c-win-clip)">
    <circle cx="262" cy="304" r="80" fill="url(#c-lamp)" class="lamp-glow"/>
    <!-- shelf and a trailing plant -->
    <rect x="120" y="250" width="54" height="3" class="i-shelf"/>
    <rect x="186" y="232" width="9" height="9" class="note n1" transform="rotate(-6 190 236)"/>
    <rect x="198" y="236" width="9" height="9" class="note n2" transform="rotate(5 202 240)"/>
    <rect x="190" y="246" width="9" height="9" class="note n3" transform="rotate(-3 194 250)"/>
    <rect x="124" y="236" width="6" height="14" class="i-b1"/><rect x="131" y="239" width="5" height="11" class="i-b2"/><rect x="137" y="234" width="7" height="16" class="i-b3"/>
    <path d="M152 250h12l-1.5 -8h-9Z" class="i-pot"/>
    <path d="M158 242C152 236 150 232 151 228M158 242C164 236 168 233 170 230" class="i-stem"/>
    <path d="M234 224V236" class="i-cord"/><path d="M226 236h16l-2 9h-12Z" class="i-pot"/>
    <path d="M230 245C226 256 228 266 224 276M238 245C242 254 240 262 244 270" class="i-vine"/>
    <circle cx="225" cy="258" r="3" class="i-leaf"/><circle cx="226" cy="270" r="2.6" class="i-leaf"/><circle cx="242" cy="256" r="3" class="i-leaf"/><circle cx="243" cy="267" r="2.6" class="i-leaf"/>
    <!-- chair, desk -->
    <path d="M146 336V292C146 284 150 280 154 280C158 280 160 284 160 292V336Z" class="i-chair"/>
    <rect x="114" y="330" width="176" height="6" class="i-desk"/>
    <rect x="114" y="336" width="176" height="18" class="i-desk-front"/>
    <!-- the coder, hunched toward the laptop, chin on a hand -->
    <circle cx="224" cy="298" r="26" fill="url(#c-screen)" class="screen-glow"/>
    <path d="M156 336C152 318 157 303 170 297C182 291 197 295 203 305C207 313 209 325 209 336Z" class="i-sweater"/>
    <path d="M156 336C153 320 157 306 168 299C163 312 162 324 165 336Z" class="i-sweater-shade"/>
    <path d="M176 300C184 297 192 298 198 302" class="i-fold"/>
    <path d="M193 297L201 293L204 301L196 304Z" class="i-skin"/>
    <circle cx="203" cy="286" r="14.5" class="i-skin"/>
    <path d="M191 279A14.5 14.5 0 0 0 194 297.5A17 17 0 0 1 191 279Z" class="i-skin-shade"/>
    <circle cx="217" cy="289" r="2.3" class="i-skin"/>
    <path d="M188 290C185 277 192 269 203 270C211 270.5 216 275 216.5 280C210 277 203 277.5 198 282C195 285 194 290 194 295C191 295 189 293 188 290Z" class="i-hair"/>
    <circle cx="190" cy="272" r="6.5" class="i-hair"/>
    <path d="M189 291C187 295 188 299 190 301" class="i-strand"/>
    <ellipse cx="195.5" cy="287.5" rx="3.2" ry="4.6" class="i-ear"/>
    <path d="M194.6 285.5C196 286.2 196.6 288 195.8 289.6" class="i-ear-in"/>
    <ellipse cx="208.6" cy="287.4" rx="1.7" ry="2.1" class="i-eye"/>
    <circle cx="209.2" cy="286.7" r=".55" class="i-eye-hi"/>
    <path d="M206.4 284.6Q208.6 283.6 210.8 284.4" class="i-lash"/>
    <ellipse cx="210" cy="292.5" rx="3" ry="1.8" class="i-cheek"/>
    <path d="M211 297q1.6 .9 3 0" class="i-mouth"/>
    <!-- the far hand on the keys -->
    <path d="M200 314C210 318 220 322 230 325" class="i-arm-far"/>
    <ellipse cx="232" cy="325.6" rx="4" ry="2.8" class="i-skin-far typing"/>
    <!-- the arm, elbow on the desk, hand under the chin -->
    <path d="M196 312C202 320 208 326 213 328" class="i-arm"/>
    <path d="M214 328C215 318 214 309 211 302" class="i-arm"/>
    <ellipse cx="210.5" cy="300" rx="4.6" ry="4" class="i-skin"/>
    <!-- laptop -->
    <rect x="224" y="326" width="30" height="4" rx="1" class="i-lap-base"/>
    <path d="M250 326L256 297L259.5 298L253.5 327Z" class="i-lap-lid"/>
    <path d="M249.2 325L255 298.5" class="i-lap-glow"/>
    <!-- desk lamp -->
    <path d="M262 301L250 330H292L276 298Z" class="i-cone"/>
    <rect x="262" y="327" width="18" height="3" rx="1" class="i-lamp"/>
    <path d="M271 328V307L263 298" class="i-lamp-arm"/>
    <path d="M254 295L271 287L275 297L260 303Z" class="i-shade"/>
    <rect x="279" y="318" width="8" height="9" rx="2" class="i-mug"/>
    <path d="M281 315C279 311 283 309 281 305M285 315C283 311 287 309 285 305" class="steam st2"/>
    <!-- a cat asleep on the desk -->
    <path d="M118 330C118 322 126 318 136 318C146 318 152 323 152 330Z" class="i-cat"/>
    <path d="M140 319C147 320 151 324 152 330H145C146 325 144 321 140 319Z" class="i-cat-shade"/>
    <circle cx="124" cy="323" r="5.5" class="i-cat"/>
    <path d="M120 319.5L120.6 314.5L124 318.2ZM124.4 318.2L127.6 314.6L128.6 319.6Z" class="i-cat"/>
    <path d="M121.4 323.6q.8 .7 1.6 0M125 323.6q.8 .7 1.6 0" class="i-cat-eye"/>
    <path d="M152 329C157 329 158 325 155 323" class="i-cat-tail"/>
    <path d="M114 224H134C130 244 124 258 126 266C128 284 124 320 118 354H114Z" class="i-curtain"/>
    <path d="M122 264C126 266 130 266 132 264" class="i-tie"/>
  </g>
  <path d="M114 224L170 224L114 290Z" class="c-glass"/>
  <rect x="96" y="358" width="212" height="12" rx="2" class="c-sill"/>
  <path d="M98 359.5H306" class="c-sill-lit"/>
  <path d="M126 372C124 364 130 360 134 366C136 358 144 358 144 366C148 360 156 362 154 370M196 372C194 364 200 360 204 366C206 358 214 358 214 366C218 360 226 362 224 370M248 372C248 365 254 362 258 368C262 362 270 364 268 372" class="c-plants"/>
  <rect x="118" y="370" width="168" height="12" rx="2" class="c-box"/>
  <path d="M118 371H286" class="c-sill-lit"/>
  <path d="M112 412L300 412L372 444L40 444Z" fill="url(#c-patch)"/>
  <g class="c-wood">
    <circle cx="318" cy="404" r="8"/><circle cx="334" cy="404" r="8"/><circle cx="326" cy="390" r="8"/><circle cx="342" cy="390" r="8"/><circle cx="334" cy="376" r="8"/>
  </g>
  <g class="c-wood-ring"><circle cx="318" cy="404" r="3"/><circle cx="334" cy="404" r="3"/><circle cx="326" cy="390" r="3"/><circle cx="342" cy="390" r="3"/><circle cx="334" cy="376" r="3"/></g>
</g>`

// ---------------------------------------------------------------- camp (C: string lights, a fire, a camper and a sleeping dog)
const FIRE_X = 1400
const FIRE_Y = 972
const wire = [[1296, 800], [1455, 862], [1614, 786]]
const bez = t => {
  const [[x0, y0], [x1, y1], [x2, y2]] = wire
  const u = 1 - t
  return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2]
}
let bulbs = ''
for (let i = 1; i <= 9; i++) {
  const [x, y] = bez(i / 10)
  bulbs += `<g class="bulb b${i % 3}"><circle cx="${r1(x)}" cy="${r1(y + 5)}" r="11" fill="url(#c-bulb)"/><circle cx="${r1(x)}" cy="${r1(y + 5)}" r="2.8" class="bulb-core"/></g><path d="M${r1(x)} ${r1(y)}v3" class="wire"/>`
}
const anchorTree = pine(1290, 986, 430, 140, 10)

const camp = `
<path d="${anchorTree}" fill="url(#fc-near)"/>
<path d="M${wire[0].join(' ')}Q${wire[1].join(' ')} ${wire[2].join(' ')}" class="wire"/>
${bulbs}
<ellipse cx="${FIRE_X}" cy="${FIRE_Y + 2}" rx="210" ry="28" fill="url(#fc-fire-ground)" class="ground-glow"/>
<!-- campfire -->
<g transform="translate(${FIRE_X} ${FIRE_Y}) scale(0.95)">
  <circle cx="0" cy="-26" r="90" fill="url(#fc-fire-halo)" class="halo"/>
  <ellipse cx="0" cy="-2" rx="26" ry="7" fill="url(#fc-embers)" class="embers"/>
  <g class="stones">
    <ellipse cx="-30" cy="-2" rx="8" ry="5"/><ellipse cx="-15" cy="2" rx="8" ry="5"/>
    <ellipse cx="0" cy="3" rx="8" ry="5"/><ellipse cx="15" cy="2" rx="8" ry="5"/>
    <ellipse cx="30" cy="-2" rx="8" ry="5"/>
  </g>
  <path d="M-34 -4C-33 -7 -30 -6 -29 -4M-19 0C-18 -3 -14 -3 -13 0M19 0C18 -3 14 -3 13 0M34 -4C33 -7 30 -6 29 -4" class="stone-lit"/>
  <path d="M-26 -4L22 -14L26 -9L-22 1Z" class="firelog"/>
  <path d="M26 -4L-22 -14L-26 -9L22 1Z" class="firelog"/>
  <circle cx="-24" cy="-1.5" r="3" class="log-cut"/><circle cx="24" cy="-1.5" r="3" class="log-cut"/>
  <path d="M-9 -12C-14 -20 -14 -26 -11 -32C-8 -26 -5 -22 -6 -14Z" fill="url(#fc-flame-a)" class="flame f-side1"/>
  <path d="M9 -12C14 -21 13 -27 10 -33C8 -27 5 -22 6 -14Z" fill="url(#fc-flame-a)" class="flame f-side2"/>
  <path d="M0 -60C9 -42 20 -32 16 -16C13 -7 -13 -7 -16 -16C-20 -29 -5 -38 0 -60Z" fill="url(#fc-flame-a)" class="flame f-outer"/>
  <path d="M2 -45C8 -33 12 -25 10 -15C7 -9 -7 -9 -10 -15C-12 -25 -3 -31 2 -45Z" fill="url(#fc-flame-b)" class="flame f-mid"/>
  <path d="M0 -31C4 -23 6 -19 4 -13C3 -10 -3 -10 -4 -13C-6 -19 -3 -23 0 -31Z" fill="url(#fc-flame-c)" class="flame f-core"/>
  <circle cx="-6" cy="-66" r="1.6" class="spark s1"/>
  <circle cx="8" cy="-72" r="1.4" class="spark s2"/>
  <circle cx="2" cy="-64" r="1.2" class="spark s3"/>
  <circle cx="-3" cy="-70" r="1.1" class="spark s4"/>
</g>
<!-- a dog asleep by the fire, lit on the side that faces it -->
<g transform="translate(1306 942)">
  <ellipse cx="34" cy="30" rx="34" ry="3.5" class="k-shadow"/>
  <path d="M14 28C8 26 4 22 6 17" class="d-tail"/>
  <path d="M6 30C4 18 15 10 31 10C48 10 60 17 62 30Z" fill="url(#k-g-dog)"/>
  <path d="M20 14C26 12 34 12 40 14" class="d-fur"/>
  <ellipse cx="56" cy="23" rx="10" ry="8.5" fill="url(#k-g-dog-head)"/>
  <path d="M50 17C45 18 44 24 47 28C49 26 51 21 50 17Z" class="d-ear"/>
  <path d="M56 22.5q2 1.6 4 .2" class="d-eye"/>
  <circle cx="65.4" cy="25.5" r="1.4" class="d-nose"/>
</g>
<!-- a backpack against the tree, a kettle warming by the stones -->
<path d="M1282 972C1279 960 1281 948 1288 944C1296 941 1303 945 1304 955L1305 972Z" fill="url(#k-g-pack)"/>
<path d="M1284 958H1303M1290 944C1290 939 1297 939 1297 944" class="k-strap"/>
<path d="M1426 970C1424 962 1428 956 1436 956C1444 956 1448 962 1446 970Z" fill="url(#k-g-kettle)"/>
<path d="M1428 960C1428 950 1444 950 1444 960M1426 962L1420 958" class="k-handle"/>
<!-- a tent behind him: lit on the fire side, a glow through the open door -->
<path d="M1546 872L1452 972M1546 872L1628 972" class="t-guy"/>
<path d="M1546 872L1474 970H1616Z" fill="url(#t-canvas)"/>
<path d="M1546 872L1528 970H1566Z" fill="url(#t-door)" class="tent-glow"/>
<path d="M1546 872L1510 970H1528Z" class="t-flap"/>
<path d="M1546 872L1510 970" class="t-seam"/>
<path d="M1546 872L1540 863M1546 872L1552 863" class="t-pole"/>
<path d="M1474 970H1616" class="t-hem"/>
<!-- the log seat -->
<ellipse cx="1506" cy="973" rx="66" ry="5" class="k-shadow"/>
<rect x="1446" y="950" width="120" height="22" rx="11" class="seat-k"/>
<ellipse cx="1452" cy="961" rx="6" ry="11" class="seat-k-lit"/>
<ellipse cx="1452" cy="961" rx="2.8" ry="5.4" class="seat-k-ring"/>
<!-- the camper, facing us: beanie, hoodie, laptop on the lap, lit by the fire on the left -->
<g transform="translate(1456 848) scale(.62)">
  <ellipse cx="80" cy="200" rx="58" ry="6" class="k-shadow"/>
  <!-- legs and boots -->
  <path d="M40 162C27 168 24 185 32 195L61 195C59 185 63 177 75 173Z" fill="url(#k-g-pants)"/>
  <path d="M120 162C133 168 136 185 128 195L99 195C101 185 97 177 85 173Z" fill="url(#k-g-pants-far)"/>
  <path d="M22 195C22 189 30 187 40 188L62 189C64 193 64 198 62 201H24C22 200 22 198 22 195Z" fill="url(#k-g-boot)"/>
  <path d="M98 189L120 188C130 187 138 189 138 195C138 198 138 200 136 201H98C96 198 96 193 98 189Z" class="k-boot"/>
  <!-- hood behind the neck, then the body with rounded, sloping shoulders -->
  <path d="M54 112C56 100 68 95 80 95C92 95 104 100 106 112Z" class="k-hood"/>
  <path d="M34 174C32 146 38 121 56 111C64 107 72 105 80 105C88 105 96 107 104 111C122 121 128 146 126 174Z" fill="url(#k-g-hoodie)"/>
  <path d="M74 112C73 118 74 124 72 129M86 112C87 118 86 124 88 129" class="k-string"/>
  <circle cx="72" cy="130" r="1.8" class="k-aglet"/><circle cx="88" cy="130" r="1.8" class="k-aglet"/>
  <!-- arms bent in toward the keyboard behind the lid -->
  <path d="M52 116C38 124 32 142 38 154C44 162 58 162 72 156L70 146C60 148 50 146 50 136C50 130 52 126 55 122Z" fill="url(#k-g-arm-near)" class="typing"/>
  <path d="M108 116C122 124 128 142 122 154C116 162 102 162 88 156L90 146C100 148 110 146 110 136C110 130 108 126 105 122Z" fill="url(#k-g-arm-far)" class="typing t2"/>
  <ellipse cx="80" cy="123" rx="36" ry="7" fill="url(#c-screen)" opacity=".6"/>
  <!-- laptop, its lid toward us -->
  <rect x="41" y="167" width="78" height="7" rx="3.5" class="k-base"/>
  <rect x="46" y="124" width="68" height="46" rx="5" fill="url(#k-g-lid2)"/>
  <path d="M50 125.5H110" class="k-lid-edge"/>
  <circle cx="80" cy="147" r="7.5" class="k-sticker"/>
  <path d="M80 142C82.6 145 83.4 147.6 81.8 149.8C80.9 150.8 79.1 150.8 78.2 149.8C76.6 147.6 77.4 145 80 142Z" class="k-sticker-mark"/>
  <!-- head, tilted a little -->
  <g transform="rotate(-6 80 96)">
    <ellipse cx="48.5" cy="76" rx="4" ry="6" class="k-ear-lit"/>
    <ellipse cx="111.5" cy="76" rx="4" ry="6" class="k-ear"/>
    <path d="M80 40C99 40 112 54 112 72C112 84 106 94 96 99C91 101.5 86 102.4 80 102.4C74 102.4 69 101.5 64 99C54 94 48 84 48 72C48 54 61 40 80 40Z" fill="url(#k-g-skin2)"/>
    <!-- short hair: sideburns and a short fringe -->
    <path d="M49 60C48 68 49 75 51.5 80C52.5 74 53.5 68 55.5 63Z" fill="url(#k-g-hair)"/>
    <path d="M111 60C112 68 111 75 108.5 80C107.5 74 106.5 68 104.5 63Z" class="k-hair"/>
    <path d="M50 57C54 62 58 64 62 65C63 62 65 60 68 59C70 62 73 63.5 77 64C78 61 80 59.5 83 59C85 62 89 63.5 93 63.5C95 61 98 59.5 101 59.5C104 61.5 107 62.5 110 62.5L110 56C98 50.5 62 50.5 50 56Z" fill="url(#k-g-hair)"/>
    <!-- calm eyes, looking down at the screen -->
    <ellipse cx="80" cy="92" rx="26" ry="13" fill="url(#c-screen)" opacity=".32"/>
    <path d="M61.5 71Q67 70.2 72.5 71.4" class="k-brow3"/>
    <path d="M87.5 71.6Q93 71 98.5 72.2" class="k-brow3"/>
    <ellipse cx="67.5" cy="81" rx="2.6" ry="2.8" class="k-iris"/>
    <ellipse cx="92.5" cy="81" rx="2.6" ry="2.8" class="k-iris"/>
    <path d="M64.6 79.4Q67.5 78 70.4 79.4M89.6 79.4Q92.5 78 95.4 79.4" class="k-lid"/>
    <circle cx="68.2" cy="81.6" r=".8" class="k-shine"/><circle cx="93.2" cy="81.6" r=".8" class="k-shine"/>
    <ellipse cx="61" cy="88" rx="4.5" ry="2.4" class="k-cheek soft"/>
    <ellipse cx="99" cy="88" rx="4.5" ry="2.4" class="k-cheek-dim"/>
    <path d="M79 86.6Q80 87.6 81 86.6" class="k-nose-line"/>
    <path d="M77.4 94Q80 94.8 82.6 94" class="k-mouth thin"/>
    <!-- beanie, slightly slouched, with a pompom -->
    <path d="M46 60C45 36 61 23 81 23C101 23 116 37 114 60Z" fill="url(#k-g-beanie)"/>
    <path d="M60 30C62 38 63 46 62 54M72 25.5C74 34 74.5 44 74 54M86 25C88 34 88.5 44 88 54M99 28.5C101 37 102 46 101.5 55" class="k-knit"/>
    <path d="M44 56C60 50.5 100 50.5 116 56L115.5 66C100 61 60 61 44.5 66Z" fill="url(#k-g-band)"/>
    <circle cx="82" cy="20" r="8.5" fill="url(#k-g-pom)"/>
  </g>
</g>
<!-- an open notebook and a pen on the log -->
<path d="M1538 949L1550 946L1562 949L1562 951L1550 948.4L1538 951Z" class="nb-page"/>
<path d="M1550 946V948.4" class="nb-spine"/>
<path d="M1540 948.6L1548 946.8M1552 946.8L1560 948.6" class="nb-lines"/>
<path d="M1544 945L1558 942" class="nb-pen"/>
<!-- a steaming mug -->
<rect x="1568" y="958" width="12" height="14" rx="3" class="mug-k"/>
<path d="M1580 961C1585 961 1585 968 1580 968" class="mug-k-handle"/>
<path d="M1571 952C1568 947 1574 944 1571 938" class="steam st1"/>
<path d="M1577 952C1574 947 1580 944 1577 938" class="steam st2"/>`

const cssC = `
.ch-a{stop-color:#ffb35c;stop-opacity:.3}.ch-b{stop-color:#ffb35c;stop-opacity:0}
.cp-a{stop-color:#ffb35c;stop-opacity:.26}.cp-b{stop-color:#ffb35c;stop-opacity:0}
.cw-a{stop-color:#6a3f22;stop-opacity:.55}.cw-b{stop-color:#6a3f22;stop-opacity:0}
.c-wall{fill:#14100d}.c-plank{fill:none;stroke:#0b0806;stroke-width:1.8}
.c-post{fill:#1b1511}.c-post-rim{fill:#7f93ad;opacity:.3}
.c-eave-shadow{fill:#000;opacity:.4}.c-roof{fill:#0d0a08}.c-roof-under{fill:#24190f}.c-roof-rim{stroke:#8ea3be;stroke-width:2;opacity:.35}
.c-frame{fill:#0b0806}.c-muntin{stroke:#0b0806;stroke-width:6}.c-glass{fill:#fff;opacity:.05}
.c-sill{fill:#100b08}.c-sill-lit{stroke:#e8a35a;stroke-width:1.6;opacity:.55}
.rm-1{stop-color:#c57d43}.rm-2{stop-color:#a1602f}
.lp-a{stop-color:#ffe2a6;stop-opacity:.75}.lp-b{stop-color:#ffe2a6;stop-opacity:0}
.sc-a{stop-color:#bfe0ff;stop-opacity:.45}.sc-b{stop-color:#bfe0ff;stop-opacity:0}
.i-shelf{fill:#4f321e}.i-b1{fill:#5f6e4f}.i-b2{fill:#934e30}.i-b3{fill:#34404a}.i-pot{fill:#934e30}
.i-stem,.i-vine{fill:none;stroke:#4f6b3e;stroke-width:1.6;stroke-linecap:round}.i-leaf{fill:#5f7f48}.i-cord{stroke:#2a1c12;stroke-width:1}
.i-chair{fill:#4a2e1c}.i-desk{fill:#5a3822}.i-desk-front{fill:#3c2416}
.i-sweater{fill:#efd8b0}.i-sweater-shade{fill:#c6a476}.i-arm{fill:none;stroke:#efd8b0;stroke-width:9;stroke-linecap:round}
.i-skin{fill:#f3c79f}.i-skin-shade{fill:#d39c76}.i-hair{fill:#4a2e22}
.i-ear{fill:#e9b38e}.i-ear-in{fill:none;stroke:#c48a68;stroke-width:1;stroke-linecap:round}
.i-eye{fill:#2a1c16}.i-cheek{fill:#e8826e;opacity:.5}.i-mouth{fill:none;stroke:#9a5a48;stroke-width:1.2;stroke-linecap:round}
.i-lap-base{fill:#7c7f86}.i-lap-lid{fill:#3a3f46}.i-lap-glow{stroke:#d6ecff;stroke-width:1.6}
.i-lamp{fill:#2e3338}.i-lamp-arm{fill:none;stroke:#2e3338;stroke-width:2.4;stroke-linecap:round}.i-shade{fill:#f1e4c8}
.i-cat{fill:#e2a064}.i-cat-shade{fill:#c07e48}.i-cat-eye{fill:none;stroke:#6a3a20;stroke-width:.8;stroke-linecap:round}.i-cat-tail{fill:none;stroke:#e2a064;stroke-width:2.6;stroke-linecap:round}
.lamp-glow{animation:glow 9s ease-in-out infinite}
.wire{fill:none;stroke:#05070a;stroke-width:1.3}
.cb-a{stop-color:#ffd27a;stop-opacity:.5}.cb-b{stop-color:#ffd27a;stop-opacity:0}.bulb-core{fill:#ffe3a0}
.bulb{animation:bulb 6s ease-in-out infinite}.b1{animation-delay:-2s}.b2{animation-delay:-4s}
@keyframes bulb{0%,100%{opacity:1}50%{opacity:.72}}
.k-plaid{fill:none;stroke:#e09a5a;stroke-width:2.4;opacity:.28}.k-plaid2{stroke:#1a0e0a;opacity:.35}
.k-sleeve{fill:none;stroke:#4a5440;stroke-width:9;stroke-linecap:round}
.k-ear{fill:#a87a66}.k-eye-line{fill:none;stroke:#1b120e;stroke-width:2.2;stroke-linecap:round}.k-eye-line.far{stroke-width:1.8;opacity:.8}
.k-knit{fill:none;stroke:#2a2014;stroke-width:1.6;opacity:.35;stroke-linecap:round}
.k-strap{fill:none;stroke:#141a17;stroke-width:2;stroke-linecap:round}.k-handle{fill:none;stroke:#2a2420;stroke-width:1.8;stroke-linecap:round}
.d-fur{fill:none;stroke:#6a5038;stroke-width:1.4;opacity:.6;stroke-linecap:round}
.i-fold{fill:none;stroke:#c6a476;stroke-width:1.4;stroke-linecap:round}
.i-strand{fill:none;stroke:#4a2e22;stroke-width:1.1;stroke-linecap:round}
.i-eye-line{fill:none;stroke:#2a1c16;stroke-width:1.3;stroke-linecap:round}
.i-mug{fill:#b0563e}.i-cone{fill:#fff0c8;opacity:.12}
.i-curtain{fill:#7a3426}.i-tie{fill:none;stroke:#c99a4a;stroke-width:2;stroke-linecap:round}
.c-plants{fill:none;stroke:#2a3a24;stroke-width:3;stroke-linecap:round}.c-box{fill:#120d0a}
.c-wood circle{fill:#2a1c13;stroke:#0e0907;stroke-width:1.2}.c-wood-ring circle{fill:none;stroke:#4a3020;stroke-width:1}
.k-arm{fill:none;stroke:#5e6040;stroke-width:12;stroke-linecap:round;stroke-linejoin:round}
.k-ear-in{fill:none;stroke:#6a4a3e;stroke-width:1.4;stroke-linecap:round}
.k-brow{fill:none;stroke:#3a2418;stroke-width:1.8;stroke-linecap:round}
.k-screen-edge{stroke:#d6ecff;stroke-width:1.6;stroke-linecap:round}
.k-aglet{fill:#a89a80}.k-lid-edge{stroke:#f0e2cc;stroke-width:1.2;opacity:.55}.k-sticker-mark{fill:#f2d2a0;opacity:.8}
.k-ear-lit{fill:#e6a884}.k-brow3{fill:none;stroke:#3a2418;stroke-width:2.3;stroke-linecap:round}.k-cheek.soft{opacity:.3}.k-brow2{fill:none;stroke:#5a3624;stroke-width:1.7;stroke-linecap:round}.k-lid{fill:none;stroke:#1e130e;stroke-width:2;stroke-linecap:round}.k-lash{fill:none;stroke:#1e130e;stroke-width:2.6;stroke-linecap:round}
.k-iris{fill:#2a1a14}.k-shine{fill:#fff6e6}.k-nose-line{fill:none;stroke:#b07a62;stroke-width:1.6;stroke-linecap:round}
.t-guy{stroke:#6a5a44;stroke-width:1;opacity:.45}.t-flap{fill:#3e2c1a}.t-seam{stroke:#2a1e12;stroke-width:1.4}
.t-pole{stroke:#2a1e12;stroke-width:2.4;stroke-linecap:round}.t-hem{stroke:#2a1e12;stroke-width:2.4}
.tent-glow{animation:glow 9s ease-in-out infinite}
.i-eye{fill:#2a1c16}.i-eye-hi{fill:#fff4e0}.i-lash{fill:none;stroke:#2a1c16;stroke-width:1.1;stroke-linecap:round}
.i-arm-far{fill:none;stroke:#d9bf94;stroke-width:7;stroke-linecap:round}.i-skin-far{fill:#e2b08c}
.note{opacity:.95}.n1{fill:#f2d06a}.n2{fill:#f2a58a}.n3{fill:#a8cfa0}
.typing{animation:typing 1.1s ease-in-out infinite}.t2{animation-delay:-.55s}
@keyframes typing{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}
.nb-page{fill:#d9c9a8}.nb-spine{stroke:#8a7a5c;stroke-width:.8}.nb-lines{stroke:#9a8a6a;stroke-width:.5}.nb-pen{stroke:#3a5a7a;stroke-width:1.6;stroke-linecap:round}
.k-shadow{fill:#000;opacity:.4}
.k-hood{fill:#22302a}.k-hoodie{fill:#2b3a33}.k-hoodie-lit{fill:#7b7a50}.k-rim{fill:none;stroke:#8fa6c4;stroke-width:2.6;stroke-linecap:round;opacity:.5}
.k-string{fill:none;stroke:#8a8170;stroke-width:2.4;stroke-linecap:round}
.k-pants{fill:#20262f}.k-pants-lit{fill:#58525a}.k-boot{fill:#271d16}.k-boot-lit{fill:#7a5034}
.k-skin{fill:#8a6457}.k-skin-lit{fill:#e8aa80}.k-hair{fill:#2e1f18}.k-hair-lit{fill:#86553a}
.k-beanie{fill:#58462a}.k-beanie-lit{fill:#d49b48}.k-band{fill:#4a3a22}.k-band-lit{fill:#b8833a}
.k-rib{stroke:#4a3a22;stroke-width:2.2;stroke-linecap:round}.k-rib-lit{stroke:#b8833a;stroke-width:2.2;stroke-linecap:round}
.k-pom{fill:#5e584e}.k-pom-lit{fill:#ead7b2}
.k-eye{fill:#1b120e}.k-eye-hi{fill:#ffe2b8;opacity:.9}.k-cheek{fill:#e8826e;opacity:.55}.k-cheek-dim{fill:#8a4c40;opacity:.35}
.k-nose{fill:#c98a64}.k-mouth{fill:none;stroke:#6a3428;stroke-width:2.4;stroke-linecap:round}.k-mouth.thin{stroke-width:1.5}.k-hood{fill:#2e3a32}.k-hood-fold{fill:none;stroke:#1c241f;stroke-width:1.6;stroke-linecap:round}
.k-lid{fill:#32353b}.k-lid-lit{fill:#b88a62}.k-base{fill:#22242a}.k-sticker{fill:#c46a4a}
.k-hand{fill:#9a7060}.k-hand-lit{fill:#f0b48a}
.d-body{fill:#33271f}.d-lit{fill:#c08a58}.d-ear{fill:#241a14}.d-eye{fill:none;stroke:#140d0a;stroke-width:1.2;stroke-linecap:round}.d-nose{fill:#140d0a}
.d-tail{fill:none;stroke:#33271f;stroke-width:4;stroke-linecap:round}
.seat-k{fill:#21150c}.seat-k-lit{fill:#9a6a40}.seat-k-ring{fill:none;stroke:#6a4426;stroke-width:1}
.mug-k{fill:#4a241c}.mug-k-handle{fill:none;stroke:#4a241c;stroke-width:2.6}
`

// ---------------------------------------------------------------- moon
const moon = `
<g transform="translate(1150 180)">
  <circle cx="300" cy="110" r="150" fill="url(#fc-moon-halo)"/>
  <g mask="url(#fc-crescent)">
    <circle cx="300" cy="110" r="34" class="moon"/>
    <circle cx="288" cy="122" r="5" class="crater"/><circle cx="279" cy="104" r="3.5" class="crater"/><circle cx="293" cy="135" r="3" class="crater"/>
  </g>
</g>`

// ---------------------------------------------------------------- layers
const farRidge = ridge(585, 70, 32, 0.45)
const nearRidge = ridge(640, 50, 28, 0.6)
const farTrees = treeRow({ count: 56, baseY: 650, hMin: 55, hMax: 125, wRatio: 0.4, jitter: 18, tiers: 6 }).join('')
const midTrees = treeRow({ count: 26, baseY: 772, hMin: 150, hMax: 260, wRatio: 0.38, jitter: 40, tiers: 8 })
const nearTrees = treeRow({ count: 9, baseY: 980, hMin: 300, hMax: 430, wRatio: 0.33, jitter: 60, tiers: 10 })
const style = `
.sky-a{stop-color:#040912}.sky-b{stop-color:#0a1724}.sky-c{stop-color:#11252c}.sky-d{stop-color:#1c3533}
.mw-a{stop-color:#c4d0de;stop-opacity:.07}.mw-b{stop-color:#c4d0de;stop-opacity:0}
.dust circle{fill:#dfe4ec;opacity:.45}
.st{fill:#e9e6da;opacity:.8}.s-warm{fill:#f3dcae}.s-cool{fill:#c9dcf2}
.tw{animation:tw 7s ease-in-out infinite}.tw1{animation-duration:9s;animation-delay:-3s}.tw2{animation-duration:8s;animation-delay:-5s}
@keyframes tw{0%,100%{opacity:.85}50%{opacity:.3}}
.sg-star-a{stop-color:#dfe8ff;stop-opacity:.45}.sg-star-b{stop-color:#dfe8ff;stop-opacity:0}
.glint path{stroke:#e6ecf8;stroke-width:.6;opacity:.55}.glint-core{fill:#f4f6fb}
.glint{animation:gl 10s ease-in-out infinite}.gl1{animation-delay:-4s}.gl2{animation-delay:-7s}
@keyframes gl{0%,100%{opacity:1}50%{opacity:.55}}
.moon{fill:#efe8cf}.crater{fill:#cfc6a6;opacity:.55}
.m-a{stop-color:#f2e7c4;stop-opacity:.2}.m-mid{stop-color:#f2e7c4;stop-opacity:.06}.m-b{stop-color:#f2e7c4;stop-opacity:0}
.hz-a{stop-color:#2b4a45;stop-opacity:0}.hz-b{stop-color:#2b4a45;stop-opacity:.35}
.r1a{stop-color:#1e3537}.r1b{stop-color:#142524}.r2a{stop-color:#172b29}.r2b{stop-color:#0f1d1b}
.tf-a{stop-color:#1a2f2c}.tf-b{stop-color:#11211e}
.tm-1{stop-color:#09140f}.tm-2{stop-color:#0c1a16}.tm-3{stop-color:#1d3331}
.tn-1{stop-color:#030806}.tn-2{stop-color:#06100c}.tn-3{stop-color:#152a29}
.fg-a{stop-color:#a9c2b4;stop-opacity:0}.fg-b{stop-color:#a9c2b4;stop-opacity:.1}
.fog{fill:url(#fc-fog);animation:fog 60s ease-in-out infinite alternate}
@keyframes fog{from{transform:translateX(-60px)}to{transform:translateX(60px)}}
.gr-a{stop-color:#0c1813}.gr-b{stop-color:#040806}.grass{fill:#08130e}
.fw-a{stop-color:#ff8a3a;stop-opacity:.16}.fw-b{stop-color:#ff8a3a;stop-opacity:0}
.firewash{animation:wash 4.2s ease-in-out infinite}
@keyframes wash{0%,100%{opacity:1}50%{opacity:.8}}
.fly{opacity:.7;animation-name:fly;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
.fy-a{stop-color:#f0dd73;stop-opacity:.4}.fy-b{stop-color:#f0dd73;stop-opacity:0}.fly-core{fill:#f8ec9c}
@keyframes fly{0%{transform:translate(0,0);opacity:.15}25%{opacity:.85}50%{transform:translate(26px,-34px);opacity:.35}75%{opacity:.9}100%{transform:translate(0,0);opacity:.15}}
.sp-a{stop-color:#ffb560;stop-opacity:.22}.sp-b{stop-color:#ffb560;stop-opacity:0}
.contact{fill:#000;opacity:.35}
.stones ellipse{fill:#34302c}.stone-lit{fill:none;stroke:#c98a4a;stroke-width:1.4;opacity:.6}
.firelog{fill:#4a2e1a}.log-cut{fill:#a3774a}
.fa-a{stop-color:#d8461a}.fa-b{stop-color:#ff8a2c}.fa-c{stop-color:#ffb347}
.fb-a{stop-color:#ff9a30}.fb-b{stop-color:#ffd36b}
.fc-a{stop-color:#fff1b8}.fc-b{stop-color:#ffe08a}
.em-a{stop-color:#ffb24a;stop-opacity:.9}.em-b{stop-color:#c2401a;stop-opacity:0}
.flame{transform-box:fill-box;transform-origin:50% 100%}
.f-outer{opacity:.95;animation:fl 2.6s ease-in-out infinite}
.f-mid{animation:fl 2.1s ease-in-out infinite;animation-delay:-.7s}
.f-core{animation:fl 1.8s ease-in-out infinite;animation-delay:-.3s}
.f-side1{animation:fl 2.3s ease-in-out infinite;animation-delay:-1.1s}.f-side2{animation:fl 2.8s ease-in-out infinite;animation-delay:-.4s}
@keyframes fl{0%,100%{transform:scale(1,1)}50%{transform:scale(.94,1.07)}}
.embers{animation:halo 3s ease-in-out infinite}
.halo{opacity:.6;animation:halo 3.4s ease-in-out infinite}
@keyframes halo{0%,100%{opacity:.6}50%{opacity:.48}}
.h-a{stop-color:#ff9a3c;stop-opacity:.5}.h-b{stop-color:#ff9a3c;stop-opacity:0}
.g-a{stop-color:#ff8a35;stop-opacity:.32}.g-b{stop-color:#ff8a35;stop-opacity:0}
.spark{fill:#ffc56a;opacity:0;animation:spark 5s linear infinite}
.s2{animation-delay:-1.7s;animation-duration:6s}.s3{animation-delay:-3.3s;animation-duration:5.5s}.s4{animation-delay:-2.4s;animation-duration:6.5s}
@keyframes spark{0%{transform:translateY(0);opacity:0}15%{opacity:.85}100%{transform:translate(6px,-70px);opacity:0}}
.puff{fill:#9aa3a0;opacity:0;animation:puff 12s ease-out infinite;transform-box:fill-box;transform-origin:50% 50%}
.p2{animation-delay:-4s}.p3{animation-delay:-8s}
@keyframes puff{0%{transform:translate(0,0) scale(.6);opacity:0}20%{opacity:.16}100%{transform:translate(40px,-120px) scale(2.2);opacity:0}}
.steam{fill:none;stroke:#d8d2c4;stroke-width:2;stroke-linecap:round;opacity:0;animation:steam 6s ease-out infinite}.st2{animation-delay:-3s}
@keyframes steam{0%{transform:translateY(6px);opacity:0}30%{opacity:.45}100%{transform:translateY(-10px);opacity:0}}
.hand-l{animation:tap 1.3s ease-in-out infinite}.hand-r{animation:tap 1.3s ease-in-out infinite;animation-delay:-.65s}
@keyframes tap{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}
.blink{transform-box:fill-box;transform-origin:50% 50%;animation:blink 6s ease-in-out infinite}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.2)}}
.screen-glow{animation:glow 7s ease-in-out infinite}
@keyframes glow{0%,100%{opacity:1}50%{opacity:.78}}
${cssC}
@media (prefers-color-scheme: light){
.sky-a{stop-color:#b9d3d6}.sky-b{stop-color:#cfe0d8}.sky-c{stop-color:#e3e8d6}.sky-d{stop-color:#efe6cf}
.stars,.dust,.glints,.flies,.milky{display:none}
.moon{fill:#fffaf0}.crater{display:none}.moon-cut{transform:translate(80px,0)}
.m-a{stop-color:#fff7dc;stop-opacity:.7}.m-mid{stop-color:#fff7dc;stop-opacity:.25}
.hz-a{stop-color:#ffffff;stop-opacity:0}.hz-b{stop-color:#ffffff;stop-opacity:.35}
.r1a{stop-color:#a9c0b2}.r1b{stop-color:#94ad9c}.r2a{stop-color:#8aa592}.r2b{stop-color:#78947f}
.tf-a{stop-color:#7f9c86}.tf-b{stop-color:#6a8a72}
.tm-1{stop-color:#3c5e46}.tm-2{stop-color:#47694f}.tm-3{stop-color:#6f8f73}
.tn-1{stop-color:#1f3a28}.tn-2{stop-color:#28472f}.tn-3{stop-color:#4d6e52}
.fg-a{stop-color:#ffffff}.fg-b{stop-color:#ffffff;stop-opacity:.32}
.gr-a{stop-color:#3d5a39}.gr-b{stop-color:#2a4029}.grass{fill:#345234}
.fw-a{stop-color:#ff9a4a;stop-opacity:.06}
.halo,.ground-glow{opacity:.3}
}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
`

const near = nearTrees.map(d => `<path d="${d}" fill="url(#fc-near)"/>`).join('')
const mid = midTrees.map(d => `<path d="${d}" fill="url(#fc-mid)"/>`).join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
<defs>
<linearGradient id="fc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-a"/><stop offset=".4" class="sky-b"/><stop offset=".62" class="sky-c"/><stop offset="1" class="sky-d"/></linearGradient>
<radialGradient id="fc-mw"><stop offset="0" class="mw-a"/><stop offset="1" class="mw-b"/></radialGradient>
<radialGradient id="fc-star-glow"><stop offset="0" class="sg-star-a"/><stop offset="1" class="sg-star-b"/></radialGradient>
<mask id="fc-crescent"><circle cx="300" cy="110" r="34" fill="#fff"/><circle cx="314" cy="100" r="31" class="moon-cut" fill="#000"/></mask>
<radialGradient id="fc-moon-halo"><stop offset="0" class="m-a"/><stop offset=".45" class="m-mid"/><stop offset="1" class="m-b"/></radialGradient>
<linearGradient id="fc-horizon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="hz-a"/><stop offset="1" class="hz-b"/></linearGradient>
<linearGradient id="fc-ridge1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="r1a"/><stop offset="1" class="r1b"/></linearGradient>
<linearGradient id="fc-ridge2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="r2a"/><stop offset="1" class="r2b"/></linearGradient>
<linearGradient id="fc-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="tf-a"/><stop offset="1" class="tf-b"/></linearGradient>
<linearGradient id="fc-mid" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="tm-1"/><stop offset=".62" class="tm-2"/><stop offset="1" class="tm-3"/></linearGradient>
<linearGradient id="fc-near" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="tn-1"/><stop offset=".66" class="tn-2"/><stop offset="1" class="tn-3"/></linearGradient>
<linearGradient id="fc-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fg-a"/><stop offset=".5" class="fg-b"/><stop offset="1" class="fg-a"/></linearGradient>
<linearGradient id="fc-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="gr-a"/><stop offset="1" class="gr-b"/></linearGradient>
<radialGradient id="fc-firewash"><stop offset="0" class="fw-a"/><stop offset="1" class="fw-b"/></radialGradient>
<radialGradient id="fc-fly-glow"><stop offset="0" class="fy-a"/><stop offset="1" class="fy-b"/></radialGradient>
<radialGradient id="fc-fire-ground"><stop offset="0" class="g-a"/><stop offset="1" class="g-b"/></radialGradient>
<radialGradient id="fc-fire-halo"><stop offset="0" class="h-a"/><stop offset="1" class="h-b"/></radialGradient>
<radialGradient id="fc-embers"><stop offset="0" class="em-a"/><stop offset="1" class="em-b"/></radialGradient>
<linearGradient id="fc-flame-a" x1="0" y1="1" x2="0" y2="0"><stop offset="0" class="fa-a"/><stop offset=".55" class="fa-b"/><stop offset="1" class="fa-c"/></linearGradient>
<linearGradient id="fc-flame-b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" class="fb-a"/><stop offset="1" class="fb-b"/></linearGradient>
<linearGradient id="fc-flame-c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" class="fc-a"/><stop offset="1" class="fc-b"/></linearGradient>
<radialGradient id="c-halo"><stop offset="0" class="ch-a"/><stop offset="1" class="ch-b"/></radialGradient>
<radialGradient id="c-pool"><stop offset="0" class="cp-a"/><stop offset="1" class="cp-b"/></radialGradient>
<radialGradient id="c-wall-lit"><stop offset="0" class="cw-a"/><stop offset="1" class="cw-b"/></radialGradient>
<linearGradient id="c-room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rm-1"/><stop offset="1" class="rm-2"/></linearGradient>
<radialGradient id="c-lamp"><stop offset="0" class="lp-a"/><stop offset="1" class="lp-b"/></radialGradient>
<radialGradient id="c-screen"><stop offset="0" class="sc-a"/><stop offset="1" class="sc-b"/></radialGradient>
<radialGradient id="c-bulb"><stop offset="0" class="cb-a"/><stop offset="1" class="cb-b"/></radialGradient>
<linearGradient id="k-g-blanket" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8552f"/><stop offset=".45" stop-color="#6a3222"/><stop offset=".9" stop-color="#2c1712"/><stop offset="1" stop-color="#3c3f52"/></linearGradient>
<linearGradient id="k-g-blanket-front" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d27a46"/><stop offset="1" stop-color="#8a4230"/></linearGradient>
<linearGradient id="k-g-hoodie" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d7a50"/><stop offset=".5" stop-color="#3e4a3a"/><stop offset="1" stop-color="#232c27"/></linearGradient>
<linearGradient id="k-g-skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f0b48c"/><stop offset=".55" stop-color="#c08870"/><stop offset="1" stop-color="#6e5148"/></linearGradient>
<linearGradient id="k-g-beanie" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d8a252"/><stop offset=".5" stop-color="#8f6a34"/><stop offset="1" stop-color="#40321e"/></linearGradient>
<linearGradient id="k-g-band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c08a3e"/><stop offset="1" stop-color="#4a3a22"/></linearGradient>
<linearGradient id="k-g-pants" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e6676"/><stop offset=".5" stop-color="#3e3e4a"/><stop offset="1" stop-color="#1f242d"/></linearGradient>
<linearGradient id="k-g-pants-far" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3e3e4a"/><stop offset="1" stop-color="#1a1e26"/></linearGradient>
<linearGradient id="k-g-boot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a6440"/><stop offset="1" stop-color="#3a2a1e"/></linearGradient>
<linearGradient id="k-g-lid" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8966a"/><stop offset=".25" stop-color="#5a5452"/><stop offset="1" stop-color="#2c2e34"/></linearGradient>
<linearGradient id="k-g-dog" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a201a"/><stop offset=".55" stop-color="#4a3626"/><stop offset="1" stop-color="#c8905c"/></linearGradient>
<linearGradient id="k-g-dog-head" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a4230"/><stop offset="1" stop-color="#d49a64"/></linearGradient>
<linearGradient id="k-g-pack" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#151d1a"/><stop offset=".6" stop-color="#263028"/><stop offset="1" stop-color="#6a4a2c"/></linearGradient>
<linearGradient id="k-g-kettle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d08a54"/><stop offset="1" stop-color="#3a3430"/></linearGradient>
<linearGradient id="c-patch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c" stop-opacity=".2"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></linearGradient>
<clipPath id="k-blanket-clip"><path d="M64 86C78 74 112 70 132 84C148 96 156 124 156 150C156 160 152 168 146 170C138 166 132 172 124 174C118 170 114 172 110 172C112 150 106 128 96 114C88 102 76 94 64 94Z"/></clipPath>
<linearGradient id="k-g-face" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2b68c"/><stop offset=".55" stop-color="#d49a7c"/><stop offset="1" stop-color="#8e6658"/></linearGradient>
<linearGradient id="k-g-scarf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d0743e"/><stop offset="1" stop-color="#7a3426"/></linearGradient>
<linearGradient id="k-g-skin2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6c39c"/><stop offset=".55" stop-color="#e0aa8a"/><stop offset="1" stop-color="#9a7264"/></linearGradient>
<linearGradient id="k-g-hair" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5636"/><stop offset=".6" stop-color="#4a2e20"/><stop offset="1" stop-color="#2a1a14"/></linearGradient>
<linearGradient id="k-g-arm-near" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a8656"/><stop offset="1" stop-color="#5a6044"/></linearGradient>
<linearGradient id="k-g-arm-far" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e3a33"/><stop offset="1" stop-color="#1e2622"/></linearGradient>
<linearGradient id="k-g-lid2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d4a47a"/><stop offset=".45" stop-color="#8a8580"/><stop offset="1" stop-color="#4a4c52"/></linearGradient>
<linearGradient id="k-g-pom" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2dcb4"/><stop offset="1" stop-color="#6e6658"/></linearGradient>
<linearGradient id="t-canvas" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a6c3c"/><stop offset=".5" stop-color="#5a4128"/><stop offset="1" stop-color="#2a2016"/></linearGradient>
<linearGradient id="t-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0a85a"/><stop offset="1" stop-color="#b8642e"/></linearGradient>
<clipPath id="c-win-clip"><rect x="114" y="224" width="176" height="130"/></clipPath>
</defs>
<style>${style}</style>
<!-- sky -->
<rect width="${W}" height="${H}" fill="url(#fc-sky)"/>
<g transform="rotate(-11 800 330)" class="milky"><ellipse cx="800" cy="330" rx="1000" ry="120" fill="url(#fc-mw)"/><ellipse cx="560" cy="318" rx="420" ry="60" fill="url(#fc-mw)"/><ellipse cx="1060" cy="342" rx="380" ry="52" fill="url(#fc-mw)"/><ellipse cx="820" cy="300" rx="260" ry="34" fill="url(#fc-mw)"/></g>
<g class="dust">${dust}</g>
<g class="stars">${stars}</g>
<g class="glints">${glints}</g>
${moon}
<rect x="0" y="420" width="${W}" height="240" fill="url(#fc-horizon)"/>
<!-- hills and forest layers -->
<path d="${farRidge}" fill="url(#fc-ridge1)"/>
<path d="${nearRidge}" fill="url(#fc-ridge2)"/>
<path d="${farTrees}" fill="url(#fc-far)"/>
<rect x="-100" y="612" width="${W + 200}" height="130" class="fog"/>
${mid}
<rect x="-100" y="735" width="${W + 200}" height="90" class="fog" style="animation-delay:-30s"/>
${near}
<circle cx="${FIRE_X}" cy="${FIRE_Y - 70}" r="380" fill="url(#fc-firewash)" class="firewash"/>
<path d="${groundPath()}" fill="url(#fc-ground)"/>
<path d="${grass()}" class="grass"/>
<g class="flies">${flies}</g>
${cabin}
${camp}
</svg>`

if (svg.includes('`') || svg.includes('${')) throw new Error('scene would break the template literal')
if (svg.includes('href')) throw new Error('scene must not hold the word href')
if (svg.length > 131072) throw new Error(`scene is ${svg.length} characters, over 131072`)
const ids = [...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]).filter(id => !id.includes('-'))
if (ids.length) throw new Error('every id needs a hyphen: ' + ids.join(', '))

const ts = `// Generated by tools/gen-scene.mjs: a pine forest at night, a coder at a cabin window, a camper by the fire.\nexport const SCENE = \`${svg}\`\n`
writeFileSync(out, ts)
console.log('scene chars:', svg.length)