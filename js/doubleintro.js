// js/doubleintro.js
import { db } from "./firebase.js"
import { doc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"

const BGM_URL = "https://costly-tan-krkn143blm.edgeone.app/PerituneMaterial_Rapid5.mp3"
const BG_LIST = [
  "https://foolish-rose-9l9aoow1vy.edgeone.app/배경1%20(1).jpg",
  "https://old-olive-m53ztzpdmh.edgeone.app/배경2%20(1).jpg",
  "https://driving-moccasin-bfvl5nk24u.edgeone.app/배경3%20(1).jpg",
  "https://yielding-green-qv9brnrm3e.edgeone.app/배경4.jpg",
  "https://tricky-gold-ws4fc7rxqb.edgeone.app/배경5.jpg",
  "https://geographical-black-tvekomtcvt.edgeone.app/배경6.jpg"
]

export let bgmAudio = null
let bgApplied = false
let touched   = false
let introDone = false
let allReady  = false

function wait(ms) { return new Promise(r => setTimeout(r, ms)) }
function $(id)    { return document.getElementById(id) }

function applyBackground(url) {
  document.body.style.backgroundImage    = `url('${url}')`
  document.body.style.backgroundSize     = "cover"
  document.body.style.backgroundPosition = "center"
  document.body.style.backgroundRepeat   = "no-repeat"
}

export function fadeBgmOut(duration = 2000) {
  if (!bgmAudio) return
  const step  = bgmAudio.volume / (duration / 50)
  const timer = setInterval(() => {
    if (bgmAudio.volume > step) {
      bgmAudio.volume = Math.max(0, bgmAudio.volume - step)
    } else {
      bgmAudio.volume = 0
      bgmAudio.pause()
      clearInterval(timer)
    }
  }, 50)
}

function initVolumeSlider() {
  const slider = $("bgm-volume")
  const label  = $("bgm-volume-label")
  if (!slider) return
  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value)
    if (bgmAudio) bgmAudio.volume = v
    if (label) label.innerText = Math.round(v * 100) + "%"
  })
}

