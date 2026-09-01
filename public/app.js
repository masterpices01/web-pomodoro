// --- DOM Elements ---
const taskSearchInput = document.getElementById('taskSearchInput');
const timerDisplay = document.getElementById('timer');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');

const themeToggleBtn = document.getElementById('themeToggleBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.getElementById('closeModal');
const taskList = document.getElementById('taskList');
const taskSelect = document.getElementById('taskSelect');
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const completedList = document.getElementById('completedList');

const volumeSlider = document.getElementById('volumeSlider');
const volumeValueDisplay = document.getElementById('volumeValue');
const audio = document.getElementById('music');

const alertAudio = document.getElementById('alertSound');
const alertVolumeSlider = document.getElementById('alertVolumeSlider');
const alertVolumeValueDisplay = document.getElementById('alertVolumeValue');

// Alert Modal Elements
const alertModal = document.getElementById('alertModal');
const alertTaskMessage = document.getElementById('alertTaskMessage');
const alertConfirmBtn = document.getElementById('alertConfirmBtn');

let alertVolume = parseFloat(localStorage.getItem('pomodoroAlertVolume')) || 0.7;

// --- State Variables ---
let searchQuery = "";
let timerInterval;
let musicDuration = 0; 
let remainingTime = 0;
let isRunning = false;
let audioCtx;
let gainNode;
let source;

// --- Task & Volume Data ---
let tasksData = JSON.parse(localStorage.getItem('pomodoroTasks'));
let currentTask = localStorage.getItem('pomodoroCurrentTask') || "Default Task";
let volume = parseFloat(localStorage.getItem('pomodoroVolume')) || 0.7;

// 資料結構檢測
if (!tasksData) {
  tasksData = { "Default Task": { count: 0, lastUpdated: Date.now() } };
} else {
  for (const key in tasksData) {
    if (typeof tasksData[key] === 'number') {
      tasksData[key] = { count: tasksData[key], lastUpdated: Date.now() };
    }
  }
}

// --- Initialize ---
init();

function init() {
  initTheme();
  initVolume();
  initAlertVolume();
  renderTasks();
  audio.src = 'assets/11 (Remastered 2004).mp3'; // 可自行換成你的音樂檔
}

// ================== Theme Logic (明暗切換) ==================

function initTheme() {
  let currentTheme = localStorage.getItem('pomodoroTheme') || 'dark'; // 預設暗色
  document.body.setAttribute('data-theme', currentTheme);
  themeToggleBtn.textContent = currentTheme === 'light' ? '🌙' : '🌞';
  
  themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', currentTheme);
    localStorage.setItem('pomodoroTheme', currentTheme);
    themeToggleBtn.textContent = currentTheme === 'light' ? '🌙' : '🌞';
  });

  taskSearchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderTasks();
});


}

// ================== Music & Time Sync ==================

audio.addEventListener('loadedmetadata', () => {
  musicDuration = Math.floor(audio.duration);
  if (!isRunning) {
    remainingTime = musicDuration;
    updateTimerDisplay();
  }
});

