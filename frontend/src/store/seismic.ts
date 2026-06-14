import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { WaveformData, PhasePick, Station, SeismicEvent, StationWaveform, ViewMode } from '../types'

export const useSeismicStore = defineStore('seismic', () => {
  const waveform = ref<WaveformData | null>(null)
  const picks = ref<PhasePick[]>([])
  const selectedStation = ref<Station | null>(null)
  const staWindow = ref(1.0)
  const ltaWindow = ref(10.0)
  const threshold = ref(3.5)
  const isLoading = ref(false)
  const viewMode = ref<ViewMode>('single')
  const selectedEvent = ref<SeismicEvent | null>(null)
  const selectedStationIds = ref<string[]>([])
  const stationWaveforms = ref<StationWaveform[]>([])

  const events = ref<SeismicEvent[]>([
    { id: '1', magnitude: 4.2, depth: 12.5, originTime: '2025-01-15T08:23:41Z', location: '四川雅安' },
    { id: '2', magnitude: 3.8, depth: 8.3, originTime: '2025-01-14T14:12:05Z', location: '云南大理' },
    { id: '3', magnitude: 5.1, depth: 25.0, originTime: '2025-01-13T02:45:33Z', location: '台湾花莲' },
  ])

  const stations = ref<Station[]>([
    { id: 'STA01', name: 'BJI', latitude: 39.9, longitude: 116.4, elevation: 45 },
    { id: 'STA02', name: 'SSE', latitude: 31.2, longitude: 121.5, elevation: 10 },
    { id: 'STA03', name: 'KMI', latitude: 25.0, longitude: 102.7, elevation: 1890 },
    { id: 'STA04', name: 'HIA', latitude: 49.3, longitude: 119.7, elevation: 610 },
  ])

  const selectedStationWaveforms = computed(() => {
    return stationWaveforms.value.filter(sw => selectedStationIds.value.includes(sw.stationId))
  })

  function generateMockWaveform(pDelay: number = 10, sDelay: number = 22, ampScale: number = 1): WaveformData {
    const sr = 100
    const duration = 60
    const n = sr * duration
    const time = Array.from({ length: n }, (_, i) => i / sr)
    const bhz: number[] = [], bhn: number[] = [], bhe: number[] = []

    for (let i = 0; i < n; i++) {
      const t = time[i]
      let vz = (Math.random() - 0.5) * 0.02
      let ns = (Math.random() - 0.5) * 0.02
      let ew = (Math.random() - 0.5) * 0.02

      const pAmp = 0.8 * ampScale
      if (t > pDelay && t < pDelay + 8) {
        const amp = pAmp * Math.exp(-(t - pDelay - 2) * (t - pDelay - 2) / 8)
        vz += amp * Math.sin(2 * Math.PI * 8 * t)
        ns += amp * 0.3 * Math.sin(2 * Math.PI * 8 * t + 0.5)
        ew += amp * 0.3 * Math.sin(2 * Math.PI * 8 * t + 1.0)
      }

      const sAmp = 1.5 * ampScale
      if (t > sDelay && t < sDelay + 18) {
        const amp = sAmp * Math.exp(-(t - sDelay - 6) * (t - sDelay - 6) / 30)
        vz += amp * 0.4 * Math.sin(2 * Math.PI * 4 * t)
        ns += amp * Math.sin(2 * Math.PI * 4 * t + 0.3)
        ew += amp * Math.sin(2 * Math.PI * 4 * t + 0.8)
      }

      const surfAmp = 2.0 * ampScale
      const surfDelay = sDelay + 13
      if (t > surfDelay && t < surfDelay + 20) {
        const amp = surfAmp * Math.exp(-(t - surfDelay - 7) * (t - surfDelay - 7) / 50)
        vz += amp * Math.sin(2 * Math.PI * 1.5 * t)
        ns += amp * Math.sin(2 * Math.PI * 1.5 * t + 0.4)
        ew += amp * Math.sin(2 * Math.PI * 1.5 * t + 0.9)
      }

      bhz.push(vz)
      bhn.push(ns)
      bhe.push(ew)
    }

    return { time, bhz, bhn, bhe, samplingRate: sr }
  }

  function staLtaPickingOnWaveform(wf: WaveformData): PhasePick[] {
    const data = wf.bhz
    const sr = wf.samplingRate
    const staLen = Math.floor(staWindow.value * sr)
    const ltaLen = Math.floor(ltaWindow.value * sr)
    const newPicks: PhasePick[] = []

    let lta = 0
    for (let i = ltaLen; i < data.length - staLen; i++) {
      let sta = 0
      for (let j = 0; j < staLen; j++) sta += data[i + j] * data[i + j]
      sta /= staLen

      lta = 0
      for (let j = 0; j < ltaLen; j++) lta += data[i - j] * data[i - j]
      lta /= ltaLen

      const ratio = lta > 0 ? sta / lta : 0
      if (ratio > threshold.value) {
        const t = wf.time[i]
        const existsNear = newPicks.some(p => Math.abs(p.time - t) < 2)
        if (!existsNear) {
          newPicks.push({
            id: `pick_${Date.now()}_${i}`,
            type: newPicks.length === 0 ? 'P' : 'S',
            time: t,
            confidence: Math.min(1, ratio / 10),
            method: 'STA/LTA'
          })
        }
      }
    }
    return newPicks
  }

  function loadMockData() {
    waveform.value = generateMockWaveform()
    picks.value = [
      { id: 'p1', type: 'P', time: 10.2, confidence: 0.92, method: 'STA/LTA' },
      { id: 'p2', type: 'S', time: 22.5, confidence: 0.88, method: 'STA/LTA' },
    ]
  }

  function loadMultiStationMockData(eventId: string) {
    const event = events.value.find(e => e.id === eventId)
    if (!event) return

    selectedEvent.value = event

    const stationConfigs = [
      { stationId: 'STA01', stationName: 'BJI', pDelay: 8, sDelay: 18, ampScale: 1.2, distance: 150 },
      { stationId: 'STA02', stationName: 'SSE', pDelay: 12, sDelay: 26, ampScale: 0.9, distance: 280 },
      { stationId: 'STA03', stationName: 'KMI', pDelay: 15, sDelay: 32, ampScale: 0.7, distance: 420 },
      { stationId: 'STA04', stationName: 'HIA', pDelay: 6, sDelay: 14, ampScale: 1.4, distance: 90 },
    ]

    const eventOffset = parseInt(eventId) * 2
    stationWaveforms.value = stationConfigs.map(config => {
      const wf = generateMockWaveform(
        config.pDelay + eventOffset,
        config.sDelay + eventOffset,
        config.ampScale
      )
      const wfPicks = staLtaPickingOnWaveform(wf)
      return {
        stationId: config.stationId,
        stationName: config.stationName,
        waveform: wf,
        picks: wfPicks,
        distance: config.distance
      }
    })

    if (selectedStationIds.value.length === 0) {
      selectedStationIds.value = stationWaveforms.value.slice(0, 3).map(s => s.stationId)
    }
  }

  function toggleStationSelection(stationId: string) {
    const idx = selectedStationIds.value.indexOf(stationId)
    if (idx > -1) {
      selectedStationIds.value.splice(idx, 1)
    } else {
      selectedStationIds.value.push(stationId)
    }
  }

  function runMultiStationPick() {
    stationWaveforms.value = stationWaveforms.value.map(sw => ({
      ...sw,
      picks: staLtaPickingOnWaveform(sw.waveform)
    }))
  }

  function staLtaPicking(): PhasePick[] {
    if (!waveform.value) return []
    const data = waveform.value.bhz
    const sr = waveform.value.samplingRate
    const staLen = Math.floor(staWindow.value * sr)
    const ltaLen = Math.floor(ltaWindow.value * sr)
    const newPicks: PhasePick[] = []

    let lta = 0
    for (let i = ltaLen; i < data.length - staLen; i++) {
      let sta = 0
      for (let j = 0; j < staLen; j++) sta += data[i + j] * data[i + j]
      sta /= staLen

      lta = 0
      for (let j = 0; j < ltaLen; j++) lta += data[i - j] * data[i - j]
      lta /= ltaLen

      const ratio = lta > 0 ? sta / lta : 0
      if (ratio > threshold.value) {
        const t = waveform.value.time[i]
        const existsNear = newPicks.some(p => Math.abs(p.time - t) < 2)
        if (!existsNear) {
          newPicks.push({
            id: `pick_${Date.now()}_${i}`,
            type: newPicks.length === 0 ? 'P' : 'S',
            time: t,
            confidence: Math.min(1, ratio / 10),
            method: 'STA/LTA'
          })
        }
      }
    }
    return newPicks
  }

  async function uploadAndAnalyze(file: File) {
    isLoading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const resp = await fetch('/api/waveform/upload', { method: 'POST', body: formData })
      if (resp.ok) {
        const data = await resp.json()
        waveform.value = data.waveform
        picks.value = data.picks || []
      }
    } catch {
      loadMockData()
    } finally {
      isLoading.value = false
    }
  }

  return {
    waveform, picks, selectedStation, staWindow, ltaWindow, threshold,
    isLoading, events, stations, viewMode, selectedEvent,
    selectedStationIds, stationWaveforms, selectedStationWaveforms,
    loadMockData, staLtaPicking, uploadAndAnalyze, generateMockWaveform,
    loadMultiStationMockData, toggleStationSelection, runMultiStationPick,
    staLtaPickingOnWaveform
  }
})
