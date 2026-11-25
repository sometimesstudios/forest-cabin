// Builds the forest-cabin backdrop SVG and writes it into the mod as hooks/scene.ts.
import { writeFileSync } from 'node:fs'

const out = process.argv[2]
if (!out) throw new Error('usage: node gen-scene.mjs <path/to/scene.ts>')

// Deterministic pseudo-random so the scene is the same each build.
let seed = 20261125
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const r1 = n => Math.round(n * 10) / 10

const W = 1600
const H = 1000

// One pine: a stack of jagged tiers, mirrored.
function pine(x, base, h, w) {
  const top = base - h
  const tiers = 5
  const half = w / 2
  const right = []
  for (let k = 1; k <= tiers; k++) {
    const y = top + (h * 0.92 * k) / tiers
    const ox = (half * k) / tiers
    right.push([x + ox, y])
    if (k < tiers) right.push([x + ox * 0.42, y - h * 0.035])
  }
  const trunkW = Math.max(2, w * 0.06)
  const pts = [[x, top], ...right, [x + trunkW, top + h * 0.92], [x + trunkW, base], [x - trunkW, base], [x - trunkW, top + h * 0.92]]
  const left = right.map(([px, py]) => [2 * x - px, py]).reverse()
  pts.push(...left)
  return 'M' + pts.map(([px, py]) => `${r1(px)} ${r1(py)}`).join('L') + 'Z'
}

function treeRow({ count, baseY, hMin, hMax, wRatio, jitter }) {
  let d = ''
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * (W + 120) - 60 + (rand() - 0.5) * jitter
    const h = hMin + rand() * (hMax - hMin)
    const base = baseY + rand() * 18
    d += pine(x, base, h, h * wRatio)
  }
  return d
}

// Far ridge line.
function ridge(y, amp, steps) {
  let d = `M0 ${H}L0 ${y}`
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W
    const yy = y - Math.sin(i * 0.9) * amp * 0.5 - rand() * amp
    d += `L${r1(x)} ${r1(yy)}`
  }
  return d + `L${W} ${H}Z`
}

const farRidge = ridge(560, 70, 14)
const farTrees = treeRow({ count: 46, baseY: 640, hMin: 70, hMax: 140, wRatio: 0.42, jitter: 20 })
const midTrees = treeRow({ count: 28, baseY: 760, hMin: 160, hMax: 270, wRatio: 0.4, jitter: 40 })
const nearTrees = treeRow({ count: 9, baseY: 985, hMin: 300, hMax: 440, wRatio: 0.34, jitter: 60 })

// Stars, top half only.
let stars = ''
for (let i = 0; i < 90; i++) {
  const x = r1(rand() * W)
  const y = r1(rand() * 420)
  const rr = r1(0.6 + rand() * 1.3)
  const tw = i % 3 === 0 ? ` class="tw tw${i % 4}"` : ''
  stars += `<circle cx="${x}" cy="${y}" r="${rr}"${tw}/>`
}

// Fireflies, lower part, kept toward the sides.
let flies = ''
for (let i = 0; i < 16; i++) {
  const side = i % 2 === 0 ? rand() * 420 : W - rand() * 420
  const x = r1(side)
  const y = r1(620 + rand() * 300)
  const dur = r1(9 + rand() * 7)
  const delay = r1(-rand() * 12)
  flies += `<g class="fly" style="animation-duration:${dur}s;animation-delay:${delay}s"><circle cx="${x}" cy="${y}" r="7" class="fly-halo"/><circle cx="${x}" cy="${y}" r="1.8" class="fly-core"/></g>`
}

