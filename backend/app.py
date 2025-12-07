from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import uuid
import json
import base64
import urllib3

# Отключаем предупреждения о небезопасных SSL запросах (для API Sberbank)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Загружаем .env файл из корневой директории проекта
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"Loaded .env from: {env_path}")
else:
    # Пробуем загрузить из текущей директории
    load_dotenv()
    print("Loaded .env from current directory or default location")

app = Flask(__name__, static_folder='../frontend', static_url_path='')
# Настройка CORS для работы с HTTPS
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# API Keys from environment variables
GIGACHAT_AUTH_KEY = os.getenv('GIGACHAT_AUTH_KEY')
SALUTE_SPEECH_AUTH_KEY = os.getenv('SALUTE_SPEECH_AUTH_KEY')

# Проверка наличия ключей при запуске
if not GIGACHAT_AUTH_KEY:
    print("WARNING: GIGACHAT_AUTH_KEY is not set in environment variables")
if not SALUTE_SPEECH_AUTH_KEY:
    print("WARNING: SALUTE_SPEECH_AUTH_KEY is not set in environment variables")
else:
    print(f"SALUTE_SPEECH_AUTH_KEY loaded (length: {len(SALUTE_SPEECH_AUTH_KEY)})")

# Token cache
gigachat_token = None
salute_speech_token = None


def get_gigachat_token(force_refresh=False):
    """Получить токен доступа для GigaChat"""
    global gigachat_token
    
    if gigachat_token and not force_refresh:
        return gigachat_token
    
    url = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
    payload = {
        'scope': 'GIGACHAT_API_PERS'
    }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': str(uuid.uuid4()),
        'Authorization': f'Basic {GIGACHAT_AUTH_KEY}'
    }
    
    try:
        # Отключаем проверку SSL для API Sberbank (используют самоподписанный сертификат)
        response = requests.post(url, headers=headers, data=payload, verify=False, timeout=10)
        response.raise_for_status()
        data = response.json()
        gigachat_token = data.get('access_token')
        return gigachat_token
    except Exception as e:
        print(f"Error getting GigaChat token: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'No response'}")
        gigachat_token = None
        return None


