<template>
  <div class="flex flex-col gap-2">
    <div v-for="sw in store.selectedStationWaveforms" :key="sw.stationId" class="bg-gray-900 rounded-xl p-3">
      <div class="flex items-center justify-between mb-1">
        <h3 class="text-sm text-cyan-300 font-bold">{{ sw.stationName }} 台站</h3>
        <span v-if="sw.distance" class="text-xs text-gray-500">震中距: {{ sw.distance }}km</span>
      </div>
      <v-chart :option="getChartOption(sw)" class="h-32" autoresize />
    </div>
    <div v-if="store.selectedStationWaveforms.length === 0" class="flex-1 flex items-center justify-center text-gray-600">
      请选择至少一个台站进行对比
    </div>
  </div>
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, MarkLineComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useSeismicStore } from '../store/seismic'
import type { EChartsOption } from 'echarts'
import type { StationWaveform } from '../types'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, MarkLineComponent])

const store = useSeismicStore()

const stationColors: Record<string, string> = {
  STA01: '#22d3ee',
  STA02: '#a78bfa',
  STA03: '#34d399',
  STA04: '#fbbf24',
}

function getChartOption(sw: StationWaveform): EChartsOption {
  const wf = sw.waveform
  const color = stationColors[sw.stationId] || '#22d3ee'
  const step = 5
  const time = wf.time.filter((_, i) => i % step === 0)
  const data = wf.bhz.filter((_, i) => i % step === 0)

  const markLines = sw.picks.map(p => ({
    xAxis: p.time,
    label: {
      formatter: `${sw.stationName}-${p.type}`,
      color: p.type === 'P' ? '#ef4444' : '#3b82f6',
      fontSize: 11,
      fontWeight: 'bold' as const
    },
    lineStyle: {
      color: p.type === 'P' ? '#ef4444' : '#3b82f6',
      width: 2,
      type: 'dashed' as const
    }
  }))

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => `${sw.stationName}\nt=${params[0].value[0].toFixed(2)}s\namp=${params[0].value[1].toFixed(4)}`
    },
    grid: { left: 50, right: 20, top: 10, bottom: 25 },
    xAxis: {
      type: 'value',
      min: 0,
      max: time[time.length - 1],
      axisLabel: { color: '#666', formatter: '{value}s' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#1f2937' } }
    },
    series: [{
      type: 'line',
      showSymbol: false,
      lineStyle: { color, width: 1 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '33' },
            { offset: 1, color: 'transparent' }
          ]
        }
      },
      data: time.map((t, i) => [t, data[i]]),
      markLine: { symbol: 'none', data: markLines }
    }]
  }
}
</script>
