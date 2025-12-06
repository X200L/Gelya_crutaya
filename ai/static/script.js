// Глобальные переменные
let chart = null;
let updateInterval = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeChart();
    loadSettings();
    startUpdates();
    
    // Обработчики событий
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('exportBtn').addEventListener('click', exportStatistics);
    
    // Проверка статуса камеры
    checkCameraStatus();
});

// Проверка статуса камеры
function checkCameraStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const videoStream = document.getElementById('videoStream');
    
    videoStream.onload = function() {
        statusDot.classList.add('active');
        statusDot.classList.remove('error');
        statusText.textContent = 'Подключено';
    };
    
    videoStream.onerror = function() {
        statusDot.classList.remove('active');
        statusDot.classList.add('error');
        statusText.textContent = 'Ошибка подключения';
    };
}

// Загрузка настроек
function loadSettings() {
    fetch('/api/settings')
        .then(response => response.json())
        .then(data => {
            document.getElementById('intervalSelect').value = data.interval;
        })
        .catch(error => {
            console.error('Error loading settings:', error);
        });
}

// Сохранение настроек
function saveSettings() {
    const interval = parseInt(document.getElementById('intervalSelect').value);
    
    fetch('/api/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ interval: interval })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Настройки сохранены! Статистика будет собираться ${data.interval_name === 'minute' ? 'каждую минуту' : 'каждый час'}`);
        }
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        alert('Ошибка при сохранении настроек');
    });
}

// Обновление статистики
function startUpdates() {
    updateStatistics();
    updateInterval = setInterval(updateStatistics, 2000); // Обновляем каждые 2 секунды
}

function updateStatistics() {
    // Обновление текущего количества
    fetch('/api/statistics')
        .then(response => response.json())
        .then(data => {
            document.getElementById('currentCount').textContent = data.current_count;
            const date = new Date(data.timestamp);
            document.getElementById('lastUpdate').textContent = date.toLocaleTimeString('ru-RU');
        })
        .catch(error => {
            console.error('Error fetching statistics:', error);
        });
    
    // Обновление истории
    fetch('/api/history')
        .then(response => response.json())
        .then(data => {
            updateChart(data.statistics);
            updateTable(data.statistics);
        })
        .catch(error => {
            console.error('Error fetching history:', error);
        });
}

// Инициализация графика
function initializeChart() {
    const ctx = document.getElementById('statisticsChart').getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Количество людей',
                data: [],
                borderColor: '#EF3124',
                backgroundColor: 'rgba(239, 49, 36, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(239, 49, 36, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(239, 49, 36, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#333'
                    }
                }
            }
        }
    });
}

// Обновление графика
function updateChart(statistics) {
    if (!chart || !statistics || statistics.length === 0) return;
    
    const labels = statistics.map(stat => {
        const date = new Date(stat.timestamp);
        return date.toLocaleTimeString('ru-RU');
    });
    
    const data = statistics.map(stat => stat.people_count);
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

// Обновление таблицы
function updateTable(statistics) {
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';
    
    // Показываем последние 20 записей
    const recentStats = statistics.slice(-20).reverse();
    
    recentStats.forEach(stat => {
        const row = document.createElement('tr');
        const date = new Date(stat.timestamp);
        
        row.innerHTML = `
            <td>${date.toLocaleString('ru-RU')}</td>
            <td>${stat.people_count}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Экспорт статистики
function exportStatistics() {
    fetch('/api/export')
        .then(response => response.json())
        .then(data => {
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `statistics_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error exporting statistics:', error);
            alert('Ошибка при экспорте статистики');
        });
}

