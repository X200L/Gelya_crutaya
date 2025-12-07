        // Автоматическое определение URL API на основе текущего хоста
        const API_URL = window.location.origin + '/api';
        let mediaRecorder;
        let audioChunks = [];
        let currentAudioBlob = null;
        let recordingStartTime = null;
        let recordingTimer = null;
        let audioContext = null;
        let mediaStream = null;
        let audioWorkletNode = null;
        let audioBuffer = [];
        let useWebAudioFallback = false;

        const recordBtn = document.getElementById('recordBtn');
        const status = document.getElementById('status');
        const errorDiv = document.getElementById('error');
        const mainMenu = document.getElementById('mainMenu');
        const voiceScreen = document.getElementById('voiceScreen');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const feedbackScreen = document.getElementById('feedbackScreen');
        let isRecording = false;
        let selectedRating = null;

        // Начало обслуживания
        function startService() {
            // Скрываем все экраны
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            welcomeScreen.classList.remove('active');
            feedbackScreen.classList.remove('active');
            // Показываем главное меню
            mainMenu.style.display = 'grid';
        }

        // Показ главного меню
        function showMainMenu() {
            // Скрываем все экраны (включая welcome и feedback)
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            welcomeScreen.classList.remove('active');
            feedbackScreen.classList.remove('active');
            // Показываем главное меню
            mainMenu.style.display = 'grid';
            // Сбрасываем активную кнопку
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }

        // Показ экрана обратной связи
        function showFeedbackScreen() {
            // Скрываем все экраны
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            welcomeScreen.classList.remove('active');
            // Скрываем главное меню
            mainMenu.style.display = 'none';
            // Показываем экран обратной связи
            feedbackScreen.classList.add('active');
            // Сбрасываем выбор оценки
            selectedRating = null;
            document.querySelectorAll('.rating-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            document.getElementById('thankYouMessage').style.display = 'none';
        }

        // Выбор оценки
        function selectRating(rating) {
            selectedRating = rating;
            // Обновляем визуальное состояние кнопок
            document.querySelectorAll('.rating-btn').forEach((btn, index) => {
                if (index + 1 === rating) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
            // Показываем сообщение благодарности
            document.getElementById('thankYouMessage').style.display = 'block';
            console.log('Оценка:', rating);
        }

        // Выход из обслуживания
        function exitService() {
            // Отправляем оценку на сервер (если выбрана)
            if (selectedRating) {
                // Здесь можно отправить оценку на сервер
                console.log('Отправка оценки на сервер:', selectedRating);
            }
            
            // Скрываем все экраны и меню
            feedbackScreen.classList.remove('active');
            mainMenu.style.display = 'none';
            document.querySelectorAll('.screen').forEach(screen => {
                if (screen.id !== 'welcomeScreen') {
                    screen.classList.remove('active');
                }
            });
            
            // Показываем начальный экран
            welcomeScreen.classList.add('active');
            
            // Сбрасываем все состояния
            selectedRating = null;
            document.querySelectorAll('.rating-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }

        // Показ экрана функции
        function showScreen(screenName, buttonElement) {
            // Скрываем начальный экран и экран обратной связи
            welcomeScreen.classList.remove('active');
            feedbackScreen.classList.remove('active');
            // Скрываем главное меню
            mainMenu.style.display = 'none';
            // Скрываем все остальные экраны
            document.querySelectorAll('.screen').forEach(screen => {
                if (screen.id !== 'welcomeScreen' && screen.id !== 'feedbackScreen') {
                    screen.classList.remove('active');
                }
            });
            // Показываем нужный экран
            const screen = document.getElementById(screenName + 'Screen');
            if (screen) {
                screen.classList.add('active');
                
                // Инициализируем микрофон при открытии экрана голосового помощника
                if (screenName === 'voice' && !mediaRecorder && !audioContext) {
                    // Для iOS важно инициализировать в контексте user gesture
                    initRecording().catch(err => {
                        console.error('Failed to initialize recording on screen open:', err);
                        // Не показываем ошибку сразу, пользователь попробует нажать кнопку
                    });
                }
            }
            // Обновляем активную кнопку
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            if (buttonElement) {
                buttonElement.classList.add('active');
            }
        }

        // Установка суммы
        function setAmount(amount) {
            const input = document.getElementById('withdrawAmount');
            if (input) {
                input.value = amount;
            }
        }

        // Обработка снятия наличных
        function processWithdraw() {
            const amount = document.getElementById('withdrawAmount').value;
            if (!amount || amount < 100) {
                showError('Минимальная сумма снятия: 100 ₽');
                return;
            }
            status.textContent = 'Обработка запроса...';
            status.className = 'status processing';
            setTimeout(() => {
                showError('Функция в разработке');
            }, 1000);
        }

        // Обработка перевода
        function processTransfer() {
            const account = document.getElementById('transferAccount').value;
            const amount = document.getElementById('transferAmount').value;
            if (!account || !amount) {
                showError('Заполните все поля');
                return;
            }
            status.textContent = 'Обработка перевода...';
            status.className = 'status processing';
            setTimeout(() => {
                showError('Функция в разработке');
            }, 1000);
        }

        // Переключение темы
        function toggleTheme() {
            const toggle = document.getElementById('themeToggle');
            const body = document.body;
            if (body.classList.contains('light-theme')) {
                body.classList.remove('light-theme');
                toggle.classList.add('active');
                localStorage.setItem('theme', 'dark');
            } else {
                body.classList.add('light-theme');
                toggle.classList.remove('active');
                localStorage.setItem('theme', 'light');
            }
        }

        // Загрузка сохраненной темы
        function loadTheme() {
            const savedTheme = localStorage.getItem('theme');
            const toggle = document.getElementById('themeToggle');
            if (savedTheme === 'light') {
                document.body.classList.add('light-theme');
                toggle.classList.remove('active');
            } else {
                document.body.classList.remove('light-theme');
                toggle.classList.add('active');
            }
        }

        // Проверка поддержки MediaRecorder
        function checkMediaRecorderSupport() {
            // iOS Safari не поддерживает MediaRecorder вообще
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            // Для iOS Safari всегда используем Web Audio API
            if (isIOS || (isSafari && !window.chrome)) {
                return false;
            }
            
            if (typeof MediaRecorder === 'undefined') {
                return false;
            }
            
            // Проверяем реальную поддержку для других браузеров
            try {
                const testRecorder = new MediaRecorder(new MediaStream());
                return testRecorder && typeof testRecorder.start === 'function';
            } catch (e) {
                return false;
            }
        }

        // Получение getUserMedia с поддержкой старых браузеров и iOS
        function getUserMedia(constraints) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const userAgent = navigator.userAgent;
            
            console.log('getUserMedia called. iOS:', isIOS, 'UserAgent:', userAgent);
            console.log('navigator.mediaDevices:', navigator.mediaDevices);
            console.log('navigator.mediaDevices.getUserMedia:', navigator.mediaDevices?.getUserMedia);
            
            // Для современных браузеров (включая iOS Safari 11+)
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                console.log('Using navigator.mediaDevices.getUserMedia');
                return navigator.mediaDevices.getUserMedia(constraints);
            }
            
            // Fallback для старых браузеров (но не для iOS, там это не работает)
            const getUserMediaLegacy = navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia;
            
            if (!getUserMediaLegacy) {
                // Для iOS Safari, если mediaDevices нет, это означает очень старую версию
                if (isIOS) {
                    console.error('iOS device detected but no getUserMedia support found');
                    throw new Error('Ваша версия iOS Safari не поддерживает запись аудио. Пожалуйста, обновите iOS до версии 11 или выше.');
                }
                console.error('No getUserMedia support found');
                throw new Error('Ваш браузер не поддерживает запись аудио. Пожалуйста, используйте современный браузер (Chrome, Firefox, Safari).');
            }
            
            console.log('Using legacy getUserMedia');
            // Обертка для legacy API
            return new Promise((resolve, reject) => {
                getUserMediaLegacy.call(navigator, constraints, resolve, reject);
            });
        }

        // Инициализация записи
        async function initRecording() {
            try {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isLocalhost = location.hostname === 'localhost' || 
                                   location.hostname === '127.0.0.1' || 
                                   location.hostname === '0.0.0.0' ||
                                   location.hostname.startsWith('192.168.') ||
                                   location.hostname.startsWith('10.') ||
                                   location.hostname.startsWith('172.');
                
                // На iOS getUserMedia работает только по HTTPS, кроме localhost
                // Для других браузеров HTTP на localhost тоже работает
                if (isIOS && location.protocol !== 'https:' && !isLocalhost) {
                    throw new Error('Для работы микрофона на iOS требуется HTTPS соединение. Пожалуйста, откройте сайт по HTTPS или используйте localhost для разработки.');
                }
                
                // Для других браузеров предупреждаем, но не блокируем на localhost
                if (!isIOS && location.protocol !== 'https:' && !isLocalhost) {
                    console.warn('getUserMedia рекомендуется использовать по HTTPS для безопасности');
                }
                
                // Для iOS Safari используем более простые настройки аудио
                const audioConstraints = isIOS ? {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                        // Не указываем sampleRate для iOS, используем нативный
                    }
                } : {
                    audio: {
                        sampleRate: 16000,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                };

                // Используем универсальную функцию getUserMedia
                const stream = await getUserMedia(audioConstraints);
                
                mediaStream = stream;
                
                // Проверяем поддержку MediaRecorder
                if (checkMediaRecorderSupport()) {
                    useWebAudioFallback = false;
                    await initMediaRecorder(stream);
                } else {
                    // Используем Web Audio API как fallback для Safari/iOS
                    useWebAudioFallback = true;
                    await initWebAudioRecorder(stream);
                }
                
            } catch (err) {
                console.error('Microphone initialization error:', err);
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                let errorMessage = '';
                
                // Проверяем, есть ли уже сообщение об ошибке в тексте ошибки
                if (err.message && err.message.includes('не поддерживает запись аудио')) {
                    errorMessage = err.message;
                } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    if (isIOS) {
                        errorMessage = 'Доступ к микрофону запрещен. Пожалуйста, разрешите доступ к микрофону в настройках Safari (Настройки > Safari > Микрофон) или нажмите на иконку микрофона в адресной строке Safari.';
                    } else {
                        errorMessage = 'Доступ к микрофону запрещен. Пожалуйста, разрешите доступ к микрофону в настройках браузера.';
                    }
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    errorMessage = 'Микрофон не найден. Проверьте подключение устройства.';
                } else if (err.name === 'NotSupportedError' || err.name === 'NotReadableError' || err.name === 'OverconstrainedError') {
                    const isLocalhost = location.hostname === 'localhost' || 
                                       location.hostname === '127.0.0.1' || 
                                       location.hostname === '0.0.0.0';
                    if (isIOS) {
                        // На iOS NotSupportedError обычно означает проблему с разрешениями или настройками
                        if (isLocalhost) {
                            errorMessage = 'Ошибка доступа к микрофону на iOS. Убедитесь, что: 1) Вы используете Safari (не Chrome), 2) Вы дали разрешение на микрофон (иконка в адресной строке), 3) Микрофон не занят другим приложением.';
                        } else {
                            errorMessage = 'Ошибка доступа к микрофону на iOS. Убедитесь, что: 1) Вы используете Safari (не Chrome), 2) Сайт открыт по HTTPS, 3) Вы дали разрешение на микрофон (иконка в адресной строке), 4) Микрофон не занят другим приложением.';
                        }
                    } else {
                        errorMessage = 'Ваш браузер не поддерживает запись аудио или микрофон занят другим приложением. Попробуйте использовать Chrome или Firefox.';
                    }
                } else if (err.name === 'TypeError' || (err.message && err.message.includes('getUserMedia'))) {
                    const isLocalhost = location.hostname === 'localhost' || 
                                       location.hostname === '127.0.0.1' || 
                                       location.hostname === '0.0.0.0';
                    if (isIOS) {
                        if (isLocalhost) {
                            errorMessage = 'Ошибка инициализации микрофона на iOS. Убедитесь, что вы используете Safari и дали разрешение на доступ к микрофону.';
                        } else {
                            errorMessage = 'Ошибка инициализации микрофона на iOS. Убедитесь, что вы используете Safari, сайт открыт по HTTPS (не HTTP), и дали разрешение на микрофон.';
                        }
                    } else {
                        errorMessage = 'Ошибка инициализации микрофона. Убедитесь, что вы используете HTTPS или localhost.';
                    }
                } else if (err.message && err.message.includes('Web Audio API')) {
                    errorMessage = 'Ошибка инициализации аудио системы. Попробуйте обновить страницу и нажать кнопку микрофона еще раз.';
                } else if (err.message) {
                    errorMessage = err.message;
                } else {
                    if (isIOS) {
                        errorMessage = 'Ошибка доступа к микрофону. Убедитесь, что вы используете Safari, дали разрешение на микрофон и сайт открыт по HTTPS.';
                    } else {
                        errorMessage = 'Ошибка доступа к микрофону. Попробуйте обновить страницу и нажать кнопку микрофона еще раз.';
                    }
                }
                
                showError(errorMessage);
                // Сбрасываем состояние для повторной попытки
                mediaRecorder = null;
                audioContext = null;
                audioWorkletNode = null;
                mediaStream = null;
            }
        }

        // Инициализация MediaRecorder (для Chrome, Firefox и др.)
        async function initMediaRecorder(stream) {
            // Определяем поддерживаемый формат
            let mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported('audio/webm')) {
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                    mimeType = 'audio/ogg';
                } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                    mimeType = 'audio/wav';
                } else {
                    // Используем формат по умолчанию
                    mimeType = '';
                }
            }
            
            const options = {};
            if (mimeType) {
                options.mimeType = mimeType;
            }
            options.audioBitsPerSecond = 128000;
            
            mediaRecorder = new MediaRecorder(stream, options);
            
            // Собираем данные каждые 100ms для более надежной записи
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data);
                    console.log('Audio chunk received:', event.data.size, 'bytes');
                }
            };

            mediaRecorder.onstop = async () => {
                await handleRecordingStop();
            };
            
            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                handleRecordingError();
            };
        }

        // Инициализация Web Audio API (для Safari и iOS)
        async function initWebAudioRecorder(stream) {
            try {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                
                if (!AudioContextClass) {
                    const errorMsg = isIOS 
                        ? 'Web Audio API не поддерживается. Убедитесь, что вы используете Safari и обновили iOS до последней версии.'
                        : 'Web Audio API не поддерживается вашим браузером.';
                    throw new Error(errorMsg);
                }
                
                // Для iOS нужно использовать sampleRate по умолчанию или разрешенный
                // iOS Safari обычно поддерживает 44100 или 48000, но не 16000 напрямую
                // Мы будем записывать с нативной частотой и ресемплировать при необходимости
                try {
                    audioContext = new AudioContextClass();
                } catch (e) {
                    console.error('Failed to create AudioContext:', e);
                    throw new Error('Не удалось создать аудио контекст. Убедитесь, что вы используете Safari на iOS.');
                }
                
                console.log('AudioContext created. State:', audioContext.state, 'Sample rate:', audioContext.sampleRate);
                
                // Проверяем, что контекст не приостановлен (iOS требует user gesture)
                if (audioContext.state === 'suspended') {
                    console.log('AudioContext is suspended, will resume on user gesture');
                    // Не пытаемся возобновить здесь, это будет сделано при нажатии кнопки
                }
                
                const source = audioContext.createMediaStreamSource(stream);
                
                // Создаем ScriptProcessorNode для записи (deprecated, но работает в Safari/iOS)
                // Используем bufferSize 4096 для лучшей производительности
                const bufferSize = 4096;
                let processor;
                try {
                    processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
                } catch (e) {
                    console.error('Failed to create ScriptProcessor:', e);
                    throw new Error('Не удалось создать процессор аудио. Возможно, ваша версия iOS Safari слишком старая.');
                }
                
                processor.onaudioprocess = (e) => {
                    if (isRecording) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Копируем данные в новый буфер
                        const buffer = new Float32Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            buffer[i] = inputData[i];
                        }
                        audioBuffer.push(buffer);
                    }
                };
                
                source.connect(processor);
                // Для iOS не подключаем к destination, чтобы избежать feedback
                // processor.connect(audioContext.destination);
                
                // Сохраняем ссылки для остановки
                audioWorkletNode = processor;
                
                console.log('Web Audio API recorder initialized for Safari/iOS. Sample rate:', audioContext.sampleRate);
            } catch (err) {
                console.error('Web Audio API initialization error:', err);
                // Передаем более понятное сообщение об ошибке
                if (err.message && !err.message.includes('Web Audio API')) {
                    throw new Error('Ошибка инициализации аудио: ' + err.message);
                }
                throw err;
            }
        }

        // Обработка остановки записи
        async function handleRecordingStop() {
            // Останавливаем таймер если он еще работает
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }
            
            isRecording = false;
            
            let audioBlob;
            
            if (useWebAudioFallback) {
                // Конвертируем аудио буфер в WAV для Safari
                audioBlob = await convertAudioBufferToWAV();
                audioBuffer = [];
            } else {
                console.log('Recording stopped. Total chunks:', audioChunks.length);
                
                if (audioChunks.length === 0) {
                    showError('Запись не удалась. Попробуйте еще раз.');
                    status.textContent = 'Готов к работе';
                    status.className = 'status idle';
                    recordBtn.disabled = false;
                    recordingStartTime = null;
                    return;
                }
                
                audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                console.log('Audio blob size:', audioBlob.size, 'bytes');
            }
            
            // Проверяем минимальный размер (хотя бы 1KB)
            if (audioBlob.size < 1024) {
                showError('Запись слишком короткая. Пожалуйста, говорите дольше (минимум 1-2 секунды).');
                status.textContent = 'Готов к работе';
                status.className = 'status idle';
                recordBtn.disabled = false;
                audioChunks = [];
                audioBuffer = [];
                recordingStartTime = null;
                return;
            }
            
            await processAudio(audioBlob);
            audioChunks = [];
            audioBuffer = [];
            recordingStartTime = null;
        }

        // Конвертация аудио буфера в WAV (для Safari/iOS)
        async function convertAudioBufferToWAV() {
            if (!audioBuffer || audioBuffer.length === 0) {
                throw new Error('Нет данных для конвертации');
            }
            
            // Объединяем все буферы
            let totalLength = 0;
            for (let i = 0; i < audioBuffer.length; i++) {
                totalLength += audioBuffer[i].length;
            }
            
            if (totalLength === 0) {
                throw new Error('Нет аудио данных для конвертации');
            }
            
            const mergedBuffer = new Float32Array(totalLength);
            let bufferOffset = 0;
            for (let i = 0; i < audioBuffer.length; i++) {
                mergedBuffer.set(audioBuffer[i], bufferOffset);
                bufferOffset += audioBuffer[i].length;
            }
            
            // Получаем sample rate из audioContext (может быть 44100 или 48000 на iOS)
            const sourceSampleRate = audioContext ? audioContext.sampleRate : 44100;
            const targetSampleRate = 16000; // Целевая частота для API
            
            // Ресемплируем если нужно (простое понижающее сэмплирование)
            let resampledBuffer = mergedBuffer;
            if (sourceSampleRate !== targetSampleRate) {
                const ratio = sourceSampleRate / targetSampleRate;
                const newLength = Math.floor(mergedBuffer.length / ratio);
                resampledBuffer = new Float32Array(newLength);
                
                for (let i = 0; i < newLength; i++) {
                    const srcIndex = Math.floor(i * ratio);
                    resampledBuffer[i] = mergedBuffer[srcIndex];
                }
            }
            
            // Конвертируем в 16-bit PCM
            const sampleRate = targetSampleRate;
            const numChannels = 1;
            const bytesPerSample = 2;
            const blockAlign = numChannels * bytesPerSample;
            const byteRate = sampleRate * blockAlign;
            const dataSize = resampledBuffer.length * blockAlign;
            const bufferSize = 44 + dataSize;
            const arrayBuffer = new ArrayBuffer(bufferSize);
            const view = new DataView(arrayBuffer);
            
            // WAV заголовок
            const writeString = (pos, string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(pos + i, string.charCodeAt(i));
                }
            };
            
            writeString(0, 'RIFF');
            view.setUint32(4, bufferSize - 8, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true); // PCM format
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, bytesPerSample * 8, true);
            writeString(36, 'data');
            view.setUint32(40, dataSize, true);
            
            // Данные - конвертируем Float32 в Int16
            let offset = 44;
            for (let i = 0; i < resampledBuffer.length; i++) {
                const sample = Math.max(-1, Math.min(1, resampledBuffer[i]));
                // Конвертируем в 16-bit integer
                const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, intSample, true);
                offset += 2;
            }
            
            return new Blob([arrayBuffer], { type: 'audio/wav' });
        }

        // Обработка ошибок записи
        function handleRecordingError() {
            isRecording = false;
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }
            showError('Ошибка записи. Попробуйте еще раз.');
            status.textContent = 'Готов к работе';
            status.className = 'status idle';
            recordBtn.disabled = false;
            recordBtn.classList.remove('recording');
        }

        // Toggle запись по клику
        function toggleRecording() {
            // Проверяем, инициализирован ли микрофон
            if ((!mediaRecorder && !useWebAudioFallback) || (useWebAudioFallback && !audioContext)) {
                // Для iOS важно инициализировать в контексте user gesture
                showError('Инициализация микрофона...');
                initRecording().then(() => {
                    // После инициализации начинаем запись
                    setTimeout(() => {
                        if (useWebAudioFallback) {
                            if (!isRecording) {
                                startWebAudioRecording();
                            }
                        } else {
                            if (mediaRecorder && mediaRecorder.state === 'inactive' && !isRecording) {
                                startMediaRecorderRecording();
                            }
                        }
                    }, 100);
                }).catch(err => {
                    console.error('Failed to initialize recording:', err);
                    showError('Не удалось инициализировать микрофон. Попробуйте еще раз.');
                });
                return;
            }
            
            if (useWebAudioFallback) {
                // Для Safari/iOS используем Web Audio API
                if (!isRecording) {
                    // Убеждаемся, что audioContext активен (iOS требует user gesture)
                    if (audioContext && audioContext.state === 'suspended') {
                        audioContext.resume().then(() => {
                            startWebAudioRecording();
                        }).catch(err => {
                            console.error('Failed to resume audio context:', err);
                            showError('Не удалось активировать микрофон. Попробуйте еще раз.');
                        });
                    } else {
                        startWebAudioRecording();
                    }
                } else {
                    stopWebAudioRecording();
                }
            } else {
                // Для других браузеров используем MediaRecorder
                if (mediaRecorder.state === 'inactive' && !isRecording) {
                    startMediaRecorderRecording();
                } else if (mediaRecorder.state === 'recording' && isRecording) {
                    stopMediaRecorderRecording();
                }
            }
        }

        // Начало записи через MediaRecorder
        function startMediaRecorderRecording() {
            audioChunks = [];
            mediaRecorder.start(100);
            recordBtn.classList.add('recording');
            status.className = 'status recording';
            errorDiv.classList.remove('show');
            isRecording = true;
            console.log('Recording started (MediaRecorder)');
            
            recordingStartTime = Date.now();
            recordingTimer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
                status.textContent = `Запись... ${elapsed} сек`;
            }, 100);
        }

        // Остановка записи через MediaRecorder
        function stopMediaRecorderRecording() {
            console.log('Stopping recording (MediaRecorder)...');
            
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }
            
            const recordingDuration = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 0;
            console.log('Recording duration:', recordingDuration, 'seconds');
            
            mediaRecorder.stop();
            recordBtn.classList.remove('recording');
            status.textContent = 'Обработка...';
            status.className = 'status processing';
            recordBtn.disabled = true;
            isRecording = false;
            recordingStartTime = null;
        }

        // Начало записи через Web Audio API (Safari/iOS)
        function startWebAudioRecording() {
            if (!audioContext || !audioWorkletNode) {
                showError('Аудио система не инициализирована. Обновите страницу.');
                return;
            }
            
            // Убеждаемся, что audioContext активен
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(err => {
                    console.error('Failed to resume audio context:', err);
                    showError('Не удалось активировать микрофон.');
                    return;
                });
            }
            
            audioBuffer = [];
            recordBtn.classList.add('recording');
            status.className = 'status recording';
            errorDiv.classList.remove('show');
            isRecording = true;
            console.log('Recording started (Web Audio API). Sample rate:', audioContext.sampleRate);
            
            recordingStartTime = Date.now();
            recordingTimer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
                status.textContent = `Запись... ${elapsed} сек`;
            }, 100);
        }

        // Остановка записи через Web Audio API (Safari)
        async function stopWebAudioRecording() {
            console.log('Stopping recording (Web Audio API)...');
            
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }
            
            const recordingDuration = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 0;
            console.log('Recording duration:', recordingDuration, 'seconds');
            
            isRecording = false;
            recordBtn.classList.remove('recording');
            status.textContent = 'Обработка...';
            status.className = 'status processing';
            recordBtn.disabled = true;
            recordingStartTime = null;
            
            // Обрабатываем запись
            await handleRecordingStop();
        }

        // Обработчики событий для кнопки
        recordBtn.addEventListener('click', toggleRecording);
        
        // Для мобильных устройств - предотвращаем двойной клик
        let touchStartTime = 0;
        recordBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartTime = Date.now();
        }, { passive: false });
        
        recordBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            // Предотвращаем двойной срабатывание (клик + touch)
            const touchDuration = Date.now() - touchStartTime;
            if (touchDuration < 300) {
                toggleRecording();
            }
        }, { passive: false });

        // Конвертация аудио в WAV
        async function convertToWav(audioBlob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        const arrayBuffer = e.target.result;
                        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                        
                        // Конвертируем в WAV
                        const wav = audioBufferToWav(audioBuffer);
                        const wavBlob = new Blob([wav], { type: 'audio/wav' });
                        resolve(wavBlob);
                    } catch (err) {
                        console.warn('Не удалось конвертировать аудио, отправляем оригинал:', err);
                        resolve(audioBlob);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(audioBlob);
            });
        }

        // Функция конвертации AudioBuffer в WAV
        function audioBufferToWav(buffer) {
            const length = buffer.length;
            const sampleRate = buffer.sampleRate;
            const numChannels = buffer.numberOfChannels;
            const bytesPerSample = 2;
            const blockAlign = numChannels * bytesPerSample;
            const byteRate = sampleRate * blockAlign;
            const dataSize = length * blockAlign;
            const bufferSize = 44 + dataSize;
            const arrayBuffer = new ArrayBuffer(bufferSize);
            const view = new DataView(arrayBuffer);
            
            // WAV заголовок
            const writeString = (offset, string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };
            
            writeString(0, 'RIFF');
            view.setUint32(4, bufferSize - 8, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, bytesPerSample * 8, true);
            writeString(36, 'data');
            view.setUint32(40, dataSize, true);
            
            // Данные
            let offset = 44;
            for (let i = 0; i < length; i++) {
                for (let channel = 0; channel < numChannels; channel++) {
                    const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                    offset += 2;
                }
            }
            
            return arrayBuffer;
        }

        // Обработка аудио
        async function processAudio(audioBlob) {
            try {
                console.log('=== processAudio started ===');
                console.log('Processing audio. Original size:', audioBlob.size, 'bytes, type:', audioBlob.type);
                console.log('API_URL:', API_URL);
                console.log('Current location:', window.location.href);
                console.log('Protocol:', window.location.protocol);
                console.log('Host:', window.location.host);
                
                // Проверяем доступность сервера перед отправкой (только для диагностики)
                const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
                if (isIOSDevice) {
                    console.log('iOS device detected');
                    console.log('Using HTTPS:', window.location.protocol === 'https:');
                    
                    // Пробуем проверить доступность API
                    try {
                        const healthCheck = await fetch(`${API_URL.replace('/api', '')}/api/health`, {
                            method: 'GET',
                            credentials: 'omit'
                        });
                        console.log('Health check response:', healthCheck.status, healthCheck.statusText);
                    } catch (healthErr) {
                        console.warn('Health check failed (this is OK, continuing anyway):', healthErr.message);
                    }
                }
                
                // Конвертируем в WAV если нужно
                let wavBlob = audioBlob;
                if (!audioBlob.type.includes('wav')) {
                    console.log('Converting to WAV...');
                    wavBlob = await convertToWav(audioBlob);
                    console.log('Converted WAV size:', wavBlob.size, 'bytes');
                }
                
                // Финальная проверка размера
                if (wavBlob.size < 1024) {
                    throw new Error('Запись слишком короткая. Пожалуйста, говорите дольше (минимум 1 секунда).');
                }
                
                const formData = new FormData();
                formData.append('audio', wavBlob, 'recording.wav');
                console.log('Sending audio to server. Size:', wavBlob.size, 'bytes');
                console.log('FormData created, sending to:', `${API_URL}/voice-assistant`);
                
                // Устанавливаем статус перед отправкой
                status.textContent = 'Отправка на сервер...';
                status.className = 'status processing';
                
                // Создаем AbortController для таймаута (fallback для старых браузеров)
                let abortController = null;
                let timeoutId = null;
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    // Устанавливаем таймаут 60 секунд
                    timeoutId = setTimeout(() => {
                        if (abortController) {
                            abortController.abort();
                        }
                    }, 60000);
                }
                
                const fetchOptions = {
                    method: 'POST',
                    body: formData,
                    // Не устанавливаем Content-Type, браузер сам установит с boundary для FormData
                    // Добавляем credentials для работы с HTTPS
                    credentials: 'omit',
                    // Добавляем signal для возможности отмены
                    signal: abortController ? abortController.signal : undefined
                };
                
                console.log('Fetch options:', {
                    method: fetchOptions.method,
                    hasBody: !!fetchOptions.body,
                    credentials: fetchOptions.credentials
                });
                
                let response;
                try {
                    console.log('Initiating fetch request...');
                    response = await fetch(`${API_URL}/voice-assistant`, fetchOptions);
                    console.log('Fetch request completed');
                    // Очищаем таймаут если запрос успешен
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                } catch (err) {
                    // Очищаем таймаут при ошибке
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                    console.error('Fetch error caught:', err);
                    console.error('Error name:', err.name);
                    console.error('Error message:', err.message);
                    console.error('Error stack:', err.stack);
                    
                    // Более детальная обработка ошибок для iOS
                    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                        throw new Error(`Не удалось подключиться к серверу. Проверьте:\n1. Сервер запущен на ${API_URL}\n2. Соединение по HTTPS работает\n3. Сертификат принят в браузере`);
                    } else if (err.name === 'AbortError' || err.name === 'TimeoutError') {
                        throw new Error('Превышено время ожидания ответа от сервера. Попробуйте еще раз.');
                    } else {
                        throw new Error(`Ошибка сети: ${err.message || err.name}. Проверьте подключение к серверу ${API_URL}`);
                    }
                }

                console.log('Response received. Status:', response.status, response.statusText);
                console.log('Response headers:', [...response.headers.entries()]);

                if (!response.ok) {
                    let errorMessage = 'Ошибка обработки запроса';
                    let errorDetails = null;
                    try {
                        const errorText = await response.text();
                        console.error('Error response text:', errorText);
                        try {
                            errorDetails = JSON.parse(errorText);
                            errorMessage = errorDetails.error || errorDetails.details || errorMessage;
                            console.error('Server error (parsed):', errorDetails);
                        } catch (e) {
                            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
                        }
                    } catch (e) {
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                        console.error('Failed to parse error response:', e);
                    }
                    throw new Error(errorMessage);
                }

                const result = await response.json();
                console.log('Response received successfully. Audio length:', result.audio ? result.audio.length : 0);

                // Конвертируем base64 обратно в blob и автоматически воспроизводим
                if (result.audio) {
                    const base64Audio = result.audio;
                    const binaryString = atob(base64Audio);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    currentAudioBlob = new Blob([bytes], { type: 'audio/wav' });
                    
                    // Автоматически воспроизводим ответ
                    playAudio(currentAudioBlob);
                } else {
                    status.textContent = 'Готов к работе';
                    status.className = 'status idle';
                    recordBtn.disabled = false;
                }
            } catch (err) {
                console.error('Error in processAudio:', err);
                console.error('Error stack:', err.stack);
                isRecording = false;
                let errorMessage = err.message || 'Неизвестная ошибка';
                
                // Более детальные сообщения об ошибках
                if (err.message && (err.message.includes('network') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
                    errorMessage = 'Ошибка подключения к серверу. Проверьте, что сервер запущен и доступен по адресу ' + API_URL;
                } else if (err.message && err.message.includes('CORS')) {
                    errorMessage = 'Ошибка CORS. Сервер не разрешает запросы с этого домена.';
                } else if (err.message && err.message.includes('timeout')) {
                    errorMessage = 'Превышено время ожидания ответа от сервера.';
                }
                
                showError(errorMessage);
                status.textContent = 'Ошибка';
                status.className = 'status error';
                recordBtn.disabled = false;
                recordBtn.classList.remove('recording');
            }
        }

        // Воспроизведение аудио
        function playAudio(audioBlob) {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            status.textContent = 'Воспроизведение ответа...';
            status.className = 'status playing';
            
            audio.play().catch(err => {
                console.error('Error playing audio:', err);
                showError('Ошибка воспроизведения аудио');
                status.textContent = 'Готов к работе';
                status.className = 'status idle';
                recordBtn.disabled = false;
            });
            
            audio.onended = () => {
                status.textContent = 'Готов к работе';
                status.className = 'status idle';
                recordBtn.disabled = false;
                URL.revokeObjectURL(audioUrl);
            };
            
            audio.onerror = () => {
                showError('Ошибка воспроизведения аудио');
                status.textContent = 'Готов к работе';
                status.className = 'status idle';
                recordBtn.disabled = false;
                URL.revokeObjectURL(audioUrl);
            };
        }

        // Отправка текстового сообщения
        async function sendTextMessage() {
            const textInput = document.getElementById('textInput');
            const textSendBtn = document.getElementById('textSendBtn');
            const textResponse = document.getElementById('textResponse');
            const textResponseText = document.getElementById('textResponseText');
            
            const message = textInput.value.trim();
            
            if (!message) {
                showError('Введите ваш вопрос');
                return;
            }
            
            // Блокируем кнопку и поле ввода
            textSendBtn.disabled = true;
            textInput.disabled = true;
            status.textContent = 'Обработка запроса...';
            status.className = 'status processing';
            
            // Скрываем предыдущий ответ
            textResponse.style.display = 'none';
            
            try {
                const response = await fetch(`${API_URL}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: message })
                });
                
                if (!response.ok) {
                    let errorMessage = 'Ошибка обработки запроса';
                    try {
                        const error = await response.json();
                        errorMessage = error.error || errorMessage;
                    } catch (e) {
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                const reply = data.reply || 'Не удалось получить ответ';
                
                // Конвертируем markdown заголовки в HTML
                const htmlReply = convertMarkdownToHtml(reply);
                
                // Показываем ответ
                textResponseText.innerHTML = htmlReply;
                textResponse.style.display = 'block';
                
                // Очищаем поле ввода
                textInput.value = '';
                
                status.textContent = 'Готов к работе';
                status.className = 'status idle';
                
            } catch (error) {
                console.error('Error sending text message:', error);
                showError(error.message || 'Ошибка отправки сообщения');
                status.textContent = 'Ошибка';
                status.className = 'status error';
            } finally {
                // Разблокируем кнопку и поле ввода
                textSendBtn.disabled = false;
                textInput.disabled = false;
                textInput.focus();
            }
        }
        
        // Конвертация markdown заголовков в HTML
        function convertMarkdownToHtml(text) {
            if (!text) return '';
            
            // Экранируем HTML для безопасности
            let html = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            // Конвертируем markdown заголовки (сначала h3, потом h2, потом h1, чтобы избежать конфликтов)
            // ### Заголовок 3
            html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            // ## Заголовок 2
            html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            // # Заголовок 1
            html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
            
            // Конвертируем переносы строк в <br>
            html = html.replace(/\n/g, '<br>');
            
            return html;
        }
        
        // Показ ошибки
        function showError(message) {
            errorDiv.textContent = 'Ошибка: ' + message;
            errorDiv.classList.add('show');
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 5000);
        }

        // Версия приложения для предотвращения кэширования
        const APP_VERSION = Date.now().toString(); // Используем timestamp для уникальности
        const LAST_UPDATE_KEY = 'app_last_update';
        const CACHE_BUSTER = '?v=' + APP_VERSION;
        
        // Проверка обновлений при загрузке
        function checkForUpdates() {
            const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
            const currentTime = Date.now();
            
            // Сохраняем время последнего обновления
            localStorage.setItem(LAST_UPDATE_KEY, currentTime.toString());
        }
        
        // Принудительное обновление для iPad/iOS
        function forceRefresh() {
            if (navigator.userAgent.match(/iPad|iPhone|iPod/i)) {
                // Очищаем кэш и перезагружаем
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        for(let registration of registrations) {
                            registration.unregister();
                        }
                    });
                }
                // Принудительная перезагрузка с очисткой кэша
                window.location.href = window.location.href.split('?')[0] + CACHE_BUSTER;
            }
        }
        
        // Обработчик для обновления при возврате на вкладку (iOS/iPad)
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                // При возврате на вкладку проверяем обновления
                const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
                const currentTime = Date.now();
                if (lastUpdate && (currentTime - parseInt(lastUpdate)) > 1 * 60 * 1000) {
                    // Если прошло больше 1 минуты, обновляем страницу
                    forceRefresh();
                }
            }
        });
        
        // Обработчик для обновления при фокусе (iOS/iPad)
        window.addEventListener('pageshow', function(event) {
            // Если страница загружена из кэша (back/forward), обновляем
            if (event.persisted) {
                forceRefresh();
            }
        });
        
        // Обработчик для обновления при фокусе окна
        window.addEventListener('focus', function() {
            const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
            const currentTime = Date.now();
            if (lastUpdate && (currentTime - parseInt(lastUpdate)) > 1 * 60 * 1000) {
                forceRefresh();
            }
        });
        
        // Инициализация при загрузке
        loadTheme();
        
        // Инициализация экранов при загрузке страницы
        document.addEventListener('DOMContentLoaded', function() {
            // Скрываем все экраны кроме welcomeScreen
            document.querySelectorAll('.screen').forEach(screen => {
                if (screen.id !== 'welcomeScreen') {
                    screen.classList.remove('active');
                }
            });
            // Убеждаемся, что welcomeScreen активен
            welcomeScreen.classList.add('active');
            // Скрываем главное меню
            mainMenu.style.display = 'none';
            // Скрываем экран обратной связи
            feedbackScreen.classList.remove('active');
            
            // Обработчик Enter для отправки текстового сообщения
            const textInput = document.getElementById('textInput');
            if (textInput) {
                textInput.addEventListener('keydown', function(e) {
                    // Shift+Enter для новой строки, Enter для отправки
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendTextMessage();
                    }
                });
            }
            
            // Проверяем обновления после загрузки
            setTimeout(checkForUpdates, 1000);
        });
        
        // Микрофон будет инициализирован при открытии экрана голосового помощника