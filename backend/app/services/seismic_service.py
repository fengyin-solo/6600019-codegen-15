"""Seismic waveform processing service."""
import numpy as np
from typing import List, Dict, Any


def generate_mock_waveform(duration: int = 60, sr: int = 100,
                           p_delay: float = 10.0, s_delay: float = 22.0,
                           amp_scale: float = 1.0) -> Dict[str, Any]:
    """Generate synthetic seismic waveform with P and S arrivals."""
    n = sr * duration
    t = np.linspace(0, duration, n)

    bhz = np.random.normal(0, 0.01, n)
    bhn = np.random.normal(0, 0.01, n)
    bhe = np.random.normal(0, 0.01, n)

    p_amp = 0.8 * amp_scale
    p_mask = (t > p_delay) & (t < p_delay + 8)
    if np.any(p_mask):
        p_env = p_amp * np.exp(-((t[p_mask] - p_delay - 2) ** 2) / 8)
        bhz[p_mask] += p_env * np.sin(2 * np.pi * 8 * t[p_mask])
        bhn[p_mask] += p_env * 0.3 * np.sin(2 * np.pi * 8 * t[p_mask] + 0.5)
        bhe[p_mask] += p_env * 0.3 * np.sin(2 * np.pi * 8 * t[p_mask] + 1.0)

    s_amp = 1.5 * amp_scale
    s_mask = (t > s_delay) & (t < s_delay + 18)
    if np.any(s_mask):
        s_env = s_amp * np.exp(-((t[s_mask] - s_delay - 6) ** 2) / 30)
        bhz[s_mask] += s_env * 0.4 * np.sin(2 * np.pi * 4 * t[s_mask])
        bhn[s_mask] += s_env * np.sin(2 * np.pi * 4 * t[s_mask] + 0.3)
        bhe[s_mask] += s_env * np.sin(2 * np.pi * 4 * t[s_mask] + 0.8)

    surf_amp = 2.0 * amp_scale
    surf_delay = s_delay + 13
    surf_mask = (t > surf_delay) & (t < surf_delay + 20)
    if np.any(surf_mask):
        surf_env = surf_amp * np.exp(-((t[surf_mask] - surf_delay - 7) ** 2) / 50)
        bhz[surf_mask] += surf_env * np.sin(2 * np.pi * 1.5 * t[surf_mask])
        bhn[surf_mask] += surf_env * np.sin(2 * np.pi * 1.5 * t[surf_mask] + 0.4)
        bhe[surf_mask] += surf_env * np.sin(2 * np.pi * 1.5 * t[surf_mask] + 0.9)

    return {
        "time": t.tolist(),
        "bhz": bhz.tolist(),
        "bhn": bhn.tolist(),
        "bhe": bhe.tolist(),
        "samplingRate": sr,
    }


def sta_lta_pick(data: List[float], sr: int,
                 sta_sec: float = 1.0, lta_sec: float = 10.0,
                 threshold: float = 3.5) -> List[Dict[str, Any]]:
    """STA/LTA automatic phase picker."""
    arr = np.array(data)
    sta_len = int(sta_sec * sr)
    lta_len = int(lta_sec * sr)

    sq = arr ** 2
    sta = np.convolve(sq, np.ones(sta_len) / sta_len, mode='valid')
    lta = np.convolve(sq, np.ones(lta_len) / lta_len, mode='valid')

    min_len = min(len(sta), len(lta))
    sta = sta[:min_len]
    lta = lta[:min_len]

    ratio = np.where(lta > 0, sta / lta, 0)
    picks = []
    last_pick = -999

    for i in range(len(ratio)):
        if ratio[i] > threshold and (i / sr - last_pick) > 2:
            t = (i + lta_len) / sr
            picks.append({
                "id": f"pick_{i}",
                "type": "P" if not picks else "S",
                "time": round(t, 2),
                "confidence": round(min(1.0, ratio[i] / 10), 2),
                "method": "STA/LTA",
            })
            last_pick = t

    return picks


def process_waveform(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Process uploaded waveform file.
    In production, use ObsPy to read SAC/miniSEED:
        from obspy import read
        st = read(BytesIO(file_bytes))
    """
    waveform = generate_mock_waveform()
    picks = sta_lta_pick(waveform["bhz"], waveform["samplingRate"])
    return {"waveform": waveform, "picks": picks}


def generate_multi_station_waveforms(event_id: str) -> Dict[str, Any]:
    """Generate multi-station waveform data for a seismic event."""
    station_configs = [
        {"stationId": "STA01", "stationName": "BJI", "pDelay": 8, "sDelay": 18, "ampScale": 1.2, "distance": 150},
        {"stationId": "STA02", "stationName": "SSE", "pDelay": 12, "sDelay": 26, "ampScale": 0.9, "distance": 280},
        {"stationId": "STA03", "stationName": "KMI", "pDelay": 15, "sDelay": 32, "ampScale": 0.7, "distance": 420},
        {"stationId": "STA04", "stationName": "HIA", "pDelay": 6, "sDelay": 14, "ampScale": 1.4, "distance": 90},
    ]

    event_offset = int(event_id) * 2 if event_id.isdigit() else 0

    station_waveforms = []
    for config in station_configs:
        wf = generate_mock_waveform(
            p_delay=config["pDelay"] + event_offset,
            s_delay=config["sDelay"] + event_offset,
            amp_scale=config["ampScale"]
        )
        picks = sta_lta_pick(wf["bhz"], wf["samplingRate"])
        station_waveforms.append({
            "stationId": config["stationId"],
            "stationName": config["stationName"],
            "waveform": wf,
            "picks": picks,
            "distance": config["distance"],
        })

    return {
        "eventId": event_id,
        "stationWaveforms": station_waveforms,
    }