function showBgmToast() {
  if ($("bgm-toast")) return
  const btn = document.createElement("button")
  btn.id = "bgm-toast"
  btn.innerText = "🎵 탭하여 브금 재생"
  btn.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.8); color:#fff;
    padding:12px 24px; border-radius:999px;
    font-size:14px; z-index:9999; border:none; cursor:pointer;
    white-space:nowrap;
  `
  btn.onclick = () => {
    bgmAudio = new Audio(BGM_URL)
    bgmAudio.loop   = true
    bgmAudio.volume = 0.7
    bgmAudio.play().catch(() => {})
    btn.remove()
  }
  document.body.appendChild(btn)
  setTimeout(() => btn.remove(), 10000)
}

function startBattle() {
  const overlay = $("intro-overlay")
  if (!overlay || overlay.classList.contains("fade-out")) return
  overlay.classList.add("fade-out")
  const screen = $("battle-screen")
  if (screen) screen.classList.add("visible")
  setTimeout(() => {
    overlay.classList.add("hidden")
    initVolumeSlider()
  }, 800)
}

async function playVsIntro(room) {
  const p1 = room?.player1_name ?? "PLAYER1"
  const p2 = room?.player2_name ?? "PLAYER2"
  const p3 = room?.player3_name ?? "PLAYER3"
  const p4 = room?.player4_name ?? "PLAYER4"

  const nameLeftEl  = $("vs-name-left")
  const nameRightEl = $("vs-name-right")
  if (nameLeftEl)  nameLeftEl.textContent  = `${p1.toUpperCase()} & ${p2.toUpperCase()}`
  if (nameRightEl) nameRightEl.textContent = `${p3.toUpperCase()} & ${p4.toUpperCase()}`

  const touchScreen = $("touch-screen")
  const vsScreen    = $("vs-screen")
  if (touchScreen) touchScreen.style.display = "none"
  if (vsScreen)    vsScreen.classList.add("show")

  await wait(50)

  const flash      = $("vs-flash")
  const burst      = $("vs-burst")
  const vsLeft     = $("vs-left")
  const vsRight    = $("vs-right")
  const vsLabel    = $("vs-label")
  const innerLeft  = $("vs-inner-left")
  const innerRight = $("vs-inner-right")

  if (flash)   flash.classList.add("show")
  await wait(100)
  if (vsLeft)  vsLeft.classList.add("show")
  await wait(100)
  if (vsRight) vsRight.classList.add("show")
  await wait(250)
  if (vsLabel) vsLabel.classList.add("show")
  if (flash)   flash.classList.add("show")
  if (burst)   burst.classList.add("show")
  await wait(450)
  if (innerLeft)  innerLeft.classList.add("drift-left")
  if (innerRight) innerRight.classList.add("drift-right")

  await wait(5000)

  if (!allReady && vsScreen) {
    vsScreen.style.opacity = "0.3"
    const statusEl = $("touch-ready-status")
    if (statusEl) {
      statusEl.style.cssText = "color:white; font-size:clamp(1rem,3vw,1.4rem); position:fixed; bottom:10vh; width:100%; text-align:center; z-index:10;"
      statusEl.innerText = "다른 플레이어를 기다리는 중..."
    }
  }
}

async function onTouched(roomRef, mySlot) {
  bgmAudio = new Audio(BGM_URL)
  bgmAudio.loop   = true
  bgmAudio.volume = 0.7
  bgmAudio.play().catch(() => {})

  const snap = await getDoc(roomRef)
  const room = snap.data()

  if (!bgApplied) {
    if (mySlot === "p1") {
      const bgUrl = BG_LIST[Math.floor(Math.random() * BG_LIST.length)]
      await updateDoc(roomRef, { background: bgUrl })
      applyBackground(bgUrl)
      bgApplied = true
    } else if (room?.background) {
      applyBackground(room.background)
      bgApplied = true
    }
  }

  await playVsIntro(room)
  await updateDoc(roomRef, { [`intro_ready_${mySlot}`]: true })

  introDone = true
  if (allReady) startBattle()
}

function listenIntroReady(roomRef) {
  onSnapshot(roomRef, snap => {
    const room = snap.data()
    if (!room) return

    if (room.background && !bgApplied) {
      bgApplied = true
      applyBackground(room.background)
    }

    const r1 = !!room.intro_ready_p1
    const r2 = !!room.intro_ready_p2
    const r3 = !!room.intro_ready_p3
    const r4 = !!room.intro_ready_p4

    if (r1 && r2 && r3 && r4) allReady = true

    if (touched && !allReady) {
      const readyCount = [r1,r2,r3,r4].filter(Boolean).length
      const statusEl   = $("touch-ready-status")
      if (statusEl) statusEl.innerText = `${readyCount}/4명 준비 완료...`
    }

    if (allReady && introDone) startBattle()
  })
}

export async function skipIntro(roomRef) {
  const overlay = $("intro-overlay")
  if (overlay) overlay.classList.add("hidden")
  const screen = $("battle-screen")
  if (screen) screen.classList.add("visible")
  initVolumeSlider()

  const snap = await getDoc(roomRef)
  const room = snap.data()
  if (room?.background && !bgApplied) {
    bgApplied = true
    applyBackground(room.background)
  }

  const testAudio = new Audio(BGM_URL)
  testAudio.loop   = true
  testAudio.volume = 0.7
  testAudio.play().then(() => {
    bgmAudio = testAudio
  }).catch(() => {
    showBgmToast()
  })
  setTimeout(() => {
    if (!bgmAudio || bgmAudio.paused) showBgmToast()
  }, 500)
}

// 메인 진입점 — doublebattle.js에서 호출
export function initIntro(roomRef, mySlot) {
  const handler = () => {
    if (touched) return
    touched = true
    document.removeEventListener("click",      handler)
    document.removeEventListener("touchstart", handler)
    onTouched(roomRef, mySlot)
  }
  document.addEventListener("click",      handler)
  document.addEventListener("touchstart", handler)
  listenIntroReady(roomRef)
}