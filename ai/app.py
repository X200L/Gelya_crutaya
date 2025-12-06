from flask import Flask, Response, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import threading
import time
from datetime import datetime, timedelta
import json
import os
from collections import deque
from ultralytics import YOLO

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Загрузка модели YOLO
model = YOLO('yolov8l.pt')

# Глобальные переменные
camera = None
frame_lock = threading.Lock()
current_frame = None
people_count = 0
statistics = deque(maxlen=1000)  # Храним последние 1000 записей
statistics_interval = 10  # По умолчанию 60 секунд (1 минута)
last_statistics_save = time.time()
is_running = False

# Цвет для обводки людей (красный)
PERSON_COLOR = (0, 0, 255)
PERSON_CLASS_ID = 0  # Класс "person" в COCO dataset

def detect_people(frame):
    global people_count
    
    results = model(frame)[0]
    person_boxes = []
    person_confidences = []
    
    if results.boxes is not None:
        classes = results.boxes.cls.cpu().numpy()
        boxes = results.boxes.xyxy.cpu().numpy().astype(int)
        confidences = results.boxes.conf.cpu().numpy()
        
        for class_id, box, conf in zip(classes, boxes, confidences):
            if int(class_id) == PERSON_CLASS_ID:
                person_boxes.append(box)
                person_confidences.append(conf)
    
    # Рисуем рамки вокруг людей
    for box, conf in zip(person_boxes, person_confidences):
        x1, y1, x2, y2 = box
        cv2.rectangle(frame, (x1, y1), (x2, y2), PERSON_COLOR, 2)
        label = f"Person {conf:.2f}"
        cv2.putText(frame, label, (x1, y1 - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, PERSON_COLOR, 2)
    
    # Обновляем счетчик людей
    people_count = len(person_boxes)
    
    # Добавляем информацию на кадр
    info_text = f"People in room: {people_count}"
    cv2.putText(frame, info_text, (10, 30), 
               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    
    return frame, people_count

def camera_thread():
    """Поток для обработки видео с камеры"""
    global camera, current_frame, people_count, statistics, last_statistics_save, is_running
    
    camera = cv2.VideoCapture(0)
    
    if not camera.isOpened():
        print("Error: Could not open camera")
        return
    
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    is_running = True
    print("Camera started")
    
    while is_running:
        ret, frame = camera.read()
        if not ret:
            break
        
        # Обнаружение людей
        processed_frame, count = detect_people(frame)
        
        # Сохранение статистики
        current_time = time.time()
        if current_time - last_statistics_save >= statistics_interval:
            timestamp = datetime.now().isoformat()
            statistics.append({
                'timestamp': timestamp,
                'people_count': count,
                'interval': statistics_interval
            })
            last_statistics_save = current_time
            print(f"Statistics saved: {count} people at {timestamp}")
        
        # Сохранение текущего кадра
        with frame_lock:
            current_frame = processed_frame.copy()
        
        time.sleep(0.03)  # ~30 FPS
    
    camera.release()
    is_running = False
    print("Camera stopped")

def generate_frames():
    """Генератор кадров для стриминга"""
    global current_frame
    
    while True:
        with frame_lock:
            if current_frame is not None:
                # Кодируем кадр в JPEG
                ret, buffer = cv2.imencode('.jpg', current_frame, 
                                         [cv2.IMWRITE_JPEG_QUALITY, 85])
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.033)  # ~30 FPS

@app.route('/')
def index():
    """Главная страница"""
    return send_from_directory('static', 'index.html')

@app.route('/video_feed')
def video_feed():
    """Стриминг видео"""
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/statistics')
def get_statistics():
    return jsonify({
        'current_count': people_count,
        'timestamp': datetime.now().isoformat(),
        'interval': statistics_interval
    })

@app.route('/api/history')
def get_history():
    """Получение истории статистики"""
    return jsonify({
        'statistics': list(statistics),
        'total_records': len(statistics)
    })

@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    global statistics_interval
    
    if request.method == 'POST':
        data = request.json
        interval = data.get('interval', 60)
        if interval == 60:  # 1 минута
            statistics_interval = 60
        elif interval == 3600:  # 1 час
            statistics_interval = 3600
        else:
            return jsonify({'error': 'Invalid interval. Use 60 (minute) or 3600 (hour)'}), 400
        
        return jsonify({
            'success': True,
            'interval': statistics_interval,
            'interval_name': 'minute' if interval == 60 else 'hour'
        })
    
    return jsonify({
        'interval': statistics_interval,
        'interval_name': 'minute' if statistics_interval == 60 else 'hour'
    })

@app.route('/api/export')
def export_statistics():
    export_data = {
        'export_time': datetime.now().isoformat(),
        'interval': statistics_interval,
        'interval_name': 'minute' if statistics_interval == 60 else 'hour',
        'statistics': list(statistics)
    }
    
    return jsonify(export_data)

if __name__ == '__main__':
    camera_thread_obj = threading.Thread(target=camera_thread, daemon=True)
    camera_thread_obj.start()
    time.sleep(2)
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)

