    // Активация вкладки "Платежи"
    document.querySelector('.nav-item:nth-child(2)').classList.add('active');

    // Быстрые платежи
    document.querySelectorAll('.quick-payment-item').forEach(item => {
      item.addEventListener('click', () => {
        alert('Переход к оплате: ' + item.querySelector('.quick-payment-label').innerText);
      });
    });

    // Список платежей
    document.querySelectorAll('.payment-item').forEach(item => {
      item.addEventListener('click', () => {
        const label = item.querySelector('.payment-label').innerText;
        alert('Открытие: ' + label);
      });
    });

    // Баннер
    document.querySelector('.payments-banner').addEventListener('click', () => {
      alert('Все платежи без комиссии — подробнее');
    });

    // Поиск
    document.querySelector('.search-btn').addEventListener('click', () => {
      alert('Поиск по платежам');
    });

    // Прокрутка быстрых платежей
    const quickPayments = document.querySelector('.quick-payments');
    let startX;
    quickPayments.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    });
    quickPayments.addEventListener('touchmove', e => {
      const moveX = e.touches[0].clientX;
      const diff = startX - moveX;
      quickPayments.scrollLeft += diff;
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