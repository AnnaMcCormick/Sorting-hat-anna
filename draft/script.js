// Draft Pick Application Script
let teams = [];
let people = [];
let deletedNames = [];
let draftOrder = [];
let teamRosters = [];
let draftRound = 0;
let currentTeamIdx = 0;
let remaining = [];
let distribution = [];
let picksMade = 0;
let autoDraftInterval = null;

// DOM Elements
const setupPhase = document.getElementById('setup-phase');
const draftPhase = document.getElementById('draft-phase');
const resultsPhase = document.getElementById('results-phase');
const teamForm = document.getElementById('team-form');
const teamNameInput = document.getElementById('team-name');
const teamList = document.getElementById('team-list');
const personForm = document.getElementById('person-form');
const personNameInput = document.getElementById('person-name');
const personTagInput = document.getElementById('person-tag');
const bulkAddBtn = document.getElementById('bulk-add-btn');
const bulkAddArea = document.getElementById('bulk-add-area');
const bulkNames = document.getElementById('bulk-names');
const bulkSubmit = document.getElementById('bulk-submit');
const bulkCancel = document.getElementById('bulk-cancel');
const deletedNamesList = document.getElementById('deleted-names');
const personList = document.getElementById('person-list');
const startDraftBtn = document.getElementById('start-draft');
const setupError = document.getElementById('setup-error');
const draftProgress = document.getElementById('draft-progress');
const draftBoard = document.getElementById('draft-board');
const nextPickBtn = document.getElementById('next-pick');
const autoDraftBtn = document.getElementById('auto-draft-btn');
const draftError = document.getElementById('draft-error');
const remainingList = document.getElementById('remaining-list');
const resultsBoard = document.getElementById('results-board');
const restartBtn = document.getElementById('restart');

