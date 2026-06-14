<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div class="w-72 bg-gray-900 p-4 flex flex-col gap-3 border-r border-gray-800 overflow-y-auto">
      <h1 class="text-lg font-bold text-cyan-400">地震波形 P/S 波分析</h1>

      <!-- View Mode Toggle -->
      <div class="flex rounded-lg bg-gray-800 p-1">
        <button
          @click="store.viewMode = 'single'"
          class="flex-1 py-1.5 text-xs rounded-md transition-colors"
          :class="store.viewMode === 'single' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'"
        >
          单台站模式
        </button>
        <button
          @click="store.viewMode = 'multi'"
          class="flex-1 py-1.5 text-xs rounded-md transition-colors"
          :class="store.viewMode === 'multi' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'"
        >
          多台站联动
        </button>
      </div>

      <template v-if="store.viewMode === 'single'">
        <div>
          <label class="block bg-cyan-500 text-black text-center py-2 rounded cursor-pointer hover:bg-cyan-400 text-sm font-medium">
            上传 SAC/miniSEED
            <input type="file" @change="onUpload" class="hidden" />
          </label>
        </div>
        <button @click="store.loadMockData()" class="bg-gray-800 py-2 rounded text-sm hover:bg-gray-700">
          加载模拟数据
        </button>
      </template>

      <template v-else>
        <button
          @click="loadMultiStationForFirstEvent"
          class="bg-cyan-600 py-2 rounded text-sm hover:bg-cyan-500 font-medium"
        >
          加载多台站模拟数据
        </button>
      </template>

      <!-- STA/LTA Parameters -->
      <div class="bg-gray-800 rounded-xl p-3 space-y-2">
        <h3 class="text-cyan-300 font-bold text-sm">STA/LTA 参数</h3>
        <div>
          <label class="text-gray-400 text-xs">STA 窗口: {{ store.staWindow.toFixed(1) }}s</label>
          <input type="range" v-model.number="store.staWindow" min="0.5" max="5" step="0.1" class="w-full" />
        </div>
        <div>
          <label class="text-gray-400 text-xs">LTA 窗口: {{ store.ltaWindow.toFixed(1) }}s</label>
          <input type="range" v-model.number="store.ltaWindow" min="5" max="30" step="0.5" class="w-full" />
        </div>
        <div>
          <label class="text-gray-400 text-xs">触发阈值: {{ store.threshold.toFixed(1) }}</label>
          <input type="range" v-model.number="store.threshold" min="1" max="10" step="0.5" class="w-full" />
        </div>
        <button @click="runPick" class="w-full bg-cyan-600 py-2 rounded text-sm hover:bg-cyan-500">
          运行自动拾取
        </button>
      </div>

      <!-- Picks (single mode) -->
      <div v-if="store.viewMode === 'single'" class="bg-gray-800 rounded-xl p-3">
        <h3 class="text-cyan-300 font-bold text-sm mb-2">震相拾取结果</h3>
        <div v-for="p in store.picks" :key="p.id" class="flex justify-between bg-gray-700 rounded p-2 mb-1 text-sm">
          <span :class="p.type === 'P' ? 'text-red-400' : 'text-blue-400'">{{ p.type }} 波</span>
          <span>{{ p.time.toFixed(2) }}s</span>
          <span class="text-gray-400">{{ (p.confidence * 100).toFixed(0) }}%</span>
        </div>
        <div v-if="!store.picks.length" class="text-gray-600 text-xs">加载数据后运行拾取</div>
      </div>

      <!-- Stations -->
      <div class="bg-gray-800 rounded-xl p-3">
        <h3 class="text-cyan-300 font-bold text-sm mb-2">
          台站分布
          <span v-if="store.viewMode === 'multi'" class="text-xs text-gray-500 font-normal"> (可多选)</span>
        </h3>
        <div v-for="s in store.stations" :key="s.id"
          @click="onStationClick(s)"
          class="bg-gray-700 rounded p-2 mb-1 text-sm cursor-pointer hover:bg-gray-600"
          :class="getStationClass(s.id)">
          <div class="flex items-center gap-2">
            <span v-if="store.viewMode === 'multi'"
              class="w-4 h-4 rounded border flex items-center justify-center"
              :class="isStationSelected(s.id) ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500'">
              <span v-if="isStationSelected(s.id)" class="text-white text-xs">✓</span>
            </span>
            <span>{{ s.name }}</span>
          </div>
          <span class="text-gray-400 text-xs">({{ s.latitude.toFixed(1) }}, {{ s.longitude.toFixed(1) }})</span>
        </div>
      </div>

      <!-- Events -->
      <div class="bg-gray-800 rounded-xl p-3">
        <h3 class="text-cyan-300 font-bold text-sm mb-2">地震事件目录</h3>
        <div v-for="e in store.events" :key="e.id"
          @click="onEventClick(e)"
          class="bg-gray-700 rounded p-2 mb-1 text-xs cursor-pointer hover:bg-gray-600 transition-colors"
          :class="store.selectedEvent?.id === e.id ? 'ring-1 ring-cyan-500 bg-gray-600' : ''">
          M{{ e.magnitude }} {{ e.location }}
          <div class="text-gray-500">深度 {{ e.depth }}km | {{ e.originTime.slice(0, 16) }}</div>
        </div>
      </div>
    </div>

    <!-- Main: Waveform Charts -->
    <div class="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
      <!-- Single station mode -->
      <template v-if="store.viewMode === 'single'">
        <WaveformChart v-if="store.waveform" />
        <div v-else class="flex-1 flex items-center justify-center text-gray-600">
          请上传数据或加载模拟波形
        </div>
      </template>

      <!-- Multi station mode -->
      <template v-else>
        <div v-if="store.selectedEvent" class="bg-gray-800 rounded-xl p-3 mb-2">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-cyan-300 font-bold">当前事件: </span>
              <span class="text-white">M{{ store.selectedEvent.magnitude }} {{ store.selectedEvent.location }}</span>
            </div>
            <div class="text-xs text-gray-400">
              深度 {{ store.selectedEvent.depth }}km | {{ store.selectedEvent.originTime.slice(0, 16) }}
            </div>
          </div>
        </div>

        <div v-if="store.stationWaveforms.length > 0" class="flex flex-col gap-2">
          <MultiStationChart />
          <PicksComparison />
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-gray-600">
          <div class="text-center">
            <p class="mb-2">请选择地震事件或点击"加载多台站模拟数据"</p>
            <p class="text-xs text-gray-500">切换事件后可同时查看多个台站的波形和拾取差别</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSeismicStore } from './store/seismic'
