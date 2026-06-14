export interface WaveformData {
  time: number[]
  bhz: number[]  // vertical component
  bhn: number[]  // north component
  bhe: number[]  // east component
  samplingRate: number
}

export interface PhasePick {
  id: string
  type: 'P' | 'S'
  time: number
  confidence: number
  method: string
}

export interface Station {
  id: string
  name: string
  latitude: number
  longitude: number
  elevation: number
}

export interface SeismicEvent {
  id: string
  magnitude: number
  depth: number
  originTime: string
  location: string
}

export interface StationWaveform {
  stationId: string
  stationName: string
  waveform: WaveformData
  picks: PhasePick[]
  distance?: number
  azimuth?: number
}

export type ViewMode = 'single' | 'multi'
