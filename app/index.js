    // Активация вкладки "Главная"
    document.querySelector('.nav-item:nth-child(1)').classList.add('active');


    // При клике на поиск
    document.querySelector('.search-input').addEventListener('focus', () => {
      document.querySelector('.search-input').placeholder = '';
    });

    document.querySelector('.search-input').addEventListener('blur', () => {
      if (!document.querySelector('.search-input').value) {
        document.querySelector('.search-input').placeholder = 'Поиск по приложению';
      }
    });

    // Прокрутка карточек
    const containers = document.querySelectorAll('.cards-container');
    containers.forEach(container => {
      let startX;

      container.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
      });

      container.addEventListener('touchmove', e => {
        const moveX = e.touches[0].clientX;
        const diff = startX - moveX;
        container.scrollLeft += diff;
        startX = moveX;
      });
    });

    // Анимация появления при прокрутке
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section-title, .card, .icon-item, .icon-grid').forEach(el => {
      el.classList.add('fade-in');
      observer.observe(el);
    });

    // Плавная прокрутка при свайпе
    document.body.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
    });

    document.body.addEventListener('touchmove', e => {
      const moveY = e.touches[0].clientY;
      const diff = startY - moveY;
      window.scrollBy(0, diff);
      startY = moveY;
    });

    let startY;

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
          modalTitle.textContent = 'Голосовой ассистент';
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

    // Модалка визита: логика шагов
    (function(){
      const openBtn = document.getElementById('openVisit');
      const overlay = document.getElementById('visitModal');
      const closeBtn = document.getElementById('visitClose');
      const prevBtn = document.getElementById('prevStep');
      const nextBtn = document.getElementById('nextStep');
      const steps = Array.from(document.querySelectorAll('.modal .step'));
      let stepIndex = 0;

      const state = { statuses: [], ovzDetails: '', topic: '', otherDetails: '', date: '', office: '' };

      function showStep(i){
        steps.forEach((s,idx)=> s.classList.toggle('active', idx===i));
        prevBtn.style.visibility = i===0 ? 'hidden' : 'visible';
        nextBtn.textContent = i === steps.length-1 ? 'Подтвердить' : 'Далее';
      }

      function validateStep(i){
        if (i===0){
          const err = document.getElementById('step1Error');
          if (state.statuses.length===0){ err.style.display='block'; err.textContent='Выберите хотя бы один вариант'; return false; }
          if (state.statuses.includes('ovz') && !state.ovzDetails.trim()){ err.style.display='block'; err.textContent='Пожалуйста, уточните особенности ОВЗ'; return false; }
          err.style.display='none'; return true;
        }
        if (i===1){
          const err = document.getElementById('step2Error');
          if (!state.topic){ err.style.display='block'; err.textContent='Выберите тему визита'; return false; }
          if (state.topic==='other' && !state.otherDetails.trim()){ err.style.display='block'; err.textContent='Опишите, какие операции'; return false; }
          err.style.display='none'; return true;
        }
        if (i===2){
          const err = document.getElementById('step3Error');
          if (!state.date){ err.style.display='block'; err.textContent='Укажите дату визита'; return false; }
          if (!state.office){ err.style.display='block'; err.textContent='Выберите офис'; return false; }
          err.style.display='none'; return true;
        }
        return true;
      }

      function fillSummary(){
        const el = document.getElementById('confirmSummary');
        const statusesLabel = state.statuses.join(', ') || '—';
        const topicMap = {
          accounts: 'Счета и карты', credit: 'Кредитные продукты', deposits: 'Вклады',
          'invest-insure': 'Инвестиционные и страховые продукты', other: 'Другие операции', event: 'Регистрация на мероприятие'
        };
        const topicLabel = topicMap[state.topic] || '—';
        el.innerHTML =
          'Статус: ' + statusesLabel + '<br/>' +
          (state.statuses.includes('ovz') && state.ovzDetails ? ('ОВЗ: ' + state.ovzDetails + '<br/>') : '') +
          'Тема: ' + topicLabel + (state.topic==='other' && state.otherDetails ? (' — ' + state.otherDetails) : '') + '<br/>' +
          'Дата: ' + state.date + '<br/>' +
          'Офис: ' + state.office;
      }

      function openModal(){
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('show'), 10);
        stepIndex = 0;
        showStep(stepIndex);
      }

      function closeModal(){
        overlay.classList.remove('show');
        setTimeout(() => overlay.style.display = 'none', 300);
      }

      // chips: статус
      const statusChips = document.getElementById('statusChips');
      const ovzField = document.getElementById('ovzDetailsField');
      statusChips.addEventListener('click', (e)=>{
        const chip = e.target.closest('.chip'); if (!chip) return;
        const val = chip.getAttribute('data-value');
        chip.classList.toggle('active');
        if (chip.classList.contains('active')) state.statuses.push(val); else state.statuses = state.statuses.filter(v=>v!==val);
        ovzField.style.display = state.statuses.includes('ovz') ? 'block' : 'none';
      });
      document.getElementById('ovzDetails').addEventListener('input', (e)=> state.ovzDetails = e.target.value);

      // chips: тема
      const topicChips = document.getElementById('topicChips');
      const otherField = document.getElementById('otherDetailsField');
      topicChips.addEventListener('click', (e)=>{
        const chip = e.target.closest('.chip'); if (!chip) return;
        topicChips.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        state.topic = chip.getAttribute('data-value');
        otherField.style.display = state.topic==='other' ? 'block' : 'none';
      });
      document.getElementById('otherDetails').addEventListener('input', (e)=> state.otherDetails = e.target.value);

      // дата и офис
      document.getElementById('visitDate').addEventListener('change', (e)=> state.date = e.target.value);
      document.getElementById('officeSelect').addEventListener('change', (e)=> state.office = e.target.value);

      // управление шагами
      openBtn.addEventListener('click', openModal);
      closeBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closeModal(); });
      prevBtn.addEventListener('click', ()=>{ if (stepIndex>0){ stepIndex--; showStep(stepIndex); } });
      nextBtn.addEventListener('click', ()=>{
        if (!validateStep(stepIndex)) return;
        if (stepIndex < steps.length-1){
          stepIndex++;
          if (stepIndex === steps.length-1) fillSummary();
          showStep(stepIndex);
        } else {
          closeModal();
          alert('Визит запланирован!');
        }
      });
    })();