def get_salute_speech_token(force_refresh=False):
    """Получить токен доступа для Salute Speech"""
    global salute_speech_token
    
    if salute_speech_token and not force_refresh:
        return salute_speech_token
    
    # Проверяем наличие ключа
    if not SALUTE_SPEECH_AUTH_KEY:
        print("ERROR: SALUTE_SPEECH_AUTH_KEY is not set in environment variables")
        return None
    
    url = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
    payload = {
        'scope': 'SALUTE_SPEECH_PERS'
    }
    rquid = str(uuid.uuid4())
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rquid,
        'Authorization': f'Basic {SALUTE_SPEECH_AUTH_KEY}'
    }
    
    print(f"Requesting Salute Speech token with RqUID: {rquid}")
    print(f"URL: {url}")
    print(f"Scope: {payload['scope']}")
    
    try:
        # Отключаем проверку SSL для API Sberbank (используют самоподписанный сертификат)
        response = requests.post(url, headers=headers, data=payload, timeout=10, verify=False)
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code != 200:
            print(f"Error response text: {response.text[:500]}")
            response.raise_for_status()
        
        data = response.json()
        print(f"Response data keys: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
        
        salute_speech_token = data.get('access_token')
        if not salute_speech_token:
            print(f"ERROR: No access_token in response. Full response: {data}")
            return None
        
        print(f"Successfully obtained Salute Speech token (length: {len(salute_speech_token)})")
        return salute_speech_token
    except requests.exceptions.RequestException as e:
        print(f"Request error getting Salute Speech token: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text[:500]}")
        salute_speech_token = None
        return None
    except Exception as e:
        print(f"Unexpected error getting Salute Speech token: {e}")
        import traceback
        traceback.print_exc()
        salute_speech_token = None
        return None


@app.route('/')
def index():
    """Главная страница - отдаем фронтенд"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Отдача статических файлов (CSS, JS, изображения)"""
    # Не обрабатываем API маршруты здесь
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    # Безопасность: проверяем, что путь не содержит опасные символы
    if '..' in path:
        return jsonify({'error': 'Invalid path'}), 400
    
    # Проверяем существование файла
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        # Если файл не найден, возвращаем index.html для SPA
        return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/health', methods=['GET'])
def health():
    """Проверка работоспособности API"""
    return jsonify({'status': 'ok'})


@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """Распознавание речи (STT)"""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    
    # Получаем токен
    token = get_salute_speech_token()
    if not token:
        return jsonify({'error': 'Failed to get Salute Speech token'}), 500
    
    # Отправляем аудио на распознавание
    url = "https://smartspeech.sber.ru/rest/v1/speech:recognize"
    # API Salute Speech требует специфический Content-Type для PCM
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'audio/x-pcm;bit=16;rate=16000'
    }
    
    try:
        audio_data = audio_file.read()
        # Параметры для распознавания
        params = {
            'format': 'pcm16',
            'rate': 16000,
            'channels': 1
        }
        
        response = requests.post(
            url,
            headers=headers,
            data=audio_data,
            params=params,
            verify=False,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        
        # Извлекаем текст из ответа API Salute Speech
        text = ''
        if 'result' in result and len(result['result']) > 0:
            first_result = result['result'][0]
            
            # Если result[0] - это строка (прямой текст)
            if isinstance(first_result, str):
                text = first_result
            # Если result[0] - это объект с alternatives
            elif isinstance(first_result, dict):
                alternatives = first_result.get('alternatives', [])
                if alternatives and len(alternatives) > 0:
                    text = alternatives[0].get('text', '')
        elif 'text' in result:
            text = result['text']
        
        return jsonify({'text': text})
    except Exception as e:
        print(f"Error in transcription: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'No response'}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    """Отправка запроса к GigaChat"""
    data = request.json
    message = data.get('message', '')
    
    if not message:
        return jsonify({'error': 'No message provided'}), 400
    
    # Получаем токен
    token = get_gigachat_token()
    if not token:
        return jsonify({'error': 'Failed to get GigaChat token'}), 500
    
    # Отправляем запрос к GigaChat
    url = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'model': 'GigaChat',
        'messages': [
            {
                'role': 'system',
                'content': 'Ты — банкомат Альфа-Банка с функциями консультанта и менеджера. Ты находишься в отделении Альфа-Банка. Ты не человек, а официальный автоматизированный терминал самообслуживания. Отвечай всегда вежливо, профессионально, кратко и по делу.\n\nУ тебя ТРИ основные роли:\n\n1. БАНКОМАТ — направляй клиентов к функциям интерфейса:\nДоступные функции:\n- Проверить баланс\n- Снять наличные\n- Внести наличные\n- Перевести деньги между своими счетами или на другие карты\n\nВАЖНО: Если клиент хочет выполнить операцию, которая доступна в банкомате, НАПРАВЬ ЕГО К СООТВЕТСТВУЮЩЕЙ ФУНКЦИИ. Говори конкретно:\n- "Для проверки баланса выберите в главном меню пункт \'Баланс\'"\n- "Чтобы снять наличные, нажмите на кнопку \'Снятие наличных\' в главном меню"\n- "Для внесения средств выберите \'Внесение средств\' в главном меню"\n- "Чтобы перевести деньги, нажмите \'Переводы\' в главном меню"\n\n2. КОНСУЛЬТАНТ — отвечай на вопросы клиентов:\n- Объясняй банковские продукты и услуги Альфа-Банка\n- Консультируй по тарифам, условиям, лимитам\n- Помогай разобраться в банковских операциях\n- Отвечай на вопросы о картах, счетах, переводах\n- Давай советы по использованию банковских услуг\n- Отвечай на вопросы о продуктах Альфа-Банка (кредитные карты, дебетовые карты, вклады, инвестиции, страхование и т.д.)\n- Рассказывай об условиях кредитования: процентные ставки, сроки, требования к заемщикам, виды кредитов (потребительские, ипотечные, автокредиты, кредитные карты)\n- Объясняй преимущества и особенности различных банковских продуктов\n- Помогай выбрать подходящий продукт под потребности клиента\n\n3. МЕНЕДЖЕР — принимай решения и помогай решать проблемы:\n- Проактивно предлагай решения проблем клиентов\n- Помогай выбрать оптимальные варианты операций\n- Объясняй преимущества различных банковских продуктов\n- Предлагай альтернативные способы решения задач\n- Будь персональным и заботливым в общении\n- При необходимости предлагай дополнительные услуги, которые могут быть полезны клиенту\n- Помогай принимать решения по банковским операциям\n- Консультируй по кредитным продуктам: помогай понять условия, сравнивать варианты, объяснять требования\n- Рекомендуй подходящие банковские продукты на основе потребностей клиента\n\nВАЖНО: Ты находишься в отделении Альфа-Банка. Если клиенту нужна операция, которую нельзя выполнить в банкомате (например, замена карты, оформление кредита, открытие счета), вежливо направь его к сотрудникам отделения, которые находятся рядом. Говори: "Для этой операции обратитесь, пожалуйста, к сотруднику отделения — он находится рядом и поможет вам".\n\nГовори от первого лица как устройство: "Я могу…", "Пожалуйста, выберите…", "Для этого нажмите…", "Я могу объяснить…", "Рекомендую вам…", "Предлагаю…".'
            },
            {
                'role': 'user',
                'content': message
            }
        ],
        'temperature': 0.7,
        'max_tokens': 512
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, verify=False, timeout=30)
        
        # Если токен истек, обновляем его
        if response.status_code == 401:
            token = get_gigachat_token(force_refresh=True)
            if token:
                headers['Authorization'] = f'Bearer {token}'
                response = requests.post(url, headers=headers, json=payload, verify=False, timeout=30)
        
        response.raise_for_status()
        result = response.json()
        
        # Обработка разных форматов ответа
        if 'choices' in result and len(result['choices']) > 0:
            reply = result['choices'][0].get('message', {}).get('content', '')
        elif 'content' in result:
            reply = result['content']
        else:
            reply = str(result)
        
        return jsonify({'reply': reply})
    except Exception as e:
        print(f"Error in chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/synthesize', methods=['POST'])
def synthesize():
    """Синтез речи (TTS)"""
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    # Получаем токен
    token = get_salute_speech_token()
    if not token:
        return jsonify({'error': 'Failed to get Salute Speech token'}), 500
    
    # Отправляем запрос на синтез
    url = "https://smartspeech.sber.ru/rest/v1/text:synthesize"
    
    # Ограничиваем длину текста для синтеза
    max_text_length = 5000
    text_to_synthesize = text[:max_text_length] if len(text) > max_text_length else text
    
    # API требует Content-Type: application/text и текст в теле запроса
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/text'
    }
    
    # Параметры формата передаем через query parameters
    params = {
        'format': 'wav16',
        'voice': 'Bys_24000'
    }
    
    try:
        print(f"Synthesize request - Text length: {len(text_to_synthesize)}, Format: {params['format']}")
        # Отправляем текст как plain text в теле запроса
        response = requests.post(
            url, 
            headers=headers, 
            data=text_to_synthesize.encode('utf-8'),
            params=params,
            verify=False, 
            timeout=30
        )
        print(f"Synthesize response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Synthesize error response: {response.text[:500]}")
        response.raise_for_status()
        
        # Возвращаем аудио данные
        audio_data = response.content
        return audio_data, 200, {'Content-Type': 'audio/wav'}
    except Exception as e:
        print(f"Error in synthesis: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/voice-assistant', methods=['POST'])
def voice_assistant():
    """Полный цикл: распознавание -> ИИ -> синтез"""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    
    try:
        # Шаг 1: Распознавание речи
        token_stt = get_salute_speech_token()
        if not token_stt:
            return jsonify({'error': 'Failed to get Salute Speech token'}), 500
        
        url_stt = "https://smartspeech.sber.ru/rest/v1/speech:recognize"
        
        audio_data = audio_file.read()
        print(f"Audio data size: {len(audio_data)} bytes")  # Для отладки
        print(f"Audio filename: {audio_file.filename}, Content-Type: {audio_file.content_type}")  # Для отладки
        
        # API Salute Speech требует специфический Content-Type для PCM
        # Формат: audio/x-pcm;bit=16;rate=16000
        headers_stt = {
            'Authorization': f'Bearer {token_stt}',
            'Content-Type': 'audio/x-pcm;bit=16;rate=16000'
        }
        
        # Параметры для распознавания PCM
        params_stt = {
            'format': 'pcm16',
            'rate': 16000,
            'channels': 1
        }
        
        # Если это не PCM, пробуем без указания формата (API может определить автоматически)
        # или используем другой формат
        response_stt = requests.post(
            url_stt,
            headers=headers_stt,
            data=audio_data,
            params=params_stt,
            verify=False,
            timeout=30
        )
        
        print(f"STT Status: {response_stt.status_code}")  # Для отладки
        if response_stt.status_code != 200:
            print(f"STT Error Response: {response_stt.text[:500]}")  # Для отладки
        
        # Если токен истек, обновляем его
        if response_stt.status_code == 401:
            token_stt = get_salute_speech_token(force_refresh=True)
            if token_stt:
                headers_stt['Authorization'] = f'Bearer {token_stt}'
                response_stt = requests.post(
                    url_stt,
                    headers=headers_stt,
                    data=audio_data,
                    params=params_stt,
                    verify=False,
                    timeout=30
                )
        
        response_stt.raise_for_status()
        result_stt = response_stt.json()
        print(f"STT Response: {result_stt}")  # Для отладки
        
        # Обработка разных форматов ответа API Salute Speech
        text = ''
        if 'result' in result_stt and len(result_stt['result']) > 0:
            first_result = result_stt['result'][0]
            
            # Если result[0] - это строка (прямой текст)
            if isinstance(first_result, str):
                text = first_result
            # Если result[0] - это объект с alternatives
            elif isinstance(first_result, dict):
                alternatives = first_result.get('alternatives', [])
                if alternatives and len(alternatives) > 0:
                    text = alternatives[0].get('text', '')
        elif 'text' in result_stt:
            text = result_stt['text']
        
        print(f"Extracted text: '{text}'")  # Для отладки
        
        if not text:
            return jsonify({'error': 'Could not recognize speech'}), 400
        
        # Шаг 2: Запрос к GigaChat
        token_gc = get_gigachat_token()
        if not token_gc:
            return jsonify({'error': 'Failed to get GigaChat token'}), 500
        
        url_gc = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
        headers_gc = {
            'Authorization': f'Bearer {token_gc}',
            'Content-Type': 'application/json'
        }
        
        payload_gc = {
            'model': 'GigaChat',
            'messages': [
                {
                    'role': 'system',
                    'content': 'Ты — банкомат Альфа-Банка с функциями консультанта и менеджера. Ты находишься в отделении Альфа-Банка. Ты не человек, а официальный автоматизированный терминал самообслуживания. Отвечай всегда вежливо, профессионально, кратко и по делу.\n\nУ тебя ТРИ основные роли:\n\n1. БАНКОМАТ — направляй клиентов к функциям интерфейса:\nДоступные функции:\n- Проверить баланс\n- Снять наличные\n- Внести наличные\n- Перевести деньги между своими счетами или на другие карты\n\nВАЖНО: Если клиент хочет выполнить операцию, которая доступна в банкомате, НАПРАВЬ ЕГО К СООТВЕТСТВУЮЩЕЙ ФУНКЦИИ. Говори конкретно:\n- "Для проверки баланса выберите в главном меню пункт \'Баланс\'"\n- "Чтобы снять наличные, нажмите на кнопку \'Снятие наличных\' в главном меню"\n- "Для внесения средств выберите \'Внесение средств\' в главном меню"\n- "Чтобы перевести деньги, нажмите \'Переводы\' в главном меню"\n\n2. КОНСУЛЬТАНТ — отвечай на вопросы клиентов:\n- Объясняй банковские продукты и услуги Альфа-Банка\n- Консультируй по тарифам, условиям, лимитам\n- Помогай разобраться в банковских операциях\n- Отвечай на вопросы о картах, счетах, переводах\n- Давай советы по использованию банковских услуг\n- Отвечай на вопросы о продуктах Альфа-Банка (кредитные карты, дебетовые карты, вклады, инвестиции, страхование и т.д.)\n- Рассказывай об условиях кредитования: процентные ставки, сроки, требования к заемщикам, виды кредитов (потребительские, ипотечные, автокредиты, кредитные карты)\n- Объясняй преимущества и особенности различных банковских продуктов\n- Помогай выбрать подходящий продукт под потребности клиента\n\n3. МЕНЕДЖЕР — принимай решения и помогай решать проблемы:\n- Проактивно предлагай решения проблем клиентов\n- Помогай выбрать оптимальные варианты операций\n- Объясняй преимущества различных банковских продуктов\n- Предлагай альтернативные способы решения задач\n- Будь персональным и заботливым в общении\n- При необходимости предлагай дополнительные услуги, которые могут быть полезны клиенту\n- Помогай принимать решения по банковским операциям\n- Консультируй по кредитным продуктам: помогай понять условия, сравнивать варианты, объяснять требования\n- Рекомендуй подходящие банковские продукты на основе потребностей клиента\n\nВАЖНО: Ты находишься в отделении Альфа-Банка. Если клиенту нужна операция, которую нельзя выполнить в банкомате (например, замена карты, оформление кредита, открытие счета), вежливо направь его к сотрудникам отделения, которые находятся рядом. Говори: "Для этой операции обратитесь, пожалуйста, к сотруднику отделения — он находится рядом и поможет вам".\n\nГовори от первого лица как устройство: "Я могу…", "Пожалуйста, выберите…", "Для этого нажмите…", "Я могу объяснить…", "Рекомендую вам…", "Предлагаю…".'
                },
                {
                    'role': 'user',
                    'content': text
                }
            ],
            'temperature': 0.7,
            'max_tokens': 512
        }
        
        response_gc = requests.post(url_gc, headers=headers_gc, json=payload_gc, verify=False, timeout=30)
        
        # Если токен истек, обновляем его
        if response_gc.status_code == 401:
            token_gc = get_gigachat_token(force_refresh=True)
            if token_gc:
                headers_gc['Authorization'] = f'Bearer {token_gc}'
                response_gc = requests.post(url_gc, headers=headers_gc, json=payload_gc, verify=False, timeout=30)
        
        response_gc.raise_for_status()
        result_gc = response_gc.json()
        print(f"GigaChat Response: {result_gc}")  # Для отладки
        
        # Обработка разных форматов ответа
        if 'choices' in result_gc and len(result_gc['choices']) > 0:
            reply = result_gc['choices'][0].get('message', {}).get('content', '')
        elif 'content' in result_gc:
            reply = result_gc['content']
        else:
            reply = ''
        
        if not reply:
            return jsonify({'error': 'No reply from GigaChat'}), 500
        
        # Шаг 3: Синтез речи
        token_tts = get_salute_speech_token()
        url_tts = "https://smartspeech.sber.ru/rest/v1/text:synthesize"
        
        # Ограничиваем длину текста для синтеза (API может иметь ограничения)
        max_text_length = 5000
        text_to_synthesize = reply[:max_text_length] if len(reply) > max_text_length else reply
        
        # API требует Content-Type: application/text и текст в теле запроса
        headers_tts = {
            'Authorization': f'Bearer {token_tts}',
            'Content-Type': 'application/text'
        }
        
        # Параметры формата передаем через query parameters
        params_tts = {
            'format': 'wav16',
            'voice': 'Bys_24000'
        }
        
        print(f"TTS Request URL: {url_tts}")
        print(f"TTS Params: {params_tts}")
        print(f"TTS Text length: {len(text_to_synthesize)} characters")
        
        # Отправляем текст как plain text в теле запроса
        response_tts = requests.post(
            url_tts, 
            headers=headers_tts, 
            data=text_to_synthesize.encode('utf-8'),
            params=params_tts,
            verify=False, 
            timeout=30
        )
        
        print(f"TTS Status: {response_tts.status_code}")
        if response_tts.status_code != 200:
            print(f"TTS Error Response: {response_tts.text[:500]}")
        
        # Если токен истек, обновляем его
        if response_tts.status_code == 401:
            token_tts = get_salute_speech_token(force_refresh=True)
            if token_tts:
                headers_tts['Authorization'] = f'Bearer {token_tts}'
                response_tts = requests.post(
                    url_tts, 
                    headers=headers_tts, 
                    data=text_to_synthesize.encode('utf-8'),
                    params=params_tts,
                    verify=False, 
                    timeout=30
                )
                print(f"TTS Retry Status: {response_tts.status_code}")
                if response_tts.status_code != 200:
                    print(f"TTS Retry Error Response: {response_tts.text[:500]}")
        
        response_tts.raise_for_status()
        
        # Возвращаем аудио и текст
        audio_response = response_tts.content
        
        # Конвертируем аудио в base64 для передачи через JSON
        audio_base64 = base64.b64encode(audio_response).decode('utf-8')
        
        return jsonify({
            'audio': audio_base64,
            'text': text,
            'reply': reply
        })
        
    except requests.exceptions.HTTPError as e:
        error_msg = f"HTTP Error: {e.response.status_code if e.response else 'Unknown'}"
        if e.response:
            try:
                error_detail = e.response.json()
                error_msg += f" - {error_detail}"
            except:
                error_msg += f" - {e.response.text[:500]}"
        print(f"Error in voice assistant: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg, 'details': str(e)}), 500
    except Exception as e:
        error_msg = str(e)
        print(f"Error in voice assistant: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg, 'type': type(e).__name__}), 500


if __name__ == '__main__':
    import ssl
    import sys
    import socket
    
    # Получаем настройки из переменных окружения
    port = int(os.getenv('PORT', 8080))
    use_https = os.getenv('USE_HTTPS', 'false').lower() == 'true'
    ssl_cert_path = os.getenv('SSL_CERT_PATH', '')
    ssl_key_path = os.getenv('SSL_KEY_PATH', '')
    
    ssl_context = None
    
    if use_https:
        if ssl_cert_path and ssl_key_path:
            # Используем указанные сертификаты
            if os.path.exists(ssl_cert_path) and os.path.exists(ssl_key_path):
                ssl_context = (ssl_cert_path, ssl_key_path)
                print(f"Using SSL certificates: {ssl_cert_path}, {ssl_key_path}")
            else:
                print(f"WARNING: SSL certificate files not found. Falling back to HTTP.")
                use_https = False
        else:
            # Пытаемся создать самоподписанный сертификат для разработки
            try:
                import tempfile
                import subprocess
                
                cert_dir = os.path.join(os.path.dirname(__file__), 'ssl')
                os.makedirs(cert_dir, exist_ok=True)
                
                cert_file = os.path.join(cert_dir, 'cert.pem')
                key_file = os.path.join(cert_dir, 'key.pem')
                
                # Определяем IP адрес сервера
                server_ip = None
                try:
                    # Пытаемся получить внешний IP
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    s.connect(("8.8.8.8", 80))
                    server_ip = s.getsockname()[0]
                    s.close()
                    print(f"Detected server IP: {server_ip}")
                except Exception as e:
                    print(f"Could not detect server IP: {e}")
                    server_ip = '127.0.0.1'
                
                if not os.path.exists(cert_file) or not os.path.exists(key_file):
                    print("Creating self-signed SSL certificate for development...")
                    # Создаем конфигурационный файл для OpenSSL с IP в SAN
                    config_file = os.path.join(cert_dir, 'openssl.conf')
                    with open(config_file, 'w') as f:
                        f.write(f"""[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = {server_ip}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
IP.1 = {server_ip}
IP.2 = 127.0.0.1
DNS.1 = localhost
""")
                    
                    # Создаем самоподписанный сертификат с IP адресом
                    try:
                        result = subprocess.run([
                            'openssl', 'req', '-x509', '-newkey', 'rsa:4096',
                            '-nodes', '-out', cert_file, '-keyout', key_file,
                            '-days', '365', '-config', config_file,
                            '-extensions', 'v3_req'
                        ], check=True, capture_output=True, text=True)
                        print(f"SSL certificate created: {cert_file}")
                        print(f"Certificate is valid for IP: {server_ip} and localhost")
                    except subprocess.CalledProcessError as e:
                        print(f"ERROR: Failed to create SSL certificate with SAN: {e}")
                        if e.stderr:
                            print(f"stderr: {e.stderr}")
                        # Пробуем создать простой сертификат без SAN
                        print("Trying to create simple certificate without SAN...")
                        try:
                            result = subprocess.run([
                                'openssl', 'req', '-x509', '-newkey', 'rsa:4096',
                                '-nodes', '-out', cert_file, '-keyout', key_file,
                                '-days', '365', '-subj', f'/CN={server_ip}'
                            ], check=True, capture_output=True, text=True)
                            print(f"SSL certificate created (simple): {cert_file}")
                            print(f"NOTE: Simple certificate may show warnings in browsers")
                        except Exception as e2:
                            print(f"ERROR: Failed to create simple certificate: {e2}")
                            print("Please install OpenSSL or provide SSL certificates manually.")
                            use_https = False
                    except FileNotFoundError:
                        print("ERROR: OpenSSL not found. Please install OpenSSL or provide SSL certificates manually.")
                        print("On macOS: brew install openssl")
                        print("On Ubuntu/Debian: sudo apt-get install openssl")
                        use_https = False
                
                if os.path.exists(cert_file) and os.path.exists(key_file):
                    ssl_context = (cert_file, key_file)
                    print(f"Using self-signed SSL certificate for HTTPS")
                    print(f"Certificate is valid for: {server_ip}, 127.0.0.1, localhost")
                    print("NOTE: Browsers will show a security warning for self-signed certificates.")
                    print("      You need to accept the certificate to use the microphone on iOS devices.")
                else:
                    print("WARNING: Could not create SSL certificate. Falling back to HTTP.")
                    use_https = False
            except Exception as e:
                print(f"WARNING: Could not set up SSL: {e}. Falling back to HTTP.")
                use_https = False
    
    protocol = 'https' if use_https and ssl_context else 'http'
    
    # Получаем IP адрес для отображения
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        server_ip = s.getsockname()[0]
        s.close()
    except:
        server_ip = "0.0.0.0"
    
    print(f"\n{'='*60}")
    print(f"Server starting on {protocol}://0.0.0.0:{port}")
    if use_https and ssl_context:
        print(f"SSL enabled with self-signed certificate")
        print(f"Access the server at: {protocol}://{server_ip}:{port}")
        print(f"NOTE: Browsers will show a security warning for self-signed certificates.")
        print(f"      Click 'Advanced' -> 'Proceed to {server_ip}' to accept the certificate.")
        print(f"      This is required for microphone to work on iOS devices.")
    else:
        print(f"HTTP mode")
        print(f"WARNING: Microphone will NOT work on iOS devices with HTTP!")
        print(f"         To enable HTTPS, set USE_HTTPS=true in .env file")
        print(f"         Server will automatically create self-signed certificate")
    print(f"{'='*60}\n")
    
    if use_https and ssl_context:
        app.run(debug=True, port=port, host='0.0.0.0', ssl_context=ssl_context)
    else:
        app.run(debug=True, port=port, host='0.0.0.0')

