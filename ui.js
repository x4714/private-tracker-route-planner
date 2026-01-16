// UI rendering logic

class UIRenderer {
  constructor(routeInfo, unlockInviteClass, abbrList, getMaxDaysFn) {
    this.routeInfo = routeInfo;
    this.unlockInviteClass = unlockInviteClass;
    this.abbrList = abbrList;
    this.getMaxDays = getMaxDaysFn;
    this.resultsInfo = document.getElementById("resultsInfo");
    this.routesGrid = document.getElementById("routesGrid");
    this.body = document.body;
  }

  renderResults(result, mergeRoutes = false) {
    this.routesGrid.innerHTML = "";

    if (result.status === "empty") {
      this.resultsInfo.innerHTML = "";
      this.body.classList.remove("has-results");
      return;
    }

    if (
      result.status === "same" ||
      result.status === "not_found" ||
      result.status === "no_routes"
    ) {
      this.resultsInfo.innerHTML = result.message;
      this.body.classList.add("has-results");
      return;
    }

    if (result.status === "success") {
      let routes = result.routes;

      if (mergeRoutes) {
        routes = this.filterDominatedRoutes(routes);
        routes = this.filterDetours(routes);
        routes = this.mergeRoutesByPath(routes);
      }

      this.resultsInfo.innerHTML = `Found ${routes.length} route${
        routes.length !== 1 ? "s" : ""
      }`;
      this.body.classList.add("has-results");

      const fragment = document.createDocumentFragment();
      routes.forEach((route, index) => {
        if (route.merged) {
          fragment.appendChild(this.createMergedRouteCard(route, index + 1));
        } else {
          fragment.appendChild(this.createRouteCard(route, index + 1));
        }
      });
      this.routesGrid.appendChild(fragment);
    }
  }

  mergeRoutesByPath(routes) {
    const pathGroups = new Map();

    routes.forEach((route) => {
      // Skip first element (source) for grouping key
      const pathKey = route.path.slice(1).join("->");

      if (!pathGroups.has(pathKey)) {
        pathGroups.set(pathKey, []);
      }
      pathGroups.get(pathKey).push(route);
    });

    const mergedRoutes = [];

    pathGroups.forEach((group, pathKey) => {
      if (group.length > 1) {
        // Multiple sources with same path - merge them
        mergedRoutes.push({
          merged: true,
          sources: group.map((r) => r.source),
          path: group[0].path.slice(1), // Common path without sources
          totalDays: Math.min(...group.map((r) => r.totalDays)),
          maxDays: Math.max(...group.map((r) => r.totalDays)),
          sourceRoutes: group,
        });
      } else {
        // Single route - keep as is
        mergedRoutes.push(group[0]);
      }
    });

    return mergedRoutes;
  }

  isDetour(node, nextNode) {
    const neighbors = Object.keys(this.routeInfo[node] || {});
    if (neighbors.length !== 1) return false;
    const edge = this.routeInfo[node][nextNode];
    if (!edge) return false;
    const days = edge.days;
    const classReq = this.unlockInviteClass[node]?.[1];
    const noClass = !classReq || classReq === "N/A";
    const noDays = days === 0 || days === null;
    return noClass && noDays;
  }

  filterDetours(routes) {
    return routes.map((route) => {
      const newPath = [route.path[0]];
      for (let i = 1; i < route.path.length; i++) {
        const prev = newPath[newPath.length - 1];
        const curr = route.path[i];
        if (!this.isDetour(prev, curr)) {
          newPath.push(curr);
        }
      }
      return { ...route, path: newPath };
    });
  }

  filterDominatedRoutes(routes) {
    return routes.filter((a) => {
      return !routes.some((b) => {
        if (a === b) return false;
        if (a.target !== b.target) return false;

        // Check if b's path is a subsequence of a's path
        let i = 0;
        for (let j = 0; j < a.path.length && i < b.path.length; j++) {
          if (a.path[j] === b.path[i]) i++;
        }
        const bIsSubsequence = i === b.path.length;

        if (!bIsSubsequence) return false;

        // If b is strictly better, remove a
        const betterDays = b.totalDays <= a.totalDays;
        const betterJumps = b.path.length <= a.path.length;
        const strictlyBetter =
          b.totalDays < a.totalDays || b.path.length < a.path.length;

        return betterDays && betterJumps && strictlyBetter;
      });
    });
  }

