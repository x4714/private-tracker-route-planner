// UI rendering logic

class UIRenderer {
  constructor(routeInfo, unlockInviteClass, abbrList, getMaxDaysFn) {
    this.routeInfo = routeInfo;
    this.unlockInviteClass = unlockInviteClass;
    this.abbrList = abbrList;
    this.getMaxDays = getMaxDaysFn;
    this.resultsInfo = document.getElementById('resultsInfo');
    this.routesGrid = document.getElementById('routesGrid');
    this.body = document.body;
  }

  renderResults(result) {
    this.routesGrid.innerHTML = '';

    if (result.status === 'empty') {
      this.resultsInfo.innerHTML = '';
      this.body.classList.remove('has-results');
      return;
    }

    if (result.status === 'same' || result.status === 'not_found' || result.status === 'no_routes') {
      this.resultsInfo.innerHTML = result.message;
      this.body.classList.add('has-results');
      return;
    }

    if (result.status === 'success') {
      const routes = result.routes;
      this.resultsInfo.innerHTML = `Found ${routes.length} route${routes.length !== 1 ? 's' : ''}`;
      this.body.classList.add('has-results');

      const fragment = document.createDocumentFragment();
      routes.forEach((route, index) => {
        fragment.appendChild(this.createRouteCard(route, index + 1));
      });
      this.routesGrid.appendChild(fragment);
    }
  }

  createRouteCard(route, routeNumber) {
    const card = document.createElement('div');
    card.className = 'route-card';

    const abbreviatedRoute = route.path.map(node => this.abbrList[node] || node);
    const displayRoute = abbreviatedRoute.join(' → ');

    const totalDays = route.totalDays;
    const jumps = route.path.length - 1;

    let stepsHTML = '';
    route.path.forEach((node, index) => {
      if (index < route.path.length - 1 && this.routeInfo[node] && this.routeInfo[node][route.path[index + 1]]) {
        const nextNode = route.path[index + 1];
        const maxDaysValue = this.getMaxDays(node, nextNode, this.routeInfo, this.unlockInviteClass);
        const routeData = this.routeInfo[node][nextNode];
        const requirement = routeData.reqs || '';
        const lastActivity = routeData.updated || 'Unknown';
        const activeStatus = routeData.active || 'Unknown';

        let statusClass = 'status-unknown';
        if (activeStatus.toLowerCase() === 'yes') statusClass = 'status-recruiting';
        if (activeStatus.toLowerCase() === 'no') statusClass = 'status-closed';

        const statusText = activeStatus === 'Yes' ? 'Recruiting' : (activeStatus === 'No' ? 'Closed' : 'Unknown');
        const daysDisplay = maxDaysValue === null ? 'Unknown' : `${maxDaysValue}d`;

        let detailsHTML = '';
        
        const className = this.unlockInviteClass[node] ? this.unlockInviteClass[node][1] : 'N/A';
        detailsHTML += `
          <div class="route-step-detail">
            <div class="route-step-label">Class needed:</div>
            <div class="route-step-value">${className}</div>
          </div>
        `;

        if (requirement && requirement.toLowerCase() !== 'none' && requirement.toLowerCase() !== 'no requirement') {
           detailsHTML += `
            <div class="route-step-detail">
              <div class="route-step-label">Requirements:</div>
              <div class="route-step-value">${requirement}</div>
            </div>
          `;
        }

        stepsHTML += `
          <div class="route-step">
            <div class="route-step-header">
              <div class="step-connection">
                <span>${node} → ${nextNode}</span>
                <span class="route-step-days">${daysDisplay}</span>
              </div>
              <div class="step-meta-right">
                <span class="status-badge ${statusClass}">${statusText}</span>
                <span class="last-checked">Checked: ${lastActivity}</span>
              </div>
            </div>
            ${detailsHTML}
          </div>
        `;
      }
    });

    card.innerHTML = `
      <div class="route-header">${displayRoute}</div>
      <div class="route-summary">
        <span>Route #${routeNumber}</span>
        <span>${jumps} jump${jumps !== 1 ? 's' : ''} · ${totalDays !== null ? totalDays + ' days' : 'Unknown days'}</span>
      </div>
      ${stepsHTML}
    `;

    return card;
  }

  updateSearchState(hasValue) {
    if (hasValue) {
      this.body.classList.add('is-searching');
    } else {
      this.body.classList.remove('is-searching');
      this.body.classList.remove('has-results');
      this.resultsInfo.style.opacity = '0';
    }
  }
}