import WaveformChart from './components/WaveformChart.vue'
import MultiStationChart from './components/MultiStationChart.vue'
import PicksComparison from './components/PicksComparison.vue'
import type { Station, SeismicEvent } from './types'

const store = useSeismicStore()

function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) store.uploadAndAnalyze(file)
}

function runPick() {
  if (store.viewMode === 'single') {
    store.picks = store.staLtaPicking()
  } else {
    store.runMultiStationPick()
  }
}

function onStationClick(station: Station) {
  if (store.viewMode === 'single') {
    store.selectedStation = station
  } else {
    store.toggleStationSelection(station.id)
  }
}

function isStationSelected(stationId: string): boolean {
  return store.selectedStationIds.includes(stationId)
}

function getStationClass(stationId: string): string {
  if (store.viewMode === 'single') {
    return store.selectedStation?.id === stationId ? 'ring-1 ring-cyan-500' : ''
  }
  return isStationSelected(stationId) ? 'ring-1 ring-cyan-500 bg-gray-600' : ''
}

function onEventClick(event: SeismicEvent) {
  if (store.viewMode === 'multi') {
    store.loadMultiStationMockData(event.id)
  }
}

function loadMultiStationForFirstEvent() {
  if (store.events.length > 0) {
    store.loadMultiStationMockData(store.events[0].id)
  }
}
</script>