// Cabin and campfire, pinned to the bottom-left corner.
const cabin = `
<g transform="translate(0 580)">
  <!-- window light on the ground -->
  <ellipse cx="140" cy="400" rx="120" ry="18" fill="url(#fireGround)" class="ground-glow"/>
  <!-- chimney smoke -->
  <g class="smoke">
    <circle cx="232" cy="150" r="12" class="puff p1"/>
    <circle cx="232" cy="150" r="14" class="puff p2"/>
    <circle cx="232" cy="150" r="16" class="puff p3"/>
  </g>
  <rect x="220" y="160" width="26" height="70" class="stone"/>
  <path d="M40 270L190 170L340 270Z" class="roof"/>
  <path d="M30 274L190 164L350 274L340 280L190 178L40 280Z" class="roof-edge"/>
  <rect x="62" y="270" width="256" height="122" class="wall"/>
  <g class="logs">
    <rect x="56" y="276" width="268" height="12" rx="6"/>
    <rect x="56" y="296" width="268" height="12" rx="6"/>
    <rect x="56" y="316" width="268" height="12" rx="6"/>
    <rect x="56" y="336" width="268" height="12" rx="6"/>
    <rect x="56" y="356" width="268" height="12" rx="6"/>
    <rect x="56" y="376" width="268" height="12" rx="6"/>
  </g>
  <!-- window: a coder at a desk, lamp on, cat asleep -->
  <rect x="76" y="284" width="112" height="78" rx="4" class="frame"/>
  <rect x="82" y="290" width="100" height="64" class="window"/>
  <g clip-path="url(#winClip)">
  <circle cx="168" cy="318" r="26" fill="url(#lampGlow)"/>
  <rect x="86" y="304" width="34" height="2.5" class="shelf"/>
  <rect x="88" y="293" width="4" height="11" class="book b1"/><rect x="93" y="295" width="3.5" height="9" class="book b2"/>
  <rect x="97.5" y="292" width="4.5" height="12" class="book b3"/><rect x="103" y="296" width="6" height="8" rx="1" class="book b4"/>
  <path d="M112 304C112 298 118 298 118 304Z" class="plant"/>
  <circle cx="132" cy="322" r="20" fill="url(#screenGlow)" class="screen-glow"/>
  <path d="M114 354C114 338 121 332 132 331C143 332 150 338 150 354Z" class="sweater"/>
  <path d="M126 331L132 338L138 331Z" class="collar"/>
  <circle cx="132" cy="318" r="11" class="skin"/>
  <path d="M121 317C121 306 143 306 143 317C140 311 124 311 121 317Z" class="hair-dark"/>
  <circle cx="132" cy="305" r="4.5" class="hair-dark"/>
  <path d="M119.5 318C119.5 302 144.5 302 144.5 318" class="headband"/>
  <rect x="117" y="314" width="5" height="9" rx="2.5" class="earcup"/>
  <rect x="142" y="314" width="5" height="9" rx="2.5" class="earcup"/>
  <path d="M127 320Q129 321.5 131 320M133 320Q135 321.5 137 320" class="eye-line"/>
  <ellipse cx="126" cy="323.5" rx="2" ry="1.2" class="blush"/><ellipse cx="138" cy="323.5" rx="2" ry="1.2" class="blush"/>
  <path d="M117 337H147L148 352H116Z" class="laptop-lid"/>
  <circle cx="132" cy="344.5" r="2.6" class="sticker"/>
  <rect x="153" y="342" width="7" height="9" rx="1.5" class="mug"/>
  <path d="M170 324V350M164 350H176" class="lamp-pole"/>
  <path d="M162 326L170 316L178 326Z" class="lamp-shade"/>
  <path d="M86 352C86 344 92 341 100 342C106 342 110 346 110 352Z" class="cat"/>
  <circle cx="91" cy="345" r="4.5" class="cat"/>
  <path d="M87.5 342L88 337.5L91 341ZM91.5 341L94 337.5L95 342Z" class="cat"/>
  <path d="M110 351C114 351 115 347 112 346" class="cat-tail"/>
  <rect x="82" y="351" width="100" height="4" class="desk"/>
  </g>
  <rect x="72" y="360" width="120" height="5" rx="2" class="frame"/>
  <!-- door and lantern -->
  <rect x="214" y="306" width="54" height="86" rx="4" class="frame"/>
  <rect x="219" y="311" width="44" height="81" class="door"/>
  <circle cx="255" cy="352" r="2.5" class="knob"/>
  <circle cx="284" cy="316" r="16" class="lantern-glow"/>
  <rect x="280" y="308" width="8" height="12" rx="2" class="lantern"/>
</g>`

