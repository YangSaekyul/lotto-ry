#!/usr/bin/env python3
"""Refresh Lotto 6/45 results and recent winning stores from Donghaeng Lottery."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BASE = "https://www.dhlottery.co.kr"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; LottoRyDataRefresh/1.0)"}
STORE_HISTORY_START = 1169


def request_json(path: str, params: dict[str, str | int]) -> dict:
    url = f"{BASE}{path}?{urlencode(params)}"
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=30) as response:
                payload = json.load(response)
            if payload.get("resultCode") not in ("200", 200, None):
                raise RuntimeError(f"official API error: {payload.get('resultCode')}")
            return payload["data"]
        except Exception as exc:  # retry only at the network boundary
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"failed official request after retries: {url}") from last_error


def discover_latest_draw() -> int:
    url = f"{BASE}/lt645/result"
    with urlopen(Request(url, headers=HEADERS), timeout=30) as response:
        html = response.read().decode("utf-8", errors="replace")
    candidates = [int(value) for value in re.findall(r'id=["\']opt_val["\'][^>]*value=["\'](\d+)', html)]
    if not candidates:
        candidates = [int(value) for value in re.findall(r'ltEpsd["\']?\s*[:=]\s*["\']?(\d+)', html)]
    if not candidates:
        raise RuntimeError("could not discover latest completed draw")
    return max(candidates)


def normalize_draw(item: dict) -> dict:
    draw_no = int(item["ltEpsd"])
    return {
        "draw_no": draw_no,
        "draw_date": item["ltRflYmd"],
        "numbers": [int(item[f"tm{i}WnNo"]) for i in range(1, 7)],
        "bonus_number": int(item["bnsWnNo"]),
        "winner_counts": {str(rank): int(item[f"rnk{rank}WnNope"]) for rank in range(1, 6)},
        "source_url": f"{BASE}/lt645/result?result=byWin&lottoId=LO40&drawNo={draw_no}",
    }


def load_existing_draws() -> dict[int, dict]:
    path = DATA / "official_draw_results_all.json"
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {int(item["draw_no"]): item for item in payload.get("draws", [])}


def load_existing_stores() -> list[dict]:
    path = DATA / "official_winning_stores_current.json"
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    return list(payload.get("records", []))


def fetch_all_draws(latest: int, existing: dict[int, dict]) -> list[dict]:
    """Fetch only missing recent draws during normal weekly refreshes.

    The historical range is immutable after publication. Re-downloading all
    1,000+ draws weekly turns one transient official-site timeout into a full
    refresh failure, so preserve verified local history and fetch its gap only.
    """
    collected = dict(existing)
    first = request_json("/lt645/selectPstLt645InfoNew.do", {"srchDir": "center", "srchLtEpsd": latest})["list"]
    for item in first:
        draw = normalize_draw(item)
        collected[draw["draw_no"]] = draw
    cursor = min(collected)
    while cursor > 1:
        page = request_json("/lt645/selectPstLt645InfoNew.do", {"srchDir": "older", "srchCursorLtEpsd": cursor})["list"]
        if not page:
            break
        previous_cursor = cursor
        for item in page:
            draw = normalize_draw(item)
            collected[draw["draw_no"]] = draw
        cursor = min(int(item["ltEpsd"]) for item in page)
        if cursor >= previous_cursor:
            raise RuntimeError("official draw pagination did not advance")
        time.sleep(0.04)
    draws = sorted(collected.values(), key=lambda item: item["draw_no"], reverse=True)
    if not draws or draws[0]["draw_no"] != latest or draws[-1]["draw_no"] != 1:
        raise RuntimeError(f"incomplete draw range: {draws[:1]} .. {draws[-1:]}")
    return draws


def fetch_recent_stores(latest: int, existing: list[dict]) -> list[dict]:
    existing_draws = {int(item["draw_no"]) for item in existing}
    records = [item for item in existing if int(item["draw_no"]) <= latest]
    for draw_no in range(STORE_HISTORY_START, latest + 1):
        if draw_no in existing_draws:
            continue
        for rank in range(1, 6):
            result = request_json("/wnprchsplcsrch/selectLtWnShp.do", {"srchWnShpRnk": rank, "srchLtEpsd": draw_no})
            for item in result.get("list", []):
                records.append({
                    "draw_no": draw_no,
                    "prize_rank": rank,
                    "store_id": item.get("ltShpId"),
                    "name": item.get("shpNm"),
                    "address": item.get("shpAddr", "").strip(),
                    "latitude": item.get("shpLat"),
                    "longitude": item.get("shpLot"),
                    "sale_status": item.get("slrOperSttsCd"),
                    "source_url": f"{BASE}/wnprchsplcsrch/home?ltGds=lt645&ltEpsd={draw_no}",
                })
        time.sleep(0.06)
    return records


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    latest = discover_latest_draw()
    refreshed_at = datetime.now(timezone.utc).isoformat()
    draws = fetch_all_draws(latest, load_existing_draws())
    stores = fetch_recent_stores(latest, load_existing_stores())
    meta = {"source": BASE, "refreshed_at": refreshed_at, "draw_range": [1, latest]}
    (DATA / "official_draw_results_all.json").write_text(
        json.dumps({**meta, "draws": draws}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    store_meta = {"source": BASE, "refreshed_at": refreshed_at, "draw_range": [STORE_HISTORY_START, latest]}
    (DATA / "official_winning_stores_current.json").write_text(
        json.dumps({**store_meta, "records": stores}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({"latest": latest, "draws": len(draws), "store_records": len(stores)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
