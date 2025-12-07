#!/usr/bin/env python3
import psutil
import platform
import subprocess
import json
import requests
import time
from datetime import datetime

SERVER_URL = "http://87.242.102.250:8080/report"

def safe_run(cmd, timeout=10):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except Exception:
        return None

def collect_system_info():
    data = {}

    # Общая информация
    data["hostname"] = platform.node()
    data["os"] = f"{platform.system()} {platform.release()}"
    data["machine"] = platform.machine()
    data["processor"] = platform.processor() or "Unknown"
    data["boot_time"] = datetime.fromtimestamp(psutil.boot_time()).isoformat()
    data["uptime_seconds"] = int(time.time() - psutil.boot_time())

    # Процессор
    data["cpu_cores_logical"] = psutil.cpu_count(logical=True)
    data["cpu_cores_physical"] = psutil.cpu_count(logical=False)
    data["cpu_percent"] = psutil.cpu_percent(interval=1)
    try:
        freq = psutil.cpu_freq()
        data["cpu_freq_current_mhz"] = freq.current if freq else None
    except Exception:
        data["cpu_freq_current_mhz"] = None

    # Память
    vm = psutil.virtual_memory()
    data["ram_total_gb"] = round(vm.total / (1024**3), 2)
    data["ram_used_gb"] = round(vm.used / (1024**3), 2)
    data["ram_available_gb"] = round(vm.available / (1024**3), 2)
    data["ram_percent"] = vm.percent

    # Swap
    swap = psutil.swap_memory()
    if swap.total > 0:
        data["swap_total_gb"] = round(swap.total / (1024**3), 2)
        data["swap_used_gb"] = round(swap.used / (1024**3), 2)
        data["swap_percent"] = swap.percent
    else:
        data["swap_total_gb"] = 0
        data["swap_used_gb"] = 0
        data["swap_percent"] = 0

    # Диски
    partitions = []
    for part in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(part.mountpoint)
            partitions.append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total_gb": round(usage.total / (1024**3), 2),
                "free_gb": round(usage.free / (1024**3), 2),
                "percent_used": round(100 - (usage.free / usage.total * 100), 1)
            })
        except PermissionError:
            continue
    data["disks"] = partitions

    # Батарея
    battery_info = {}
    if hasattr(psutil, "sensors_battery"):
        battery = psutil.sensors_battery()
        if battery:
            battery_info = {
                "percent": battery.percent,
                "plugged": battery.power_plugged,
                "secs_left": battery.secsleft if battery.secsleft >= 0 else None
            }
    data["battery"] = battery_info or None

    # Сеть
    net_addrs = []
    for iface, addrs in psutil.net_if_addrs().items():
        for addr in addrs:
            if addr.family.name in ("AF_INET", "AF_INET6"):
                net_addrs.append({
                    "interface": iface,
                    "family": addr.family.name,
                    "address": addr.address
                })
    data["network"] = net_addrs

    # Время отправки
    data["report_time"] = datetime.utcnow().isoformat() + "Z"

    return data

def send_to_server(data):
    try:
        response = requests.post(SERVER_URL, json=data, timeout=10)
        if response.status_code == 200:
            print("✅ Данные успешно отправлены на сервер.")
        else:
            print(f"❌ Ошибка сервера: {response.status_code} — {response.text}")
    except Exception as e:
        print(f"⚠️ Не удалось отправить данные: {e}")

if __name__ == "__main__":
    print("📡 Сбор данных о системе...")
    report = collect_system_info()
    print("📤 Отправка на сервер...")
    send_to_server(report)