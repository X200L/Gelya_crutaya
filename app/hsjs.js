   // Активация вкладки "История"
   document.querySelector('.nav-item:nth-child(4)').classList.add('active');

   // При клике на расходы
   document.querySelector('.expenses-card').addEventListener('click', () => {
     alert('Подробная статистика по расходам');
   });

   // Фильтры
   document.querySelectorAll('.filter-btn').forEach(btn => {
     btn.addEventListener('click', () => {
       document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
     });
   });

   // При клике на транзакцию
   document.querySelectorAll('.transaction-item').forEach(item => {
     item.addEventListener('click', () => {
       alert('Детали транзакции');
     });
   });

   // Поиск
   document.querySelector('.search-btn').addEventListener('click', () => {
     alert('Поиск по истории');
   });

   // Скачать
   document.querySelector('.download-btn').addEventListener('click', () => {
     alert('Экспорт истории в PDF/Excel');
   });

   // Прокрутка фильтров
   const filters = document.querySelector('.filters');
   let startX;

   filters.addEventListener('touchstart', e => {
     startX = e.touches[0].clientX;
   });

   filters.addEventListener('touchmove', e => {
     const moveX = e.touches[0].clientX;
     const diff = startX - moveX;
     filters.scrollLeft += diff;
     startX = moveX;
   });

   // Голосовой ассистент (Web Speech API)
   (function(){
     const btn = document.getElementById('voiceBtn');
     const modal = document.getElementById('voiceModal');
     const modalIcon = document.getElementById('voiceModalIcon');
     const modalTitle = document.getElementById('voiceModalTitle');
     const modalSubtitle = document.getElementById('voiceModalSubtitle');
     const modalText = document.getElementById('voiceModalText');
     const cancelBtn = document.getElementById('voiceCancel');
     const stopBtn = document.getElementById('voiceStop');
     
     if (!btn) return;
     const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
     let recognition;
     let listening = false;

     function openVoiceModal() {
       modal.style.display = 'flex';
       setTimeout(() => modal.classList.add('show'), 10);
     }

     function closeVoiceModal() {
       modal.classList.remove('show');
       setTimeout(() => modal.style.display = 'none', 300);
     }

     function updateModalState(isListening, text = '') {
       if (isListening) {
         modalIcon.classList.add('listening');
         modalTitle.textContent = 'Слушаю...';
         modalSubtitle.textContent = 'Говорите команду';
         modalText.textContent = text || 'Говорите...';
         cancelBtn.style.display = 'none';
         stopBtn.style.display = 'block';
       } else {
         modalIcon.classList.remove('listening');
         modalTitle.textContent = 'Альфа-ассистент';
         modalSubtitle.textContent = 'Скажите команду для навигации';
         modalText.textContent = text || 'Говорите...';
         cancelBtn.style.display = 'block';
         stopBtn.style.display = 'none';
       }
     }

     function navigateByCommand(cmd) {
       const t = (cmd || '').toLowerCase();
       if (t.includes('глав')) {
         modalText.textContent = 'Переход на главную...';
         setTimeout(() => location.href = 'index.html', 1000);
       } else if (t.includes('платеж')) {
         modalText.textContent = 'Переход к платежам...';
         setTimeout(() => location.href = 'platezi.html', 1000);
       } else if (t.includes('выгод')) {
         modalText.textContent = 'Переход к выгоде...';
         setTimeout(() => location.href = 'vigoda.html', 1000);
       } else if (t.includes('истор')) {
         modalText.textContent = 'Переход к истории...';
         setTimeout(() => location.href = 'history.html', 1000);
       } else if (t.includes('чат')) {
         modalText.textContent = 'Переход к чатам...';
         setTimeout(() => location.href = 'chats.html', 1000);
       } else {
         modalText.textContent = 'Команда не распознана: ' + cmd;
         setTimeout(() => closeVoiceModal(), 2000);
       }
     }

     if (SR) {
       recognition = new SR();
       recognition.lang = 'ru-RU';
       recognition.interimResults = true;
       recognition.maxAlternatives = 1;
       
       recognition.onstart = () => {
         listening = true;
         btn.classList.add('listening');
         updateModalState(true);
       };

       recognition.onresult = (e) => {
         let finalTranscript = '';
         let interimTranscript = '';

         for (let i = e.resultIndex; i < e.results.length; i++) {
           const transcript = e.results[i][0].transcript;
           if (e.results[i].isFinal) {
             finalTranscript += transcript;
           } else {
             interimTranscript += transcript;
           }
         }

         if (interimTranscript) {
           modalText.textContent = interimTranscript;
         }

         if (finalTranscript) {
           modalText.textContent = 'Распознано: ' + finalTranscript;
           navigateByCommand(finalTranscript);
         }
       };

       recognition.onerror = (e) => {
         console.error('Speech recognition error:', e.error);
         modalText.textContent = 'Ошибка распознавания: ' + e.error;
         setTimeout(() => closeVoiceModal(), 2000);
       };

       recognition.onend = () => {
         listening = false;
         btn.classList.remove('listening');
         updateModalState(false);
         setTimeout(() => closeVoiceModal(), 1000);
       };
     } else {
       btn.addEventListener('click', () => {
         alert('Распознавание речи не поддерживается в этом браузере');
       });
       return;
     }

     btn.addEventListener('click', () => {
       if (listening) {
         try { recognition.stop(); } catch(e) {}
       } else {
         openVoiceModal();
         updateModalState(false);
       }
     });

     cancelBtn.addEventListener('click', () => {
       closeVoiceModal();
     });

     stopBtn.addEventListener('click', () => {
       try { recognition.stop(); } catch(e) {}
     });

     modal.addEventListener('click', (e) => {
       if (e.target === modal) {
         closeVoiceModal();
       }
     });
   })();