function updateTimerDisplay() {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// ================== Timer Logic ==================

startBtn.addEventListener('click', () => {
  if (musicDuration === 0 || isNaN(musicDuration)) {
    alert("Reading music length, please wait...");
    return;
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // 點擊啟動時更新該任務的時間戳記
  tasksData[currentTask].lastUpdated = Date.now();
  saveTasksData();

  if (!isRunning) {
    isRunning = true;
    audio.play().catch(err => console.log("Auto-play prevented", err));

    timerInterval = setInterval(() => {
      if (remainingTime > 0) {
        remainingTime--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        isRunning = false;

        // 播放結束音效
        alertAudio.currentTime = 0;
        alertAudio.play().catch(err => console.log("Alert play blocked", err));

        incrementCurrentTask();
        remainingTime = musicDuration;
        updateTimerDisplay();
        
        showCompletionModal(currentTask);
      }
    }, 1000);
  }
});

pauseBtn.addEventListener('click', () => {
  if (isRunning) {
    clearInterval(timerInterval);
    isRunning = false;
    audio.pause();
  }
});

resetBtn.addEventListener('click', resetTimer);

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  remainingTime = musicDuration;
  updateTimerDisplay();
  audio.pause();
  audio.currentTime = 0;
}

// ================== Task Logic ==================

function renderTasks() {
  currentTaskDisplay.textContent = currentTask; //[cite: 1]

  // 原始排序：依據最後更新時間降冪排序[cite: 1]
  const sortedTasks = Object.entries(tasksData).sort((a, b) => {
    return b[1].lastUpdated - a[1].lastUpdated;
  });

  // 1. 左側快捷任務清單 (加入搜尋優先排列邏輯)
  taskList.innerHTML = ''; //[cite: 1]
  
  // 複製一份陣列專門給左側側邊欄使用
  let sidebarTasks = [...sortedTasks];
  
  if (searchQuery) {
    sidebarTasks.sort((a, b) => {
      const aMatch = a[0].toLowerCase().includes(searchQuery);
      const bMatch = b[0].toLowerCase().includes(searchQuery);
      
      // 如果 a 包含搜尋字串但 b 沒有，a 優先往前排
      if (aMatch && !bMatch) return -1;
      // 如果 b 包含搜尋字串但 a 沒有，b 優先往前排
      if (!aMatch && bMatch) return 1;
      
      // 若兩者都有匹配、或都沒匹配，則維持原本的時間排序 (return 0)
      return 0; 
    });
  }

  // 依照排序好的 sidebarTasks 建立按鈕
  sidebarTasks.forEach(([taskName]) => {
    const btn = document.createElement('button'); //[cite: 1]
    btn.className = `task-btn ${taskName === currentTask ? 'active' : ''}`; //[cite: 1]
    btn.textContent = taskName; //[cite: 1]
    btn.title = taskName; //[cite: 1]
    btn.addEventListener('click', () => { //[cite: 1]
      currentTask = taskName; //[cite: 1]
      tasksData[currentTask].lastUpdated = Date.now(); //[cite: 1]
      saveTasksData(); //[cite: 1]
    });
    taskList.appendChild(btn); //[cite: 1]
  });

  // 2. 更新設定面板的下拉選單 (保持原排序)[cite: 1]
  taskSelect.innerHTML = '';
  for (const taskName in tasksData) {
    const option = document.createElement('option');
    option.value = taskName;
    option.textContent = taskName;
    if (taskName === currentTask) option.selected = true;
    taskSelect.appendChild(option);
  }

  // 3. 右側主畫面統計清單 (完美對稱位置，保持原排序)[cite: 1]
  completedList.innerHTML = '';
  for (const [taskName, taskInfo] of sortedTasks) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${taskName}</span> <span>${taskInfo.count} times</span>`;
    completedList.appendChild(li);
  }
}

function saveTasksData() {
  localStorage.setItem('pomodoroTasks', JSON.stringify(tasksData));
  localStorage.setItem('pomodoroCurrentTask', currentTask);
  renderTasks();
}

taskSelect.addEventListener('change', (e) => {
  currentTask = e.target.value;
  tasksData[currentTask].lastUpdated = Date.now();
  saveTasksData();
});

addTaskBtn.addEventListener('click', () => {
  const newTaskName = newTaskInput.value.trim();
  if (newTaskName && tasksData[newTaskName] === undefined) {
    tasksData[newTaskName] = { count: 0, lastUpdated: Date.now() };
    currentTask = newTaskName;
    newTaskInput.value = '';
    saveTasksData();
  }
});

deleteTaskBtn.addEventListener('click', () => {
  if (currentTask === "Default Task") {
    alert("The 'Default Task' is a base item and cannot be deleted!");
    return;
  }
  
  if (confirm(`Are you sure you want to delete '${currentTask}'? Related statistics will be lost.`)) {
    delete tasksData[currentTask];
    currentTask = "Default Task"; 
    saveTasksData();
  }
});

function incrementCurrentTask() {
  tasksData[currentTask].count += 1;
  tasksData[currentTask].lastUpdated = Date.now();
  saveTasksData();
}

// ================== Completion Alert Modal ==================

function showCompletionModal(taskName) {
  alertTaskMessage.textContent = `Completed Task: ${taskName}`;
  alertModal.style.display = "block";
  alertConfirmBtn.focus(); 
}

function hideCompletionModal() {
  alertModal.style.display = "none";
}

alertConfirmBtn.addEventListener('click', hideCompletionModal);

window.addEventListener('keydown', (e) => {
  if (alertModal.style.display === "block" && e.key === "Enter") {
    hideCompletionModal();
  }
});

// ================== Volume Logic ==================

function initVolume() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audio);
    gainNode = audioCtx.createGain();
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  }
  gainNode.gain.value = volume; 
  volumeSlider.value = volume * 100;
  volumeValueDisplay.textContent = Math.round(volume * 100) + '%';
}

volumeSlider.addEventListener('input', (e) => {
  volume = e.target.value / 100;
  if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
  if (gainNode) { gainNode.gain.value = volume; }
  volumeValueDisplay.textContent = e.target.value + '%';
  localStorage.setItem('pomodoroVolume', volume);
});

function initAlertVolume() {
  alertAudio.volume = alertVolume;
  alertVolumeSlider.value = alertVolume * 100;
  alertVolumeValueDisplay.textContent = Math.round(alertVolume * 100) + '%';
}

alertVolumeSlider.addEventListener('input', (e) => {
  alertVolume = e.target.value / 100;
  alertAudio.volume = alertVolume;
  alertVolumeValueDisplay.textContent = e.target.value + '%';
  localStorage.setItem('pomodoroAlertVolume', alertVolume);
});

// ================== Modal Controls ==================

settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = "block";
});

closeModal.addEventListener('click', () => {
  settingsModal.style.display = "none";
});

window.addEventListener('click', (event) => {
  if (event.target === settingsModal) {
    settingsModal.style.display = "none";
  }
  if (event.target === alertModal) {
    hideCompletionModal();
  }
});