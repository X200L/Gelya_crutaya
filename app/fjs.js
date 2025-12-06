let currentLesson = null;
let currentQuestionIndex = 0;
let userAnswers = [];

// Загрузка курса
fetch('financial-literacy-course.json')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('lessons-container');
    data.lessons.forEach(lesson => {
      const card = document.createElement('div');
      card.className = 'lesson-card';
      card.innerHTML = `
        <div class="lesson-title">${lesson.title}</div>
        <div class="lesson-desc">Теория + тест</div>
      `;
      card.onclick = () => openTheory(lesson);
      container.appendChild(card);
    });
  });

// === Теория ===
function openTheory(lesson) {
  currentLesson = lesson;
  document.getElementById('theoryTitle').textContent = lesson.title;
  document.getElementById('theoryText').textContent = lesson.theory;
  document.getElementById('theoryModal').classList.add('show');
}

document.getElementById('theoryClose').onclick = () => {
  document.getElementById('theoryModal').classList.remove('show');
};
document.getElementById('startTestBtn').onclick = () => {
  document.getElementById('theoryModal').classList.remove('show');
  currentQuestionIndex = 0;
  userAnswers = [];
  showQuestion();
};

// === Вопрос ===
function showQuestion() {
  const q = currentLesson.questions[currentQuestionIndex];
  document.getElementById('questionTitle').textContent = currentLesson.title;
  document.getElementById('questionText').textContent = `${currentQuestionIndex + 1}. ${q.question}`;
  
  const optionsEl = document.getElementById('questionOptions');
  optionsEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const optEl = document.createElement('div');
    optEl.className = 'option';
    optEl.textContent = opt;
    optEl.onclick = () => selectAnswer(i, q.correct);
    optionsEl.appendChild(optEl);
  });

  document.getElementById('questionModal').classList.add('show');
}

function selectAnswer(selected, correct) {
  const options = document.querySelectorAll('#questionOptions .option');
  options.forEach(o => o.style.pointerEvents = 'none');

  if (selected === correct) {
    options[selected].classList.add('correct');
    userAnswers.push(true);
  } else {
    options[selected].classList.add('wrong');
    options[correct].classList.add('correct');
    userAnswers.push(false);
  }

  setTimeout(() => {
    document.getElementById('questionModal').classList.remove('show');
    currentQuestionIndex++;
    if (currentQuestionIndex < currentLesson.questions.length) {
      setTimeout(showQuestion, 300);
    } else {
      showResult();
    }
  }, 1200);
}

document.getElementById('questionClose').onclick = () => {
  document.getElementById('questionModal').classList.remove('show');
};

// === Результат ===
function showResult() {
  const correct = userAnswers.filter(Boolean).length;
  const total = userAnswers.length;
  const allCorrect = correct === total;

  const icon = document.getElementById('resultIcon');
  const title = document.getElementById('resultTitle');
  const text = document.getElementById('resultText');

  if (allCorrect) {
    icon.textContent = '🎉';
    title.textContent = 'Поздравляем!';
    text.textContent = `Вы ответили правильно на все ${total} вопросов!`;
  } else {
    icon.textContent = '💡';
    title.textContent = 'Хорошая попытка!';
    text.textContent = `Правильных ответов: ${correct} из ${total}.`;
  }

  document.getElementById('resultModal').classList.add('show');
}

document.getElementById('resultClose').onclick = () => {
  document.getElementById('resultModal').classList.remove('show');
};

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