from ultralytics import YOLO
import cv2
import numpy as np
import os

# Загрузка модели YOLOv8
model = YOLO('yolov8l.pt')

# Список цветов для различных классов
colors = [
    (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (0, 255, 255),
    (255, 0, 255), (192, 192, 192), (128, 128, 128), (128, 0, 0), (128, 128, 0),
    (0, 128, 0), (128, 0, 128), (0, 128, 128), (0, 0, 128), (72, 61, 139),
    (47, 79, 79), (47, 79, 47), (0, 206, 209), (148, 0, 211), (255, 20, 147)
]

# Функция для обработки изображения
def process_image(image_path):
    # Загрузка изображения
    image = cv2.imread(image_path)
    results = model(image)[0]
    
    # Получение оригинального изображения и результатов
    image = results.orig_img
    classes_names = results.names
    classes = results.boxes.cls.cpu().numpy()
    boxes = results.boxes.xyxy.cpu().numpy().astype(np.int32)

    # Подготовка словаря для группировки результатов по классам
    grouped_objects = {}

    # Рисование рамок и группировка результатов
    for class_id, box in zip(classes, boxes):
        class_name = classes_names[int(class_id)]
        color = colors[int(class_id) % len(colors)]  # Выбор цвета для класса
        if class_name not in grouped_objects:
            grouped_objects[class_name] = []
        grouped_objects[class_name].append(box)

        # Рисование рамок на изображении
        x1, y1, x2, y2 = box
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
        cv2.putText(image, class_name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Сохранение измененного изображения
    new_image_path = os.path.splitext(image_path)[0] + '_yolo' + os.path.splitext(image_path)[1]
    cv2.imwrite(new_image_path, image)

    # Сохранение данных в текстовый файл
    text_file_path = os.path.splitext(image_path)[0] + '_data.txt'
    with open(text_file_path, 'w') as f:
        for class_name, details in grouped_objects.items():
            f.write(f"{class_name}:\n")
            for detail in details:
                f.write(f"Coordinates: ({detail[0]}, {detail[1]}, {detail[2]}, {detail[3]})\n")

    print(f"Processed {image_path}:")
    print(f"Saved bounding-box image to {new_image_path}")
    print(f"Saved data to {text_file_path}")


# Функция для обработки видео с камеры в реальном времени
def process_camera(camera_index=0, save_output=False):
    """Обработка видео с камеры в реальном времени"""
    # Открытие камеры
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print(f"Error: Could not open camera {camera_index}")
        return
    
    # Получение параметров камеры
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    
    print(f"Camera info: {width}x{height}, {fps} FPS")
    print("Press 'q' to quit, 's' to save current frame")
    
    # Создание выходного видео файла (если нужно сохранять)
    out = None
    if save_output:
        output_path = 'camera_output_yolo.mp4'
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        print(f"Saving output to {output_path}")
    
    frame_count = 0
    all_detections = {}
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame from camera")
                break
            
            frame_count += 1
            
            # Обработка кадра моделью
            results = model(frame)[0]
            
            # Получение результатов
            classes_names = results.names
            classes = results.boxes.cls.cpu().numpy()
            boxes = results.boxes.xyxy.cpu().numpy().astype(np.int32)
            confidences = results.boxes.conf.cpu().numpy()
            
            # Рисование рамок на кадре
            for class_id, box, conf in zip(classes, boxes, confidences):
                class_name = classes_names[int(class_id)]
                color = colors[int(class_id) % len(colors)]
                
                # Сохранение статистики
                if class_name not in all_detections:
                    all_detections[class_name] = []
                all_detections[class_name].append({
                    'frame': frame_count,
                    'box': box.tolist(),
                    'confidence': float(conf)
                })
                
                # Рисование рамки и подписи
                x1, y1, x2, y2 = box
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                label = f"{class_name} {conf:.2f}"
                cv2.putText(frame, label, (x1, y1 - 10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # Отображение информации на кадре
            info_text = f"Frame: {frame_count} | Objects: {len(classes)}"
            cv2.putText(frame, info_text, (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Сохранение кадра (если нужно)
            if out is not None:
                out.write(frame)
            
            # Отображение кадра
            cv2.imshow('YOLO Camera Detection', frame)
            
            # Обработка нажатий клавиш
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                print("\nStopping camera...")
                break
            elif key == ord('s'):
                # Сохранение текущего кадра
                frame_path = f'camera_frame_{frame_count}.jpg'
                cv2.imwrite(frame_path, frame)
                print(f"Saved frame to {frame_path}")
            
            # Показываем статистику каждые 30 кадров
            if frame_count % 30 == 0:
                total_objects = sum(len(dets) for dets in all_detections.values())
                print(f"Processed {frame_count} frames, detected {total_objects} objects")
    
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    finally:
        # Освобождение ресурсов
        cap.release()
        if out is not None:
            out.release()
        cv2.destroyAllWindows()
        
        # Сохранение статистики
        if all_detections:
            text_file_path = 'camera_detections_data.txt'
            with open(text_file_path, 'w', encoding='utf-8') as f:
                f.write(f"Camera Detection Statistics\n")
                f.write(f"Total frames: {frame_count}\n")
                f.write(f"FPS: {fps}\n")
                f.write(f"Resolution: {width}x{height}\n\n")
                f.write("Detections by class:\n")
                f.write("=" * 50 + "\n")
                
                for class_name, detections in all_detections.items():
                    f.write(f"\n{class_name}: {len(detections)} total detections\n")
                    # Уникальные кадры с этим классом
                    unique_frames = len(set(d['frame'] for d in detections))
                    f.write(f"  Found in {unique_frames} frames\n")
            
            print(f"\nSaved statistics to {text_file_path}")
            print(f"Total detections: {sum(len(dets) for dets in all_detections.values())}")


# Функция для обработки видео из файла
def process_video(video_path):
    # Открытие видео файла
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}")
        return
    
    # Получение параметров видео
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Video info: {width}x{height}, {fps} FPS, {total_frames} frames")
    
    # Создание выходного видео файла
    output_path = os.path.splitext(video_path)[0] + '_yolo' + os.path.splitext(video_path)[1]
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Словарь для статистики по всем кадрам
    all_detections = {}
    frame_count = 0
    
    print("Processing video frames...")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Обработка кадра моделью
        results = model(frame)[0]
        
        # Получение результатов
        classes_names = results.names
        classes = results.boxes.cls.cpu().numpy()
        boxes = results.boxes.xyxy.cpu().numpy().astype(np.int32)
        confidences = results.boxes.conf.cpu().numpy()
        
        # Рисование рамок на кадре
        for class_id, box, conf in zip(classes, boxes, confidences):
            class_name = classes_names[int(class_id)]
            color = colors[int(class_id) % len(colors)]
            
            # Сохранение статистики
            if class_name not in all_detections:
                all_detections[class_name] = []
            all_detections[class_name].append({
                'frame': frame_count,
                'box': box.tolist(),
                'confidence': float(conf)
            })
            
            # Рисование рамки и подписи
            x1, y1, x2, y2 = box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"{class_name} {conf:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # Запись обработанного кадра
        out.write(frame)
        
        # Прогресс
        if frame_count % 30 == 0:
            progress = (frame_count / total_frames) * 100
            print(f"Processed {frame_count}/{total_frames} frames ({progress:.1f}%)")
    
    # Освобождение ресурсов
    cap.release()
    out.release()
    
    # Сохранение статистики в текстовый файл
    text_file_path = os.path.splitext(video_path)[0] + '_data.txt'
    with open(text_file_path, 'w', encoding='utf-8') as f:
        f.write(f"Video: {video_path}\n")
        f.write(f"Total frames: {frame_count}\n")
        f.write(f"FPS: {fps}\n")
        f.write(f"Resolution: {width}x{height}\n\n")
        f.write("Detections by class:\n")
        f.write("=" * 50 + "\n")
        
        for class_name, detections in all_detections.items():
            f.write(f"\n{class_name}: {len(detections)} detections\n")
            # Группировка по кадрам
            frames_with_class = {}
            for det in detections:
                frame_num = det['frame']
                if frame_num not in frames_with_class:
                    frames_with_class[frame_num] = []
                frames_with_class[frame_num].append(det)
            
            f.write(f"  Found in {len(frames_with_class)} frames\n")
            # Показываем первые 10 кадров с детекциями
            for frame_num in sorted(frames_with_class.keys())[:10]:
                f.write(f"  Frame {frame_num}: {len(frames_with_class[frame_num])} objects\n")
            if len(frames_with_class) > 10:
                f.write(f"  ... and {len(frames_with_class) - 10} more frames\n")
    
    print(f"\nProcessed video {video_path}:")
    print(f"Saved processed video to {output_path}")
    print(f"Saved statistics to {text_file_path}")
    print(f"Total detections: {sum(len(dets) for dets in all_detections.values())}")


# Пример использования
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        input_path = sys.argv[1].lower()
        
        # Проверяем, нужно ли использовать камеру
        if input_path == 'camera' or input_path == 'cam':
            save_output = '--save' in sys.argv or '-s' in sys.argv
            camera_index = 0
            # Можно указать индекс камеры: camera 1
            if len(sys.argv) > 2 and sys.argv[2].isdigit():
                camera_index = int(sys.argv[2])
            process_camera(camera_index, save_output)
        else:
            # Определяем, это изображение или видео
            video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv']
            file_ext = os.path.splitext(input_path)[1].lower()
            
            if file_ext in video_extensions:
                process_video(input_path)
            else:
                process_image(input_path)
    else:
        # По умолчанию используем камеру
        print("No input specified. Starting camera detection...")
        print("Usage: python main.py <image_or_video_path>")
        print("       python main.py camera  # Use camera (default)")
        print("       python main.py camera --save  # Use camera and save output")
        process_camera()