// Campsite in the bottom-right corner: a tent, the fire, someone on a log with a laptop.
const camp = `
<g transform="translate(1110 619) scale(0.9)">
  <ellipse cx="270" cy="392" rx="230" ry="44" fill="url(#fireGround)" class="ground-glow"/>
  <!-- tent, lit from inside -->
  <path d="M30 392L130 236L230 392Z" class="tent"/>
  <path d="M130 236L104 392H156Z" class="tent-in"/>
  <path d="M130 236L84 392H104Z" class="tent-flap"/>
  <path d="M130 236L122 226M130 236L138 226" class="rope"/>
  <!-- campfire -->
  <g transform="translate(290 392)">
    <circle cx="0" cy="-24" r="70" fill="url(#fireHalo)" class="halo"/>
    <g class="stones">
      <ellipse cx="-30" cy="-2" rx="8" ry="5"/><ellipse cx="-15" cy="2" rx="8" ry="5"/>
      <ellipse cx="0" cy="3" rx="8" ry="5"/><ellipse cx="15" cy="2" rx="8" ry="5"/>
      <ellipse cx="30" cy="-2" rx="8" ry="5"/>
    </g>
    <path d="M-26 -4L22 -14L26 -9L-22 1Z" class="firelog"/>
    <path d="M26 -4L-22 -14L-26 -9L22 1Z" class="firelog"/>
    <path d="M0 -56C9 -40 20 -31 16 -16C13 -7 -13 -7 -16 -16C-20 -29 -5 -36 0 -56Z" class="flame f-outer"/>
    <path d="M2 -42C8 -31 12 -24 10 -15C7 -9 -7 -9 -10 -15C-12 -24 -3 -29 2 -42Z" class="flame f-mid"/>
    <path d="M0 -29C4 -22 6 -18 4 -13C3 -10 -3 -10 -4 -13C-6 -18 -3 -22 0 -29Z" class="flame f-core"/>
    <circle cx="-6" cy="-64" r="1.6" class="spark s1"/>
    <circle cx="8" cy="-70" r="1.4" class="spark s2"/>
    <circle cx="2" cy="-62" r="1.2" class="spark s3"/>
  </g>
  <!-- log seat -->
  <rect x="340" y="370" width="120" height="22" rx="11" class="seat"/>
  <path d="M346 381H452" class="seat-line"/>
  <!-- the camper: beanie, hoodie, glasses, laptop on the lap -->
  <g transform="translate(332 254) scale(.68)">
    <path d="M52 112C54 98 66 92 80 92C94 92 106 98 108 112Z" class="hood"/>
    <path d="M38 170C36 132 50 106 80 104C110 106 124 132 122 170Z" class="hoodie"/>
    <path d="M73 112V128M87 112V128" class="string"/>
    <path d="M40 160C28 166 24 184 32 194L60 194C58 184 62 176 74 172Z" class="pants"/>
    <path d="M120 160C132 166 136 184 128 194L100 194C102 184 98 176 86 172Z" class="pants"/>
    <path d="M26 190H62C64 196 62 200 58 200H24C22 196 23 192 26 190Z" class="boot"/>
    <path d="M134 190H98C96 196 98 200 102 200H136C138 196 137 192 134 190Z" class="boot"/>
    <circle cx="80" cy="70" r="33" class="skin"/>
    <path d="M47 64C49 76 53 82 58 84L60 66Z" class="hair"/>
    <path d="M113 64C111 76 107 82 102 84L100 66Z" class="hair"/>
    <path d="M45 62C45 36 62 23 80 23C98 23 115 36 115 62Z" class="beanie"/>
    <path d="M58 30V60M70 25V60M80 23V60M90 25V60M102 30V60" class="beanie-rib"/>
    <rect x="42" y="55" width="76" height="13" rx="6.5" class="beanie-band"/>
    <circle cx="80" cy="20" r="8.5" class="beanie-pom"/>
    <ellipse cx="60" cy="86" rx="6" ry="3.5" class="blush"/>
    <ellipse cx="100" cy="86" rx="6" ry="3.5" class="blush"/>
    <g class="blink"><path d="M62 79Q67 82.5 72 79M88 79Q93 82.5 98 79" class="eye-line thick"/></g>
    <rect x="56" y="71" width="21" height="15" rx="6" class="lens"/>
    <rect x="83" y="71" width="21" height="15" rx="6" class="lens"/>
    <path d="M77 77H83" class="glasses"/>
    <path d="M74 93Q80 97 86 93" class="eye-line thick"/>
    <ellipse cx="80" cy="104" rx="28" ry="10" fill="url(#screenGlow)"/>
    <path d="M40 116C30 132 32 150 48 158L56 150C48 144 48 134 52 124Z" class="hoodie"/>
    <path d="M120 116C130 132 128 150 112 158L104 150C112 144 112 134 108 124Z" class="hoodie"/>
    <rect x="40" y="168" width="80" height="6" rx="2" class="laptop-base"/>
    <path d="M47 126H113L116 169H44Z" class="laptop-lid"/>
    <circle cx="80" cy="147" r="8" class="sticker"/>
    <path d="M80 141C83 145 84 148 82 151C81 152 79 152 78 151C76 148 78 145 80 141Z" class="sticker-flame"/>
    <circle cx="43" cy="160" r="6.5" class="skin hand-l"/>
    <circle cx="117" cy="160" r="6.5" class="skin hand-r"/>
  </g>
  <!-- a steaming mug by the log -->
  <rect x="466" y="374" width="14" height="16" rx="3" class="mug"/>
  <path d="M480 378C486 378 486 386 480 386" class="mug-handle"/>
  <path d="M470 368C467 363 473 360 470 354" class="steam st1"/>
  <path d="M476 368C473 363 479 360 476 354" class="steam st2"/>
</g>`