function renderTeams() {
  teamList.innerHTML = '';
  teams.forEach((team, idx) => {
    const li = document.createElement('li');
    li.textContent = team;
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => {
      const newName = prompt('Edit team name:', team);
      if (newName && newName.trim()) {
        teams[idx] = newName.trim();
        renderTeams();
      }
    };
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      teams.splice(idx, 1);
      renderTeams();
    };
    li.appendChild(editBtn);
    li.appendChild(delBtn);
    teamList.appendChild(li);
  });
}
function renderPeople() {
  personList.innerHTML = '';
  people.forEach((personObj, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${personObj.name}</span>` + (personObj.tag ? ` <span style='color:#1976d2;font-size:0.9em;'>[${personObj.tag}]</span>` : '');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => {
      const newName = prompt('Edit participant name:', personObj.name);
      if (newName && newName.trim()) {
        personObj.name = newName.trim();
        renderPeople();
      }
    };
    const tagBtn = document.createElement('button');
    tagBtn.textContent = 'Tag';
    tagBtn.onclick = () => {
      const newTag = prompt('Edit tag/skill:', personObj.tag || '');
      personObj.tag = newTag ? newTag.trim() : '';
      renderPeople();
    };
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      deletedNames.push(personObj.name);
      updateDeletedNamesList();
      people.splice(idx, 1);
      renderPeople();
    };
    li.appendChild(editBtn);
    li.appendChild(tagBtn);
    li.appendChild(delBtn);
    personList.appendChild(li);
  });
}
function updateDeletedNamesList() {
  deletedNamesList.innerHTML = '';
  Array.from(new Set(deletedNames)).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    deletedNamesList.appendChild(option);
  });
}
personForm.onsubmit = e => {
  e.preventDefault();
  const name = personNameInput.value.trim();
  const tag = personTagInput.value.trim();
  if (name) {
    people.push({ name, tag });
    personNameInput.value = '';
    personTagInput.value = '';
    renderPeople();
  }
};
bulkAddBtn.onclick = () => {
  bulkAddArea.classList.remove('hidden');
  bulkNames.value = '';
};
bulkCancel.onclick = () => {
  bulkAddArea.classList.add('hidden');
};
bulkSubmit.onclick = () => {
  const lines = bulkNames.value.split(/\n|,/).map(s => s.trim()).filter(Boolean);
  lines.forEach(line => {
    let name = line, tag = '';
    if (line.includes('[') && line.includes(']')) {
      name = line.split('[')[0].trim();
      tag = line.split('[')[1].replace(']','').trim();
    } else if (line.includes('|')) {
      [name, tag] = line.split('|').map(s => s.trim());
    }
    if (name) people.push({ name, tag });
  });
  renderPeople();
  bulkAddArea.classList.add('hidden');
};
function validateSetup() {
  if (teams.length < 2) return 'At least 2 teams required.';
  if (people.length < 2) return 'At least 2 participants required.';
  return '';
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function calculateDistribution(numPeople, numTeams) {
  const base = Math.floor(numPeople / numTeams);
  const remainder = numPeople % numTeams;
  const dist = Array(numTeams).fill(base);
  for (let i = 0; i < remainder; i++) dist[i]++;
  return dist;
}
function renderDraftBoard() {
  draftBoard.innerHTML = '';
  teamRosters.forEach((roster, idx) => {
    const div = document.createElement('div');
    div.className = 'team' + (currentTeamIdx === idx ? ' on-clock' : '');
    div.style.border = currentTeamIdx === idx ? '2px solid #1976d2' : '';
    div.innerHTML = `<strong>${teams[idx]}</strong><ul>${roster.map(pObj => `<li style='background:${currentTeamIdx === idx ? '#bbdefb' : '#fff'};border:1px solid #bbb;margin:2px 0;padding:2px 6px;border-radius:3px;'>${typeof pObj === 'string' ? pObj : pObj.name}${pObj.tag ? ` <span style='color:#1976d2;font-size:0.9em;'>[${pObj.tag}]</span>` : ''}</li>`).join('')}</ul>`;
    draftBoard.appendChild(div);
  });
}
function renderRemaining() {
  remainingList.innerHTML = '';
  remaining.forEach(pObj => {
    const li = document.createElement('li');
    li.innerHTML = `${typeof pObj === 'string' ? pObj : pObj.name}${pObj.tag ? ` <span style='color:#1976d2;font-size:0.9em;'>[${pObj.tag}]</span>` : ''}`;
    remainingList.appendChild(li);
  });
}
function renderDraftProgress() {
  const pickNum = teamRosters[currentTeamIdx].length + 1;
  draftProgress.textContent = `Round ${draftRound + 1} - Pick ${pickNum} (${teams[currentTeamIdx]})`;
}
function renderResultsBoard() {
  resultsBoard.innerHTML = '';
  teamRosters.forEach((roster, idx) => {
    const div = document.createElement('div');
    div.className = 'team';
    div.innerHTML = `<strong>${teams[idx]}</strong><ul>${roster.map(pObj => `<li style='background:#fff;border:1px solid #bbb;margin:2px 0;padding:2px 6px;border-radius:3px;'>${typeof pObj === 'string' ? pObj : pObj.name}${pObj.tag ? ` <span style='color:#1976d2;font-size:0.9em;'>[${pObj.tag}]</span>` : ''}</li>`).join('')}</ul>`;
    resultsBoard.appendChild(div);
  });
}
teamForm.onsubmit = e => {
  e.preventDefault();
  const name = teamNameInput.value.trim();
  if (name) {
    teams.push(name);
    teamNameInput.value = '';
    renderTeams();
  }
};
startDraftBtn.onclick = () => {
  const error = validateSetup();
  if (error) {
    setupError.textContent = error;
    return;
  }
  setupError.textContent = '';
  draftOrder = shuffle([...people]);
  teamRosters = Array(teams.length).fill().map(() => []);
  draftRound = 0;
  currentTeamIdx = 0;
  remaining = [...draftOrder];
  distribution = calculateDistribution(people.length, teams.length);
  picksMade = 0;
  renderDraftBoard();
  renderDraftProgress();
  renderRemaining();
  setupPhase.classList.add('hidden');
  draftPhase.classList.remove('hidden');
};
nextPickBtn.onclick = () => {
  draftError.textContent = '';
  if (remaining.length === 0) return;
  if (teamRosters[currentTeamIdx].length >= distribution[currentTeamIdx]) {
    let found = false;
    for (let i = 1; i <= teams.length; i++) {
      const idx = (currentTeamIdx + i) % teams.length;
      if (teamRosters[idx].length < distribution[idx]) {
        currentTeamIdx = idx;
        found = true;
        break;
      }
    }
    if (!found) return;
  }
  const pickIdx = Math.floor(Math.random() * remaining.length);
  const pick = remaining.splice(pickIdx, 1)[0];
  teamRosters[currentTeamIdx].push(pick);
  picksMade++;
  renderDraftBoard();
  renderRemaining();
  if (teamRosters.every((roster, idx) => roster.length >= distribution[idx])) {
    draftPhase.classList.add('hidden');
    resultsPhase.classList.remove('hidden');
    renderResultsBoard();
    stopAutoDraft();
    return;
  }
  for (let i = 1; i <= teams.length; i++) {
    const idx = (currentTeamIdx + i) % teams.length;
    if (teamRosters[idx].length < distribution[idx]) {
      currentTeamIdx = idx;
      break;
    }
  }
  if (currentTeamIdx === 0) draftRound++;
  renderDraftProgress();
};
autoDraftBtn.onclick = () => {
  if (autoDraftInterval) {
    stopAutoDraft();
    autoDraftBtn.textContent = 'Auto Draft';
    return;
  }
  autoDraftBtn.textContent = 'Stop Auto Draft';
  autoDraftInterval = setInterval(() => {
    if (remaining.length === 0) {
      stopAutoDraft();
      autoDraftBtn.textContent = 'Auto Draft';
      return;
    }
    nextPickBtn.click();
  }, 500);
};
function stopAutoDraft() {
  if (autoDraftInterval) {
    clearInterval(autoDraftInterval);
    autoDraftInterval = null;
  }
}
restartBtn.onclick = () => {
  teams = [];
  people = [];
  draftOrder = [];
  teamRosters = [];
  draftRound = 0;
  currentTeamIdx = 0;
  remaining = [];
  distribution = [];
  picksMade = 0;
  deletedNames = [];
  updateDeletedNamesList();
  renderTeams();
  renderPeople();
  setupPhase.classList.remove('hidden');
  draftPhase.classList.add('hidden');
  resultsPhase.classList.add('hidden');
  setupError.textContent = '';
  draftError.textContent = '';
};
renderTeams();
renderPeople();
