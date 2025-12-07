let chart = null;
let pollTimer = null;
const POLL_INTERVAL_MS = 2000;
const MAX_POINTS = 500;
let useMovingAverage = false;
let movingAverageWindow = 5;

document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    loadSettings();
    startRealtime();
    document.getElementById('exportBtn').addEventListener('click', exportStatistics);
    checkCameraStatus();
});

/* ================= Камера ================= */

function checkCameraStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const videoStream = document.getElementById('videoStream');

    videoStream.onload = function() {
        statusDot.classList.add('active');
        statusText.textContent = 'Подключено';
    };

    videoStream.onerror = function() {
        statusDot.classList.remove('active');
        statusText.textContent = 'Ошибка подключения';
    };
}

/* =============== Настройки =============== */

function loadSettings() {
    fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
            if (data.moving_average) useMovingAverage = true;
            if (data.moving_average_window) movingAverageWindow = +data.moving_average_window;
        })
        .catch(err => console.warn('Settings load fail', err));
}

/* =============== Chart ================== */

function initializeChart() {
    const ctx = document.getElementById('statisticsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Количество людей',
                    data: [],
                    borderColor: '#EF3124',
                    backgroundColor: 'rgba(239,49,36,0.1)',
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: `MA (${movingAverageWindow})`,
                    data: [],
                    borderColor: '#2b8cff',
                    tension: 0.4,
                    hidden: !useMovingAverage
                }
            ]
        },
        options: { animation:false, responsive:true }
    });
}

/* ============== WebSocket + Poll ================ */

function startRealtime() {
    const ws = new WebSocket((location.protocol=="https:"?"wss":"ws")+"://"+location.host+"/ws");

    ws.onmessage = (ev)=>{
        let d = JSON.parse(ev.data);
        if(d.type=="point"){ pushPoint(d.timestamp,d.people_count); setCurrentCount(d.people_count,d.timestamp) }
        if(d.type=="history"){ loadFullHistory(d.statistics) }
    };

    ws.onerror = ws.onclose = ()=>{
        console.log("WS → fallback polling");
        pollTimer=setInterval(pollOnce,POLL_INTERVAL_MS);
    };

    setTimeout(()=>{ if(ws.readyState!==1) pollTimer=setInterval(pollOnce,POLL_INTERVAL_MS) },2500);
}

function pollOnce(){
    fetch('/api/statistics').then(r=>r.json()).then(d=>{
        pushPoint(d.timestamp,d.current_count); setCurrentCount(d.current_count,d.timestamp)
    });
    fetch('/api/history').then(r=>r.json()).then(d=>{ loadFullHistory(d.statistics) });
}

/* ============= Chart Update ================= */

function pushPoint(timestamp,count){
    let label=new Date(timestamp).toLocaleTimeString('ru-RU');

    let last=chart.data.labels.length-1;
    if(last>=0 && chart.data.labels[last]==label) chart.data.datasets[0].data[last]=count;
    else { chart.data.labels.push(label); chart.data.datasets[0].data.push(count); }

    while(chart.data.labels.length>MAX_POINTS){
        chart.data.labels.shift();
        chart.data.datasets.forEach(ds=>ds.data.shift());
    }

    if(useMovingAverage){
        chart.data.datasets[1].data = calculateMA(chart.data.datasets[0].data,movingAverageWindow);
        chart.data.datasets[1].hidden=false;
    }
    chart.update('none');
}

function loadFullHistory(arr){
    if(!arr||!arr.length) return;
    arr.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));

    chart.data.labels = arr.map(s=>new Date(s.timestamp).toLocaleTimeString('ru-RU')).slice(-MAX_POINTS);
    chart.data.datasets[0].data = arr.map(s=>s.people_count).slice(-MAX_POINTS);
    if(useMovingAverage){
        chart.data.datasets[1].data=calculateMA(chart.data.datasets[0].data,movingAverageWindow);
        chart.data.datasets[1].hidden=false;
    }
    chart.update();
    updateTable(arr);
}

function updateTable(arr){
    let tbody=document.getElementById('statsTableBody');
    tbody.innerHTML="";
    arr.slice(-20).reverse().forEach(s=>{
        tbody.innerHTML+=`<tr><td>${new Date(s.timestamp).toLocaleString("ru")}</td><td>${s.people_count}</td></tr>`;
    });
}

function setCurrentCount(c,t){ 
    currentCount.textContent=c; 
    lastUpdate.textContent=new Date(t).toLocaleTimeString('ru');
}

/* ============= Moving Average ============= */

function calculateMA(a,w){
    let r=[],sum=0;
    for(let i=0;i<a.length;i++){
        sum+=a[i]; if(i>=w) sum-=a[i-w];
        r.push(i<w-1?null:sum/w);
    }
    return r;
}

/* ============= EXPORT ==================== */

function exportStatistics(){
    fetch('/api/export').then(r=>r.json()).then(d=>{ saveJSON(d); saveCSV() }).catch(()=>saveCSV());
}

function saveJSON(data){
    let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    let a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="statistics.json";
    a.click();
}

function saveCSV(){
    let rows=[["time","people"]];
    chart.data.labels.forEach((l,i)=>rows.push([l,chart.data.datasets[0].data[i]]));
    let blob=new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    let a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="statistics.csv";
    a.click();
}