// Moon, pinned to the top-right corner.
const moon = `
<g transform="translate(1180 10)">
  <circle cx="300" cy="110" r="90" fill="url(#moonHalo)"/>
  <circle cx="300" cy="110" r="34" class="moon" mask="url(#crescent)"/>
</g>`

const style = `
.sky-a{stop-color:#07111a}.sky-b{stop-color:#0d1d24}.sky-c{stop-color:#16241f}
.stars circle{fill:#e9e4d2;opacity:.75}
.tw{animation:tw 6s ease-in-out infinite}
.tw1{animation-duration:8s;animation-delay:-2s}.tw2{animation-duration:7s;animation-delay:-4s}.tw3{animation-duration:9s;animation-delay:-1s}
@keyframes tw{0%,100%{opacity:.8}50%{opacity:.25}}
.moon{fill:#efe6c8}
.m-a{stop-color:#f2e7c4;stop-opacity:.22}.m-b{stop-color:#f2e7c4;stop-opacity:0}
.ridge{fill:#132620}.far{fill:#10221d}.mid{fill:#0b1915}.near{fill:#060f0c}
.fg-a{stop-color:#a9c2b4;stop-opacity:0}.fg-b{stop-color:#a9c2b4;stop-opacity:.09}
.fog{fill:url(#fogGrad);animation:fog 60s ease-in-out infinite alternate}
@keyframes fog{from{transform:translateX(-60px)}to{transform:translateX(60px)}}
.fly{opacity:.7;animation-name:fly;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
.fly-halo{fill:#e6d36a;opacity:.18}.fly-core{fill:#f4e48a}
@keyframes fly{0%{transform:translate(0,0);opacity:.15}25%{opacity:.8}50%{transform:translate(26px,-34px);opacity:.35}75%{opacity:.85}100%{transform:translate(0,0);opacity:.15}}
.stone{fill:#3a3631}
.roof{fill:#2a1d15}.roof-edge{fill:#1c140f}
.wall{fill:#3b2819}.logs rect{fill:#5a3d26;stroke:#2e1f14;stroke-width:1.5}
.frame{fill:#24180f}.door{fill:#3e2a1a}.knob{fill:#c79a52}
.window{fill:#f2a54a;animation:win 9s ease-in-out infinite}
@keyframes win{0%,100%{fill:#f2a54a}50%{fill:#e8933c}}
.mullion{stroke:#24180f;stroke-width:4}
.lantern{fill:#ffd27a}.lantern-glow{fill:#ffb64d;opacity:.22}
.ground{fill:#050c09}
.stones ellipse{fill:#2f2c28}.firelog{fill:#4a2e1a}
.flame{transform-box:fill-box;transform-origin:50% 100%}
.f-outer{fill:#e0642a;opacity:.9;animation:fl 2.6s ease-in-out infinite}
.f-mid{fill:#f39a3a;animation:fl 2.1s ease-in-out infinite;animation-delay:-.7s}
.f-core{fill:#ffe08a;animation:fl 1.8s ease-in-out infinite;animation-delay:-.3s}
@keyframes fl{0%,100%{transform:scale(1,1)}50%{transform:scale(.94,1.07)}}
.halo{opacity:.55;animation:halo 3.4s ease-in-out infinite}
@keyframes halo{0%,100%{opacity:.55}50%{opacity:.45}}
.h-a{stop-color:#ff9a3c;stop-opacity:.5}.h-b{stop-color:#ff9a3c;stop-opacity:0}
.g-a{stop-color:#ff8a35;stop-opacity:.28}.g-b{stop-color:#ff8a35;stop-opacity:0}
.spark{fill:#ffc56a;opacity:0;animation:spark 5s linear infinite}
.s2{animation-delay:-1.7s;animation-duration:6s}.s3{animation-delay:-3.3s;animation-duration:5.5s}
@keyframes spark{0%{transform:translateY(0);opacity:0}15%{opacity:.8}100%{transform:translateY(-60px);opacity:0}}
.puff{fill:#9aa3a0;opacity:0;animation:puff 12s ease-out infinite}
.p2{animation-delay:-4s}.p3{animation-delay:-8s}
@keyframes puff{0%{transform:translate(0,0) scale(.6);opacity:0}20%{opacity:.16}100%{transform:translate(40px,-120px) scale(2.2);opacity:0}}
.puff{transform-box:fill-box;transform-origin:50% 50%}
.tent{fill:#6b5430}.tent-in{fill:#e9a95a;animation:win 9s ease-in-out infinite}.tent-flap{fill:#4a3920}.rope{stroke:#3a2c18;stroke-width:3}
.lg-a{stop-color:#fff2c4;stop-opacity:.7}.lg-b{stop-color:#fff2c4;stop-opacity:0}
.shelf{fill:#6b4423}.b1{fill:#a8433a}.b2{fill:#3f6b8c}.b3{fill:#d9a441}.b4{fill:#4e7d3a}.book{stroke:none}.plant{fill:#5f8f45}
.sweater{fill:#e9dcc2}.collar{fill:#c9b89a}.hair-dark{fill:#3a2418}.headband{fill:none;stroke:#2f7d78;stroke-width:2.6;stroke-linecap:round}.earcup{fill:#2f7d78}
.eye-line{fill:none;stroke:#2a1c14;stroke-width:1.1;stroke-linecap:round}.eye-line.thick{stroke-width:2.6}
.blush{fill:#f08a7a;opacity:.45}.skin{fill:#f2c49e}
.laptop-lid{fill:#c3cad2}.laptop-base{fill:#8e97a1}.sticker{fill:#e0702e}.sticker-flame{fill:#ffe08a}
.lamp-pole{fill:none;stroke:#2a1c14;stroke-width:1.6}.lamp-shade{fill:#2f7d78}
.cat{fill:#e08a3c}.cat-tail{fill:none;stroke:#e08a3c;stroke-width:2.4;stroke-linecap:round}.desk{fill:#5a3a22}
.hood{fill:#2f5a40}.hoodie{fill:#3f7a52}.string{stroke:#e9dcc2;stroke-width:2.4;stroke-linecap:round}
.pants{fill:#34425e}.boot{fill:#6b4527}.hair{fill:#5a3624}
.beanie{fill:#e0a73f}.beanie-rib{stroke:#c98f2e;stroke-width:2}.beanie-band{fill:#c98f2e}.beanie-pom{fill:#f3e3c2}
.lens{fill:#cfe8ff;fill-opacity:.32;stroke:#2a1c14;stroke-width:2.6}.glasses{stroke:#2a1c14;stroke-width:2.6}
.rim{fill:none;stroke:#ffb36b;stroke-width:3.5;stroke-linecap:round;opacity:.55}
.seat-line{stroke:#2e1c10;stroke-width:1.5;opacity:.6}.mug-handle{fill:none;stroke:#8a3b2a;stroke-width:3}
.steam{fill:none;stroke:#d8d2c4;stroke-width:2;stroke-linecap:round;opacity:0;animation:steam 6s ease-out infinite}.st2{animation-delay:-3s}
@keyframes steam{0%{transform:translateY(6px);opacity:0}30%{opacity:.45}100%{transform:translateY(-10px);opacity:0}}
.hand-l{animation:tap 1.3s ease-in-out infinite}.hand-r{animation:tap 1.3s ease-in-out infinite;animation-delay:-.65s}
@keyframes tap{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}
.blink{transform-box:fill-box;transform-origin:50% 50%;animation:blink 6s ease-in-out infinite}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.2)}}
.laptop{fill:#3a3f44}.screen{fill:#cfe6ff}.mug{fill:#8a3b2a}.seat{fill:#4a2e1a}
.sg-a{stop-color:#bfe0ff;stop-opacity:.55}.sg-b{stop-color:#bfe0ff;stop-opacity:0}
.screen-glow{animation:glow 7s ease-in-out infinite}
@keyframes glow{0%,100%{opacity:1}50%{opacity:.75}}
@media (prefers-color-scheme: light){
.sky-a{stop-color:#c9dccf}.sky-b{stop-color:#dfe6d2}.sky-c{stop-color:#ece3cc}
.stars,.flies{display:none}
.moon{fill:#fff8e6}.moon-cut{transform:translate(60px,0)}
.m-a{stop-color:#fff7dc;stop-opacity:.6}
.ridge{fill:#9fb6a3}.far{fill:#7f9c86}.mid{fill:#4f7459}.near{fill:#2c4a35}
.fg-a{stop-color:#ffffff}.fg-b{stop-color:#ffffff;stop-opacity:.3}
.ground{fill:#2c3f2c}
.wall{fill:#7a5434}.logs rect{fill:#a3754a;stroke:#5e4027}.roof{fill:#4b3426}.roof-edge{fill:#352418}
.window{fill:#f6c36e;animation:none}.tent{fill:#8a6c3c}.tent-in{fill:#c98f4a;animation:none}.seat{fill:#6b4527}
.halo,.ground-glow,.lantern-glow{opacity:.25}
}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-a"/><stop offset=".55" class="sky-b"/><stop offset="1" class="sky-c"/></linearGradient>
<mask id="crescent"><circle cx="300" cy="110" r="34" fill="#fff"/><circle cx="314" cy="100" r="31" class="moon-cut" fill="#000"/></mask>
<linearGradient id="fogGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fg-a"/><stop offset=".5" class="fg-b"/><stop offset="1" class="fg-a"/></linearGradient>
<radialGradient id="screenGlow"><stop offset="0" class="sg-a"/><stop offset="1" class="sg-b"/></radialGradient>
<radialGradient id="lampGlow"><stop offset="0" class="lg-a"/><stop offset="1" class="lg-b"/></radialGradient>
<clipPath id="winClip"><rect x="82" y="290" width="100" height="64"/></clipPath>
<radialGradient id="moonHalo"><stop offset="0" class="m-a"/><stop offset="1" class="m-b"/></radialGradient>
<radialGradient id="fireHalo"><stop offset="0" class="h-a"/><stop offset="1" class="h-b"/></radialGradient>
<radialGradient id="fireGround"><stop offset="0" class="g-a"/><stop offset="1" class="g-b"/></radialGradient>
</defs>
<style>${style}</style>
<!-- sky -->
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g class="stars">${stars}</g>
${moon}
<!-- forest layers -->
<path d="${farRidge}" class="ridge"/>
<path d="${farTrees}" class="far"/>
<rect x="-100" y="600" width="${W + 200}" height="120" class="fog"/>
<path d="${midTrees}" class="mid"/>
<rect x="-100" y="720" width="${W + 200}" height="80" class="fog" style="animation-delay:-30s"/>
<path d="${nearTrees}" class="near"/>
<path d="M0 972H1600V1000H0Z" class="ground"/>
<g class="flies">${flies}</g>
${cabin}
${camp}
</svg>`

if (svg.includes('`') || svg.includes('${')) throw new Error('scene would break the template literal')
if (/<!--[^>]*(<|--[^>])/.test(svg.replace(/<!--([^<]*?)-->/g, ''))) throw new Error('bad comment')

const ts = `// Generated by gen-scene.mjs: a quiet pine forest at night, a log cabin and a campfire.\nexport const SCENE = \`${svg}\`\n`
writeFileSync(out, ts)
console.log('scene chars:', svg.length)
