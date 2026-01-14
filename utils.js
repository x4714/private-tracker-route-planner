// Utility functions

function getAbbr(name, abbrList) {
  if (abbrList[name]) return abbrList[name];
  const capitals = name.match(/[A-Z]/g);
  if (capitals && capitals.length >= 2) return capitals.join("");
  return name.substring(0, 3).toUpperCase();
}

function getMaxDays(start, end, routeInfo, unlockInviteClass) {
  const routeData = routeInfo[start] && routeInfo[start][end];
  const days1 = routeData && routeData.days !== undefined ? routeData.days : null;
  const days2 = (unlockInviteClass[start] && unlockInviteClass[start][0]) || 0;

  if (days1 === null) return null;

  return Math.max(days1, days2);
}

function updateURL(sourceValue, targetValue, maxJumps, maxDays, sortRadios) {
  const params = new URLSearchParams();
  if (sourceValue) params.set('from', sourceValue);
  if (targetValue) params.set('to', targetValue);
  params.set('jumps', maxJumps);
  params.set('days', maxDays);
  const selectedSort = Array.from(sortRadios).find(r => r.checked)?.value || 'fastest';
  params.set('sort', selectedSort);
  history.replaceState(null, '', '?' + params.toString());
}

function fetchLastUpdate() {
  const apiUrl = `https://api.github.com/repos/x4714/private-tracker-route-planner/commits?path=trackers.json`;
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const commitDate = data[0].commit.committer.date;
      const updateDate = new Date(commitDate).toLocaleDateString();
      document.getElementById('update-time').innerText = `Updated ${updateDate}`;
    })
    .catch(error => {
      document.getElementById('update-time').innerText = ''; 
    });
}