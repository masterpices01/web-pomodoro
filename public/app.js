// --- DOM Elements ---
const timerDisplay = document.getElementById('timer');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.getElementById('closeModal');

const taskSelect = document.getElementById('taskSelect');
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const completedList = document.getElementById('completedList');

const musicInput = document.getElementById('musicInput');
const musicPathDisplay = document.getElementById('musicPath');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValueDisplay = document.getElementById('volumeValue');
const audio = document.getElementById('music');

// --- State Variables ---
let timerInterval;
let musicDuration = 0; 
let remainingTime = 0;
let isRunning = false;
let shouldPlayMusic = false;

// --- Task & Volume Data ---
let tasksData = JSON.parse(localStorage.getItem('pomodoroTasks'));
let currentTask = localStorage.getItem('pomodoroCurrentTask') || "Default Task";
let volume = parseFloat(localStorage.getItem('pomodoroVolume')) || 0.7;

// 資料結構升級檢測：如果沒有資料，或舊版資料只有存數字，就轉換成新版 { count: 數字, lastUpdated: 時間戳 }
if (!tasksData) {
  tasksData = { "Default Task": { count: 0, lastUpdated: Date.now() } };
} else {
  for (const key in tasksData) {
    if (typeof tasksData[key] === 'number') {
      // 將舊資料轉換為新格式
      tasksData[key] = { count: tasksData[key], lastUpdated: Date.now() };
    }
  }
}

// --- Initialize ---
init();

function init() {
  initVolume();
  renderTasks();
  audio.src = 'assets/Bach Cello Suite No  5 in C minor, BWV 1011(Pablo Casals 1938) - 320.mp3';
}

// ================== Music & Time Sync ==================

audio.addEventListener('loadedmetadata', () => {
  musicDuration = Math.floor(audio.duration);
  if (!isRunning) {
    remainingTime = musicDuration;
    updateTimerDisplay();
  }
});

musicInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const objectURL = URL.createObjectURL(file);
    audio.src = objectURL;
    musicPathDisplay.textContent = file.name;
    if (isRunning) resetTimer();
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

  if (!isRunning) {
    isRunning = true;
    shouldPlayMusic = true;
    
    audio.play().catch(err => console.log("Auto-play prevented", err));

    timerInterval = setInterval(() => {
      if (remainingTime > 0) {
        remainingTime--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        isRunning = false;
        incrementCurrentTask();
        remainingTime = musicDuration;
        updateTimerDisplay();
        alert(`Pomodoro Completed! (${currentTask})`);
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
  shouldPlayMusic = false;
  remainingTime = musicDuration;
  updateTimerDisplay();
  audio.pause();
  audio.currentTime = 0;
}

// ================== Task Logic ==================

function renderTasks() {
  currentTaskDisplay.textContent = currentTask;

  // 1. 更新設定面板的下拉選單 (保持原本順序或字元順序皆可，這裡依原物件順序)
  taskSelect.innerHTML = '';
  for (const taskName in tasksData) {
    const option = document.createElement('option');
    option.value = taskName;
    option.textContent = taskName;
    if (taskName === currentTask) option.selected = true;
    taskSelect.appendChild(option);
  }

  // 2. 更新主畫面統計清單 (依據 lastUpdated 降冪排序)
  completedList.innerHTML = '';
  
  // 將物件轉為陣列，並依照最後更新時間排序 (新 -> 舊)
  const sortedTasks = Object.entries(tasksData).sort((a, b) => {
    return b[1].lastUpdated - a[1].lastUpdated;
  });

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
  saveTasksData();
});

addTaskBtn.addEventListener('click', () => {
  const newTaskName = newTaskInput.value.trim();
  if (newTaskName && tasksData[newTaskName] === undefined) {
    // 新增任務時，賦予初始次數 0 與當前時間戳
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
  // 任務完成時，增加次數並更新時間戳
  tasksData[currentTask].count += 1;
  tasksData[currentTask].lastUpdated = Date.now();
  saveTasksData();
}

// ================== Volume Logic ==================

function initVolume() {
  audio.volume = volume;
  volumeSlider.value = volume * 100;
  volumeValueDisplay.textContent = Math.round(volume * 100) + '%';
}

volumeSlider.addEventListener('input', (e) => {
  volume = e.target.value / 100;
  audio.volume = volume;
  volumeValueDisplay.textContent = e.target.value + '%';
  localStorage.setItem('pomodoroVolume', volume);
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
});