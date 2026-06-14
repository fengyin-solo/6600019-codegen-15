<template>
  <div class="bg-gray-900 rounded-xl p-3">
    <h3 class="text-cyan-300 font-bold text-sm mb-3">多台站拾取对比</h3>
    
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="text-gray-400 border-b border-gray-700">
          <th class="text-left py-2 px-2">台站</th>
          <th class="text-right py-2 px-2">P 波到时</th>
          <th class="text-right py-2 px-2">P 置信度</th>
          <th class="text-right py-2 px-2">S 波到时</th>
          <th class="text-right py-2 px-2">S 置信度</th>
          <th class="text-right py-2 px-2">S-P 时差</th>
          <th class="text-right py-2 px-2">震中距</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="sw in sortedWaveforms" :key="sw.stationId" class="border-b border-gray-800 hover:bg-gray-800">
          <td class="py-2 px-2">
            <span class="font-medium" :style="{ color: stationColors[sw.stationId] || '#22d3ee' }">
              {{ sw.stationName }}
            </span>
          </td>
          <td class="text-right py-2 px-2 text-red-400">
            {{ getPickTime(sw, 'P')?.toFixed(2) || '-' }}s
          </td>
          <td class="text-right py-2 px-2 text-gray-400">
            {{ getPickConfidence(sw, 'P') || '-' }}
          </td>
          <td class="text-right py-2 px-2 text-blue-400">
            {{ getPickTime(sw, 'S')?.toFixed(2) || '-' }}s
          </td>
          <td class="text-right py-2 px-2 text-gray-400">
            {{ getPickConfidence(sw, 'S') || '-' }}
          </td>
          <td class="text-right py-2 px-2 text-yellow-400">
            {{ getSPDiff(sw) || '-' }}
          </td>
          <td class="text-right py-2 px-2 text-gray-500">
            {{ sw.distance ? sw.distance + 'km' : '-' }}
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div v-if="sortedWaveforms.length > 1" class="mt-3 pt-3 border-t border-gray-700">
      <h4 class="text-xs text-gray-400 mb-2">到时差异分析</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-gray-800 rounded p-2">
          <span class="text-gray-500">P 波到时范围</span>
          <div class="text-red-400 font-bold">{{ pWaveRange }}</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <span class="text-gray-500">S 波到时范围</span>
          <div class="text-blue-400 font-bold">{{ sWaveRange }}</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <span class="text-gray-500">最早 P 波台站</span>
          <div class="text-cyan-400 font-bold">{{ earliestPStation }}</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <span class="text-gray-500">最晚 P 波台站</span>
          <div class="text-cyan-400 font-bold">{{ latestPStation }}</div>
        </div>
      </div>
    </div>

    <div v-if="sortedWaveforms.length === 0" class="text-gray-600 text-xs py-4 text-center">
      暂无对比数据
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSeismicStore } from '../store/seismic'
import type { StationWaveform, PhasePick } from '../types'

const store = useSeismicStore()

const stationColors: Record<string, string> = {
  STA01: '#22d3ee',
  STA02: '#a78bfa',
  STA03: '#34d399',
  STA04: '#fbbf24',
}

const sortedWaveforms = computed(() => {
  return [...store.selectedStationWaveforms].sort((a, b) => {
    const pA = getPickTime(a, 'P') ?? Infinity
    const pB = getPickTime(b, 'P') ?? Infinity
    return pA - pB
  })
})

const pWaveRange = computed(() => {
  const times = sortedWaveforms.value
    .map(sw => getPickTime(sw, 'P'))
    .filter((t): t is number => t !== undefined)
  if (times.length < 2) return '-'
  const min = Math.min(...times)
  const max = Math.max(...times)
  return `${min.toFixed(2)} - ${max.toFixed(2)}s (差 ${(max - min).toFixed(2)}s)`
})

const sWaveRange = computed(() => {
  const times = sortedWaveforms.value
    .map(sw => getPickTime(sw, 'S'))
    .filter((t): t is number => t !== undefined)
  if (times.length < 2) return '-'
  const min = Math.min(...times)
  const max = Math.max(...times)
  return `${min.toFixed(2)} - ${max.toFixed(2)}s (差 ${(max - min).toFixed(2)}s)`
})

const earliestPStation = computed(() => {
  const withP = sortedWaveforms.value.filter(sw => getPickTime(sw, 'P') !== undefined)
  if (withP.length === 0) return '-'
  return withP[0].stationName
})

const latestPStation = computed(() => {
  const withP = sortedWaveforms.value.filter(sw => getPickTime(sw, 'P') !== undefined)
  if (withP.length === 0) return '-'
  return withP[withP.length - 1].stationName
})

function getPickTime(sw: StationWaveform, type: 'P' | 'S'): number | undefined {
  const pick = sw.picks.find(p => p.type === type)
  return pick?.time
}

function getPickConfidence(sw: StationWaveform, type: 'P' | 'S'): string {
  const pick = sw.picks.find(p => p.type === type)
  return pick ? (pick.confidence * 100).toFixed(0) + '%' : ''
}

function getSPDiff(sw: StationWaveform): string {
  const pPick = sw.picks.find(p => p.type === 'P')
  const sPick = sw.picks.find(p => p.type === 'S')
  if (!pPick || !sPick) return '-'
  return (sPick.time - pPick.time).toFixed(2) + 's'
}
</script>
