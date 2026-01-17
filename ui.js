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
    this.trackersData = null;
    this.missingTrackers = new Set(); // Track missing trackers to avoid spam
    this.loadTrackersData();
  }

  async loadTrackersData() {
    try {
      const response = await fetch("trackers_hd.json");
      if (response.ok) {
        const data = await response.json();
        // Create a map for quick lookup by tracker name
        this.trackersData = new Map();
        data.trackers.forEach(tracker => {
          this.trackersData.set(tracker.Name, tracker);
        });
        console.log("Tracker data loaded:", this.trackersData.size, "trackers");
      }
    } catch (error) {
      console.warn("Could not load tracker info:", error);
    }
  }

  async ensureTrackersLoaded() {
    // Wait for trackers data to be available
    let attempts = 0;
    while (!this.trackersData && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  getTrackerInfoHTML(trackerName) {
    if (!this.trackersData) {
      return "";
    }

    // Try exact match first
    let tracker = this.trackersData.get(trackerName);
    let matchType = "exact";

    // If not found, try case-insensitive match
    if (!tracker) {
      const lowerName = trackerName.toLowerCase();
      for (const [key, value] of this.trackersData.entries()) {
        if (key.toLowerCase() === lowerName) {
          tracker = value;
          matchType = "case-insensitive";
          break;
        }
      }
    }

    // If still not found, try partial match (tracker name contains the search term or vice versa)
    if (!tracker) {
      const searchTerm = trackerName.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '');
      for (const [key, value] of this.trackersData.entries()) {
        const trackerKey = key.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '');
        // Check if one contains the other
        if (trackerKey.includes(searchTerm) || searchTerm.includes(trackerKey)) {
          tracker = value;
          matchType = "partial";
          console.log(`✓ Partial match: "${trackerName}" → "${key}"`);
          break;
        }
      }
    }

    // Only match exact abbreviation / alias
    if (!tracker) {
      console.groupCollapsed(`🔍 Acronym/alias exact match: "${trackerName}"`);

      // Build the search acronym: "Dolphin Is Coming" -> "dic"
      const searchAcronym = trackerName
        .split(/\s+/)
        .map(t => t[0])
        .join('')
        .toLowerCase();

      console.log("Search acronym:", searchAcronym);

      for (const [key, value] of this.trackersData.entries()) {
        // Normalize Abbreviation to an array (handle string or "-" case)
        let aliases = [];
        if (value.Abbreviation && typeof value.Abbreviation === 'string') {
          aliases =
            value.Abbreviation === "-" ? [] : value.Abbreviation.split(',').map(a => a.trim().toLowerCase());
        } else if (Array.isArray(value.Abbreviation)) {
          aliases = value.Abbreviation.map(a => a.toLowerCase());
        }

        console.log("Trying tracker:", key);
        console.log("Aliases available:", aliases);

        // Match only if exact acronym equals any alias
        if (aliases.includes(searchAcronym)) {
          tracker = value;
          matchType = "acronym/alias";
          console.log("✅ Exact acronym match:", key, "aliases:", aliases);
          break;
        }
      }

      if (!tracker) {
        console.warn(`❌ No exact acronym match found for: "${trackerName}"`);
      }

      console.groupEnd();
    }



    if (!tracker) {
      // Only log each missing tracker once
      if (!this.missingTrackers.has(trackerName)) {
        this.missingTrackers.add(trackerName);
        console.warn(`❌ No tracker data for: "${trackerName}"`);
      }
      return "";
    }

    if (matchType === "case-insensitive") {
      console.log(`✓ Case-insensitive match: "${trackerName}"`);
    }

    let abbrDisplay = "-";
    if (tracker.Abbreviation) {
      if (Array.isArray(tracker.Abbreviation)) {
        abbrDisplay = tracker.Abbreviation.length ? tracker.Abbreviation.join(", ") : "-";
      } else if (typeof tracker.Abbreviation === "string" && tracker.Abbreviation !== "-") {
        abbrDisplay = tracker.Abbreviation;
      }
    }

    const tooltipLines = [];
    tooltipLines.push(`Name: ${tracker.Name}`);
    tooltipLines.push(`Abbr: ${abbrDisplay}`);


    if (tracker.Type) tooltipLines.push(`Type: ${tracker.Type}`);
    if (tracker.Codebase) tooltipLines.push(`Codebase: ${tracker.Codebase}`);
    if (tracker.Users && tracker.Users !== "-") tooltipLines.push(`Users: ${tracker.Users}`);
    if (tracker.Torrents && tracker.Torrents !== "-") tooltipLines.push(`Torrents: ${tracker.Torrents}`);
    if (tracker.Peers && tracker.Peers !== "-") tooltipLines.push(`Peers: ${tracker.Peers}`);

    if (tracker.Ratio === "Yes" && tracker["Ratio Diff"] && tracker["Ratio Diff"] !== "-") {
      tooltipLines.push(`Ratio Difficulty: ${tracker["Ratio Diff"]}`);
    }

    if (tracker.Freeleech === "Yes") tooltipLines.push(`Freeleech: Available`);
    if (tracker.Points === "Yes") tooltipLines.push(`Points System: Yes`);
    if (tracker["Hit & Run"] === "Yes") tooltipLines.push(`Hit & Run: Yes`);
    if (tracker.Birthdate) tooltipLines.push(`Established: ${tracker.Birthdate}`);
    if (tracker.Join) tooltipLines.push(`Join Method: ${tracker.Join}`);
    if (tracker["Join Diff"]) tooltipLines.push(`Join Difficulty: ${tracker["Join Diff"]}`);

    if (tooltipLines.length === 0) {
      return "";
    }

    const tooltipText = tooltipLines.join('\n');
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#a3a3a3" stroke-width="1.5"/><path stroke="#a3a3a3" stroke-linecap="round" stroke-width="1.5" d="M12 17v-6"/><circle cx="1" cy="1" r="1" fill="#a3a3a3" transform="matrix(1 0 0 -1 11 9)"/></svg>`;

    return `<span class="tracker-info-icon" data-tooltip="${tooltipText.replace(/"/g, '&quot;')}">${svgIcon}</span>`;
  }

  escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  async renderResults(result, mergeRoutes = "no", wantDestinationTracker = false) {
    // Ensure tracker data is loaded before rendering
    await this.ensureTrackersLoaded();

    this.wantDestinationTracker = wantDestinationTracker;
    this.routesGrid.innerHTML = "";

    // Clean up old tooltips
    document.querySelectorAll('.tracker-tooltip, .tracker-tooltip-arrow').forEach(el => el.remove());

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

      if (mergeRoutes === "yes") {
        routes = this.filterDominatedRoutes(routes);
        routes = this.filterDetours(routes);
        routes = this.mergeRoutesByPath(routes);
      } else if (mergeRoutes === "extreme") {
        routes = this.mergeRoutesByPath(routes, true);
        routes = this.filterStrictlyDominatedRoutes(routes);
        routes = this.filterDetours(routes);
      }

      this.resultsInfo.innerHTML = `Found ${routes.length} route${routes.length !== 1 ? "s" : ""
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

      // Initialize tooltips after rendering
      this.initializeTooltips();
    }
  }

  initializeTooltips() {
    const icons = document.querySelectorAll('.tracker-info-icon');
    icons.forEach(icon => {
      const tooltipText = icon.getAttribute('data-tooltip');
      if (!tooltipText) return;

      // Create actual tooltip element
      const tooltip = document.createElement('div');
      tooltip.className = 'tracker-tooltip';

      // Split by newlines and create formatted content
      const lines = tooltipText.split('\n');
      lines.forEach(line => {
        const parts = line.split(': ');
        if (parts.length === 2) {
          const lineDiv = document.createElement('div');
          lineDiv.className = 'tooltip-line';

          const label = document.createElement('strong');
          label.textContent = parts[0] + ': ';

          const value = document.createTextNode(parts[1]);

          lineDiv.appendChild(label);
          lineDiv.appendChild(value);
          tooltip.appendChild(lineDiv);
        } else {
          const lineDiv = document.createElement('div');
          lineDiv.textContent = line;
          tooltip.appendChild(lineDiv);
        }
      });

      // Add arrow
      const arrow = document.createElement('div');
      arrow.className = 'tracker-tooltip-arrow';

      // Append to body instead of icon for fixed positioning
      document.body.appendChild(tooltip);
      document.body.appendChild(arrow);

      // Position tooltip on hover
      const showTooltip = () => {
        const iconRect = icon.getBoundingClientRect();

        // Get tooltip dimensions (need to make it visible first to measure)
        tooltip.style.opacity = '0';
        tooltip.style.display = 'block';
        const tooltipRect = tooltip.getBoundingClientRect();

        // Check if there's space above
        const spaceAbove = iconRect.top;
        const spaceBelow = window.innerHeight - iconRect.bottom;
        const tooltipHeight = tooltipRect.height + 10; // Add padding

        let tooltipTop;
        let arrowTop;
        let positionBelow = false;

        // Position below if not enough space above
        if (spaceAbove < tooltipHeight && spaceBelow > tooltipHeight) {
          positionBelow = true;
          tooltipTop = iconRect.bottom + 10;
          arrowTop = iconRect.bottom + 4;
          arrow.style.borderTop = 'none';
          arrow.style.borderBottom = '6px solid #444';
        } else {
          // Position above (default)
          tooltipTop = iconRect.top - tooltipRect.height - 10;
          arrowTop = iconRect.top - 6;
          arrow.style.borderBottom = 'none';
          arrow.style.borderTop = '6px solid #444';
        }

        // Calculate horizontal position (centered on icon)
        let tooltipLeft = iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2);

        // Check if tooltip would go off right edge
        if (tooltipLeft + tooltipRect.width > window.innerWidth - 20) {
          tooltipLeft = window.innerWidth - tooltipRect.width - 20;
        }

        // Check if tooltip would go off left edge
        if (tooltipLeft < 20) {
          tooltipLeft = 20;
        }

        tooltip.style.left = tooltipLeft + 'px';
        tooltip.style.top = tooltipTop + 'px';

        // Position arrow (always points to icon center)
        const arrowLeft = iconRect.left + (iconRect.width / 2) - 6;
        arrow.style.left = arrowLeft + 'px';
        arrow.style.top = arrowTop + 'px';

        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        arrow.style.opacity = '1';
      };

      const hideTooltip = () => {
        tooltip.style.opacity = '0';
        arrow.style.opacity = '0';
        setTimeout(() => {
          tooltip.style.display = 'none';
        }, 200);
      };

      icon.addEventListener('mouseenter', showTooltip);
      icon.addEventListener('mouseleave', hideTooltip);

      // Store references for cleanup
      icon._tooltip = tooltip;
      icon._arrow = arrow;
    });
  }

  mergeRoutesByPath(routes) {
    const pathGroups = new Map();

    routes.forEach((route) => {
      const pathKey = route.path.slice(1).join("->");

      if (!pathGroups.has(pathKey)) {
        pathGroups.set(pathKey, []);
      }
      pathGroups.get(pathKey).push(route);
    });

    const mergedRoutes = [];

    pathGroups.forEach((group, pathKey) => {
      if (group.length > 1) {
        mergedRoutes.push({
          merged: true,
          sources: group.map((r) => r.source),
          path: group[0].path.slice(1),
          totalDays: Math.min(...group.map((r) => r.totalDays)),
          maxDays: Math.max(...group.map((r) => r.totalDays)),
          sourceRoutes: group,
        });
      } else {
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

        let i = 0;
        for (let j = 0; j < a.path.length && i < b.path.length; j++) {
          if (a.path[j] === b.path[i]) i++;
        }
        const bIsSubsequence = i === b.path.length;

        if (!bIsSubsequence) return false;

        const betterDays = b.totalDays <= a.totalDays;
        const betterJumps = b.path.length <= a.path.length;
        const strictlyBetter =
          b.totalDays < a.totalDays || b.path.length < a.path.length;

        return betterDays && betterJumps && strictlyBetter;
      });
    });
  }

  filterStrictlyDominatedRoutes(routes) {
    return routes.filter((a) => {
      return !routes.some((b) => {
        if (a === b) return false;
        if (a.target !== b.target) return false;

        const aSub = this.normalizePath(a);
        const bSub = this.normalizePath(b);

        let i = 0;
        for (let j = 0; j < aSub.length && i < bSub.length; j++) {
          if (aSub[j] === bSub[i]) i++;
        }

        const bIsSubsequence = i === bSub.length;
        if (!bIsSubsequence) return false;

        const betterDays = b.totalDays <= a.totalDays;
        const betterJumps = bSub.length <= aSub.length;
        const strictlyBetter =
          b.totalDays < a.totalDays || bSub.length < aSub.length;

        return betterDays && betterJumps && strictlyBetter;
      });
    });
  }

  normalizePath(route) {
    return route.path.slice(1);
  }

  createMergedRouteCard(mergedRoute, routeNumber) {
    const card = document.createElement("div");
    card.className = "route-card merged-route-card";

    const displayRoute = mergedRoute.path
      .map((node, index) => {
        const abbr = this.abbrList[node] || node;
        const isLast = index === mergedRoute.path.length - 1;
        const showFullName = isLast && !this.wantDestinationTracker;
        const trackerInfo = this.getTrackerInfoHTML(node);

        if (showFullName) {
          return `${abbr} (${node})${trackerInfo ? ' ' + trackerInfo : ''}`;
        }
        return `${abbr}${trackerInfo ? ' ' + trackerInfo : ''}`;
      })
      .join(" → ");

    const jumps = mergedRoute.path.length;
    const daysRange =
      mergedRoute.totalDays === mergedRoute.maxDays
        ? `${mergedRoute.totalDays} days`
        : `${mergedRoute.totalDays}-${mergedRoute.maxDays} days`;

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
              ${requirement &&
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
        <span>Route #${routeNumber} (${mergedRoute.sources.length
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

    const displayRoute = route.path
      .map((node, index) => {
        const abbr = this.abbrList[node] || node;
        const isLast = index === route.path.length - 1;
        const showFullName = isLast && !this.wantDestinationTracker;
        const trackerInfo = this.getTrackerInfoHTML(node);

        if (showFullName) {
          return `${abbr} (${node})${trackerInfo ? ' ' + trackerInfo : ''}`;
        }
        return `${abbr}${trackerInfo ? ' ' + trackerInfo : ''}`;
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
        <span>${jumps} jump${jumps !== 1 ? "s" : ""} · ${totalDays !== null ? totalDays + " days" : "Unknown days"
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