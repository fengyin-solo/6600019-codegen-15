from fastapi import APIRouter, UploadFile, File
from app.services.seismic_service import process_waveform, generate_multi_station_waveforms

router = APIRouter()


@router.post("/waveform/upload")
async def upload_waveform(file: UploadFile = File(...)):
    """Upload SAC/miniSEED file and run analysis."""
    content = await file.read()
    result = process_waveform(content, file.filename or "unknown")
    return result


@router.get("/waveform/stations")
def get_stations():
    """Get station list."""
    return [
        {"id": "STA01", "name": "BJI", "latitude": 39.9, "longitude": 116.4, "elevation": 45},
        {"id": "STA02", "name": "SSE", "latitude": 31.2, "longitude": 121.5, "elevation": 10},
        {"id": "STA03", "name": "KMI", "latitude": 25.0, "longitude": 102.7, "elevation": 1890},
        {"id": "STA04", "name": "HIA", "latitude": 49.3, "longitude": 119.7, "elevation": 610},
    ]


@router.get("/waveform/events")
def get_events():
    """Get seismic event catalog."""
    return [
        {"id": "1", "magnitude": 4.2, "depth": 12.5, "originTime": "2025-01-15T08:23:41Z", "location": "四川雅安"},
        {"id": "2", "magnitude": 3.8, "depth": 8.3, "originTime": "2025-01-14T14:12:05Z", "location": "云南大理"},
        {"id": "3", "magnitude": 5.1, "depth": 25.0, "originTime": "2025-01-13T02:45:33Z", "location": "台湾花莲"},
    ]


@router.get("/waveform/multi-station/{event_id}")
def get_multi_station_waveforms(event_id: str):
    """Get multi-station waveform data for a specific seismic event."""
    return generate_multi_station_waveforms(event_id)
