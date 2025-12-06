    // Активация вкладки "Выгода"
    document.querySelector('.nav-item:nth-child(3)').classList.add('active');

    // Табы
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    // При клике на предложение
    document.querySelectorAll('.offer-card').forEach(card => {
      card.addEventListener('click', () => {
        alert('Переход к деталям предложения');
      });
    });

    // При клике на кэшбэк-действие
    document.querySelector('.cashback-action').addEventListener('click', () => {
      alert('Переход к программе кэшбэка');
    });

    document.querySelector('.cashback-note').addEventListener('click', () => {
      alert('Открытие раздела "Моя выгода"');
    });

    // Действия внизу
    document.querySelector('.action-btn.select').addEventListener('click', () => {
      alert('Выбрать предложение');
    });

    document.querySelector('.action-btn.receive').addEventListener('click', () => {
      alert('Получить выгоду');
    });

    // Поиск
    document.querySelector('.search-btn').addEventListener('click', () => {
      alert('Поиск по выгодам и предложениям');
    });

    // Прокрутка предложений
    const offersContainer = document.querySelector('.offers-container');
    let startX;

    offersContainer.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    });

    offersContainer.addEventListener('touchmove', e => {
      const moveX = e.touches[0].clientX;
      const diff = startX - moveX;
      offersContainer.scrollLeft += diff;
      startX = moveX;
    });

    // Голосовой ассистент (Web Speech API)
    (function(){
      const btn = document.getElementById('voiceBtn');
      if (!btn) return;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition;
      let listening = false;

      function navigateByCommand(cmd) {
        const t = (cmd || '').toLowerCase();
        if (t.includes('глав')) location.href = 'index.html';
        else if (t.includes('платеж')) location.href = 'platezi.html';
        else if (t.includes('выгод')) location.href = 'vigoda.html';
        else if (t.includes('истор')) location.href = 'history.html';
        else if (t.includes('чат')) location.href = 'chats.html';
        else alert('Команда не распознана: ' + cmd);
      }

      if (SR) {
        recognition = new SR();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (e) => {
          const text = e.results[0][0].transcript;
          navigateByCommand(text);
        };
        recognition.onend = () => {
          listening = false;
          btn.classList.remove('listening');
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
          listening = false;
          btn.classList.remove('listening');
        } else {
          try { recognition.start(); } catch(e) {}
          listening = true;
          btn.classList.add('listening');
        }
      });
    })();