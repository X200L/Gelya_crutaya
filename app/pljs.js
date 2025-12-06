   // Активация вкладки "Главная"

    // Прокрутка карточек
    const opportunitiesContainer = document.querySelector('.opportunities-container');
    let startX;
    opportunitiesContainer.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    });
    opportunitiesContainer.addEventListener('touchmove', e => {
      const moveX = e.touches[0].clientX;
      const diff = startX - moveX;
      opportunitiesContainer.scrollLeft += diff;
      startX = moveX;
    });

    // === Комьюнити модалка ===
    const communityBtn = document.getElementById('joinCommunityBtn');
    const modal = document.getElementById('communityModal');
    const closeBtn = document.getElementById('communityClose');
    const cancelBtn = document.getElementById('communityCancel');
    const submitBtn = document.getElementById('communitySubmit');
    const contactInput = document.getElementById('communityContact');
    const agreeCheckbox = document.getElementById('communityAgree');

    communityBtn.addEventListener('click', () => {
      modal.classList.add('show');
    });

    function closeModal() {
      modal.classList.remove('show');
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    submitBtn.addEventListener('click', () => {
      if (!contactInput.value.trim()) {
        alert('Пожалуйста, укажите телефон или email');
        return;
      }
      if (!agreeCheckbox.checked) {
        alert('Необходимо согласие на обработку данных');
        return;
      }
      alert('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
      closeModal();
    });