  createMergedRouteCard(mergedRoute, routeNumber) {
    const card = document.createElement("div");
    card.className = "route-card merged-route-card";

    const abbreviatedRoute = mergedRoute.path.map(
      (node) => this.abbrList[node] || node
    );
    const displayRoute = mergedRoute.path
      .map((node) => {
        const abbr = this.abbrList[node] || node;
        return `${abbr} (${node})`;
      })
      .join(" → ");

    const jumps = mergedRoute.path.length;
    const daysRange =
      mergedRoute.totalDays === mergedRoute.maxDays
        ? `${mergedRoute.totalDays} days`
        : `${mergedRoute.totalDays}-${mergedRoute.maxDays} days`;

    // Build source requirements section
    let sourcesHTML = '<div class="merged-sources">';
    sourcesHTML +=
      '<div class="merged-sources-header">Starting trackers:</div>';

    mergedRoute.sourceRoutes.forEach((sourceRoute) => {
      const firstNode = sourceRoute.source;
      const secondNode = sourceRoute.path[1];

      if (this.routeInfo[firstNode] && this.routeInfo[firstNode][secondNode]) {
        const maxDaysValue = this.getMaxDays(
          firstNode,
          secondNode,
          this.routeInfo,
          this.unlockInviteClass
        );
        const routeData = this.routeInfo[firstNode][secondNode];
        const requirement = routeData.reqs || "";
        const lastActivity = routeData.updated || "Unknown";
        const activeStatus = routeData.active || "Unknown";

        let statusClass = "status-unknown";
        if (activeStatus.toLowerCase() === "yes")
          statusClass = "status-recruiting";
        if (activeStatus.toLowerCase() === "no") statusClass = "status-closed";

        const statusText =
          activeStatus === "Yes"
            ? "Recruiting"
            : activeStatus === "No"
            ? "Closed"
            : "Unknown";
        const daysDisplay =
          maxDaysValue === null ? "Unknown" : `${maxDaysValue}d`;

        const className = this.unlockInviteClass[firstNode]
          ? this.unlockInviteClass[firstNode][1]
          : "N/A";

        sourcesHTML += `
          <div class="merged-source-item">
            <div class="merged-source-header">
              <span class="merged-source-name">${firstNode}</span>
              <div class="merged-source-meta">
                <span class="route-step-days">${daysDisplay}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
              </div>
            </div>
            <div class="merged-source-details">
              <div class="route-step-detail">
                <div class="route-step-label">Class needed:</div>
                <div class="route-step-value">${className}</div>
              </div>
              ${
                requirement &&
                requirement.toLowerCase() !== "none" &&
                requirement.toLowerCase() !== "no requirement"
                  ? `
                <div class="route-step-detail">
                  <div class="route-step-label">Requirements:</div>
                  <div class="route-step-value">${requirement}</div>
                </div>
              `
                  : ""
              }
              <div class="route-step-detail">
                <div class="route-step-label">Last checked:</div>
                <div class="route-step-value">${lastActivity}</div>
              </div>
            </div>
          </div>
        `;
      }
    });
    sourcesHTML += "</div>";

    // Build remaining path steps
    let stepsHTML = "";
    for (let i = 0; i < mergedRoute.path.length - 1; i++) {
      const node = mergedRoute.path[i];
      const nextNode = mergedRoute.path[i + 1];

      if (this.routeInfo[node] && this.routeInfo[node][nextNode]) {
        const maxDaysValue = this.getMaxDays(
          node,
          nextNode,
          this.routeInfo,
          this.unlockInviteClass
        );
        const routeData = this.routeInfo[node][nextNode];
        const requirement = routeData.reqs || "";
        const lastActivity = routeData.updated || "Unknown";
        const activeStatus = routeData.active || "Unknown";

        let statusClass = "status-unknown";
        if (activeStatus.toLowerCase() === "yes")
          statusClass = "status-recruiting";
        if (activeStatus.toLowerCase() === "no") statusClass = "status-closed";

        const statusText =
          activeStatus === "Yes"
            ? "Recruiting"
            : activeStatus === "No"
            ? "Closed"
            : "Unknown";
        const daysDisplay =
          maxDaysValue === null ? "Unknown" : `${maxDaysValue}d`;

        let detailsHTML = "";

        const className = this.unlockInviteClass[node]
          ? this.unlockInviteClass[node][1]
          : "N/A";
        detailsHTML += `
          <div class="route-step-detail">
            <div class="route-step-label">Class needed:</div>
            <div class="route-step-value">${className}</div>
          </div>
        `;

        if (
          requirement &&
          requirement.toLowerCase() !== "none" &&
          requirement.toLowerCase() !== "no requirement"
        ) {
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
    }

    card.innerHTML = `
      <div class="route-header">${displayRoute}</div>
      <div class="route-summary">
        <span>Route #${routeNumber} (${
      mergedRoute.sources.length
    } sources)</span>
        <span>${jumps} jump${jumps !== 1 ? "s" : ""} · ${daysRange}</span>
      </div>
      ${sourcesHTML}
      ${stepsHTML}
    `;

    return card;
  }

  createRouteCard(route, routeNumber) {
    const card = document.createElement("div");
    card.className = "route-card";

    const abbreviatedRoute = route.path.map(
      (node) => this.abbrList[node] || node
    );
    const displayRoute = mergedRoute.path
      .map((node) => {
        const abbr = this.abbrList[node] || node;
        return `${abbr} (${node})`;
      })
      .join(" → ");

    const totalDays = route.totalDays;
    const jumps = route.path.length - 1;

    let stepsHTML = "";
    route.path.forEach((node, index) => {
      if (
        index < route.path.length - 1 &&
        this.routeInfo[node] &&
        this.routeInfo[node][route.path[index + 1]]
      ) {
        const nextNode = route.path[index + 1];
        const maxDaysValue = this.getMaxDays(
          node,
          nextNode,
          this.routeInfo,
          this.unlockInviteClass
        );
        const routeData = this.routeInfo[node][nextNode];
        const requirement = routeData.reqs || "";
        const lastActivity = routeData.updated || "Unknown";
        const activeStatus = routeData.active || "Unknown";

        let statusClass = "status-unknown";
        if (activeStatus.toLowerCase() === "yes")
          statusClass = "status-recruiting";
        if (activeStatus.toLowerCase() === "no") statusClass = "status-closed";

        const statusText =
          activeStatus === "Yes"
            ? "Recruiting"
            : activeStatus === "No"
            ? "Closed"
            : "Unknown";
        const daysDisplay =
          maxDaysValue === null ? "Unknown" : `${maxDaysValue}d`;

        let detailsHTML = "";

        const className = this.unlockInviteClass[node]
          ? this.unlockInviteClass[node][1]
          : "N/A";
        detailsHTML += `
          <div class="route-step-detail">
            <div class="route-step-label">Class needed:</div>
            <div class="route-step-value">${className}</div>
          </div>
        `;

        if (
          requirement &&
          requirement.toLowerCase() !== "none" &&
          requirement.toLowerCase() !== "no requirement"
        ) {
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
        <span>${jumps} jump${jumps !== 1 ? "s" : ""} · ${
      totalDays !== null ? totalDays + " days" : "Unknown days"
    }</span>
      </div>
      ${stepsHTML}
    `;

    return card;
  }

  updateSearchState(hasValue) {
    if (hasValue) {
      this.body.classList.add("is-searching");
    } else {
      this.body.classList.remove("is-searching");
      this.body.classList.remove("has-results");
      this.resultsInfo.style.opacity = "0";
    }
  }
}
