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
    this.missingTrackers = new Set();
  }

  static async create(routeInfo, unlockInviteClass, abbrList, getMaxDaysFn) {
    const renderer = new UIRenderer(routeInfo, unlockInviteClass, abbrList, getMaxDaysFn);
    await renderer.loadTrackersData();
    return renderer;
  }

  async loadTrackersData() {
    this.trackersData = new Map();

    // Add hardcoded trackers not in trackers_hd.json
    const hardcodedTrackers = {
      "IMT": {
        "Name": "Immortal-s",
        "Abbreviation": "IMT",
        "Type": "Forum",
        "Description": "IMT is a small, close-knit forum where experienced, helpful members discuss file sharing and a wide range of related topics, including news, technology, software, hardware, mobile, and security."
      },

      "CCC": {
        "Name": "Cryptichaven Comedy Club",
        "Abbreviation": "CCC",
        "Type": "Comedy",
        "Description": "Cryptichaven Comedy Club is a private tracker focused on comedy, offering stand-up content along with comedy films, TV, books, rare bootlegs, and hard-to-find material."
      },

      "LearnBits": {
        "Name": "LearnBits",
        "Abbreviation": "LearnBits",
        "Type": "Documentary/E-learning",
        "Description": "LearnBits is being rebuilt as a new home for documentary and e-learning content after ScienceHD’s closure, seeking active contributors to help restore, seed, and grow the site as it transitions from TBDev to a new Gazelle platform."
      },
      "TLF": {
        "Name": "TLFBits",
        "Abbreviation": "TLF",
        "Type": "Chinese Movies/TV",
        "Description": "TLFBits is a private tracker founded in 2010, affiliated with The Last Fantasy Forum, known for small HD movies and internal groups, offering global content with Chinese and English subtitles, an English interface, generous seeding bonuses, frequent freeleech, and easy account maintenance."
      },
      "PxHD": {
        "Name": "PixelHD",
        "Abbreviation": "PxHD",
        "Type": "Movies",
        "Description": "PixelHD is a small, well-maintained, ratio-free private movie tracker with a limited userbase, offering over 6,500 exclusive, high-quality custom encodes sourced only from full Blu-ray discs or untouched remuxes."
      },
      "OCD": {
        "Name": "OpenCD",
        "Abbreviation": "OCD",
        "Type": "Music",
        "Description": "OpenCD is a NexusPHP-based, ratio-enforced private music tracker focused on lossless music, mainly in Chinese, with IPv6 support and a community for music sharing and discussion."
      },
      "D3": {
        "Name": "D3Si",
        "Abbreviation": "D3",
        "Type": "Music",
        "Description": "D3Si is an ambitious South Asian (Indian) audio archive with an impressive library."
      },
      "FF": {
        "Name": "FunFile",
        "Abbreviation": "FF",
        "Type": "General",
        "Description": "This is a large ratio-based private tracker offering a wide range of new TV shows, movies, music, games, and 0Day content, with strong retention, fast speeds and a bonus system."
      },
      "TE": {
        "Name": "TheEmpire",
        "Abbreviation": "TE",
        "Type": "TV/Radio",
        "Description": "TheEmpire.click is a private tracker focused on Commonwealth TV and radio, and is part of the .click tracker family, formerly known as the .biz network."
      },
      "HD-O": {
        "Name": "HD-Only",
        "Abbreviation": "HD-O",
        "Type": "French Movies/TV",
        "Description": "HD-Only (HD-O) is a French private torrent tracker dedicated to HD movies and TV, serving as the internal tracker for multiple release groups."
      },
      "BHDTV": {
        "Name": "Bit-HDTV",
        "Abbreviation": "BHDTV",
        "Type": "Movies/TV/Audio",
        "Description": "Bit-HDTV is a long-standing HD-focused private tracker with 8K+ users and 320K+ torrents, offering movies, TV, and audio in various HD and 4K formats. It is ratio-based with seeding requirements, a bonus system for rewards and featured freeleech torrents."
      },
      "THD": {
        "Name": "TeamHD",
        "Abbreviation": "THD",
        "Type": "Russian Movies/TV",
        "Description": "TeamHD is a Russian private tracker specializing in HD video, run by experienced encoders, attracting former HDClub uploaders and users, with ongoing efforts to restore HDClub’s legacy content. Registration is by invite only."
      },
      "CG": {
        "Name": "Cinemageddon",
        "Abbreviation": "CG",
        "Type": "Movies",
        "Description": "Cinemageddon is a private movie tracker specializing in rare, old, and cult films, including low-budget and hard-to-find titles, with an active community, user uploads, and content available in HD and SSD formats."
      }
    };

    try {
      const response = await fetch("trackers_hd.json");
      if (response.ok) {
        const data = await response.json();
        data.trackers.forEach(tracker => {
          this.trackersData.set(tracker.Name, tracker);
        });
        console.log("Tracker data loaded:", this.trackersData.size, "trackers");
      }
    } catch (error) {
      console.warn("Could not load tracker info:", error);
    }

    // Always add hardcoded trackers (overrides if exists)
    Object.values(hardcodedTrackers).forEach(tracker => {
      this.trackersData.set(tracker.Name, tracker);
    });
  }

  async ensureTrackersLoaded() {
    let attempts = 0;
    while (!this.trackersData && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  getTrackerTypeColor(type) {
    if (!type || type === "-") return null;

    const normalizedType = type.toLowerCase().trim();

    // Handle combined Movie + TV first
    if (
      (normalizedType.includes('movie') || normalizedType.includes('movies')) &&
      normalizedType.includes('tv')
    ) {
      return '#730077'; // movies/tv color
    }

    const typeMap = [
      ['music', '#2d8f32'],
      ['radio', '#2563eb'],
      ['movie', '#a30000'],
      ['tv', '#2563eb'],
      ['general', '#47eeee'],
      ['e-learning', '#ea580c'],
      ['documentary', '#fda65f'],
      ['anime', '#7b43ff'],
      ['comics', '#10b981'],
      ['games', '#ff6b6b'],
      ['software', '#013b97'],
      ['ebooks', '#14a0b8'],
      ['comedy', '#d0ff00'],
      ['forum', '#ffd900'],
      ['podcast', '#ff4500'],
      ['sports', '#c7003c'],
    ];

    for (const [key, color] of typeMap) {
      if (normalizedType.includes(key)) {
        return color;
      }
    }

    return null;
  }

  getTrackerData(trackerName) {
    if (!this.trackersData) {
      return null;
    }

    // Try exact match first
    let tracker = this.trackersData.get(trackerName);
    if (tracker) return tracker;

    // Try case-insensitive match
    const lowerName = trackerName.toLowerCase();
    for (const [key, value] of this.trackersData.entries()) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }

    // Try partial match (remove spaces and special chars)
    const searchTerm = trackerName.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '');
    for (const [key, value] of this.trackersData.entries()) {
      const trackerKey = key.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '');
      if (trackerKey.includes(searchTerm) || searchTerm.includes(trackerKey)) {
        return value;
      }
    }

    // Try matching by abbreviation
    for (const [key, value] of this.trackersData.entries()) {
      let aliases = [];
      if (value.Abbreviation && typeof value.Abbreviation === "string") {
        aliases = value.Abbreviation === "-" ? [] : value.Abbreviation.split(',').map(a => a.trim().toLowerCase());
      } else if (Array.isArray(value.Abbreviation)) {
        aliases = value.Abbreviation.map(a => a.toLowerCase());
      }

      if (aliases.includes(lowerName)) {
        return value;
      }
    }

    return null;
  }

  getTrackerInfoHTML(trackerName) {
    if (!this.trackersData) {
      return "";
    }

    let tracker = this.trackersData.get(trackerName);

    if (!tracker) {
      const lowerName = trackerName.toLowerCase();
      for (const [key, value] of this.trackersData.entries()) {
        if (key.toLowerCase() === lowerName) {
          tracker = value;
          break;
        }
      }
    }

    if (!tracker) {
      const searchTerm = trackerName.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '');
      for (const [key, value] of this.trackersData.entries()) {
        const trackerKey = key.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '');
        if (trackerKey.includes(searchTerm) || searchTerm.includes(trackerKey)) {
          tracker = value;
          break;
        }
      }
    }

    if (!tracker) {
      const searchAcronym = trackerName
        .split(/\s+/)
        .map(t => t[0])
        .join('')
        .toLowerCase();

      for (const [key, value] of this.trackersData.entries()) {
        let aliases = [];
        if (value.Abbreviation && typeof value.Abbreviation === "string") {
          aliases = value.Abbreviation === "-" ? [] : value.Abbreviation.split(',').map(a => a.trim().toLowerCase());
        } else if (Array.isArray(value.Abbreviation)) {
          aliases = value.Abbreviation.map(a => a.toLowerCase());
        }

        if (aliases.includes(searchAcronym)) {
          tracker = value;
          break;
        }
      }
    }

    if (!tracker) {
      if (!this.missingTrackers.has(trackerName)) {
        this.missingTrackers.add(trackerName);
        console.warn(`Tracker info not found for: ${trackerName}`);
      }
      return "";
    }

    let abbrDisplay = null;

    if (tracker.Abbreviation) {
      if (Array.isArray(tracker.Abbreviation)) {
        if (tracker.Abbreviation.length > 0) {
          abbrDisplay = tracker.Abbreviation.join(", ");
        }
      } else if (
        typeof tracker.Abbreviation === "string" &&
        tracker.Abbreviation.trim() !== "-" &&
        tracker.Abbreviation.trim() !== ""
      ) {
        abbrDisplay = tracker.Abbreviation.trim();
      }
    }

    const tooltipLines = [];

    tooltipLines.push(`Name: ${tracker.Name}`);

    if (abbrDisplay) {
      tooltipLines.push(`Abbr: ${abbrDisplay}`);
    }

    if (tracker.Type && tracker.Type !== "-") tooltipLines.push(`Type: ${tracker.Type}`);
    if (tracker.Codebase && tracker.Codebase !== "-") tooltipLines.push(`Codebase: ${tracker.Codebase}`);
    if (tracker.Users && tracker.Users !== "-") tooltipLines.push(`Users: ${tracker.Users}`);
    if (tracker.Torrents && tracker.Torrents !== "-") tooltipLines.push(`Torrents: ${tracker.Torrents}`);
    if (tracker.Peers && tracker.Peers !== "-") tooltipLines.push(`Peers: ${tracker.Peers}`);
    if (tracker.Ratio === "Yes" && tracker["Ratio Diff"] && tracker["Ratio Diff"] !== "-") {
      tooltipLines.push(`Ratio Difficulty: ${tracker["Ratio Diff"]}`);
    }
    if (tracker.Freeleech === "Yes") tooltipLines.push(`Freeleech: Available`);
    if (tracker.Points === "Yes") tooltipLines.push(`Points System: Yes`);
    if (tracker["Hit & Run"] === "Yes") tooltipLines.push(`Hit & Run: Yes`);
    if (tracker.Birthdate && tracker.Birthdate !== "-") tooltipLines.push(`Established: ${tracker.Birthdate}`);
    if (tracker.Join && tracker.Join !== "-") tooltipLines.push(`Join Method: ${tracker.Join}`);
    if (tracker["Join Diff"] && tracker["Join Diff"] !== "-") tooltipLines.push(`Join Difficulty: ${tracker["Join Diff"]}`);
    if (tracker.Description) tooltipLines.push(`\n${tracker.Description}`);

    const tooltipText = tooltipLines.join('\n');
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#a3a3a3" stroke-width="1.5"/><path stroke="#a3a3a3" stroke-linecap="round" stroke-width="1.5" d="M12 17v-6"/><circle cx="1" cy="1" r="1" fill="#a3a3a3" transform="matrix(1 0 0 -1 11 9)"/></svg>`;

    return `<span class="tracker-info-icon" data-tooltip="${tooltipText.replace(/"/g, '&quot;')}">${svgIcon}</span>`;
  }

  escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  async renderResults(result, mergeRoutes = "no", color = "default", customColor = null, wantDestinationTracker = false) {
    await this.ensureTrackersLoaded();

    this.wantDestinationTracker = wantDestinationTracker;
    this.customColor = customColor;
    this.routesGrid.innerHTML = "";

    document.querySelectorAll('.tracker-tooltip, .tracker-tooltip-arrow').forEach(el => el.remove());

    if (result.status === "empty") {
      this.resultsInfo.innerHTML = "";
      this.body.classList.remove("has-results");
      return;
    }

    if (["same", "not_found", "no_routes"].includes(result.status)) {
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

      this.resultsInfo.innerHTML = `Found ${routes.length} route${routes.length !== 1 ? "s" : ""}`;
      this.body.classList.add("has-results");

      const fragment = document.createDocumentFragment();
      routes.forEach((route, index) => {
        fragment.appendChild(
          route.merged
            ? this.createMergedRouteCard(route, color, index + 1)
            : this.createRouteCard(route, color, index + 1)
        );
      });
      this.routesGrid.appendChild(fragment);

      this.initializeTooltips();
    }
  }

  initializeTooltips() {
    const icons = document.querySelectorAll('.tracker-info-icon');
    icons.forEach(icon => {
      const tooltipText = icon.getAttribute('data-tooltip');
      if (!tooltipText) return;

      const tooltip = document.createElement('div');
      tooltip.className = 'tracker-tooltip';

      tooltipText.split('\n').forEach(line => {
        const parts = line.split(': ');
        const lineDiv = document.createElement('div');

        if (parts.length === 2) {
          const label = document.createElement('strong');
          label.textContent = parts[0] + ': ';
          lineDiv.className = 'tooltip-line';
          lineDiv.appendChild(label);
          lineDiv.appendChild(document.createTextNode(parts[1]));
        } else {
          lineDiv.textContent = line;
        }

        tooltip.appendChild(lineDiv);
      });

      const arrow = document.createElement('div');
      arrow.className = 'tracker-tooltip-arrow';

      document.body.appendChild(tooltip);
      document.body.appendChild(arrow);

      const showTooltip = () => {
        const iconRect = icon.getBoundingClientRect();

        tooltip.style.opacity = '0';
        tooltip.style.display = 'block';
        const tooltipRect = tooltip.getBoundingClientRect();

        const spaceAbove = iconRect.top;
        const spaceBelow = window.innerHeight - iconRect.bottom;
        const tooltipHeight = tooltipRect.height + 10;

        let tooltipTop;
        let arrowTop;

        if (spaceAbove < tooltipHeight && spaceBelow > tooltipHeight) {
          tooltipTop = iconRect.bottom + 10;
          arrowTop = iconRect.bottom + 4;
          arrow.style.borderTop = 'none';
          arrow.style.borderBottom = '6px solid #444';
        } else {
          tooltipTop = iconRect.top - tooltipRect.height - 10;
          arrowTop = iconRect.top - 6;
          arrow.style.borderBottom = 'none';
          arrow.style.borderTop = '6px solid #444';
        }

        let tooltipLeft = iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2);

        if (tooltipLeft + tooltipRect.width > window.innerWidth - 20) {
          tooltipLeft = window.innerWidth - tooltipRect.width - 20;
        }
        if (tooltipLeft < 20) {
          tooltipLeft = 20;
        }

        tooltip.style.left = tooltipLeft + 'px';
        tooltip.style.top = tooltipTop + 'px';

        arrow.style.left = iconRect.left + (iconRect.width / 2) - 6 + 'px';
        arrow.style.top = arrowTop + 'px';

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

      icon._tooltip = tooltip;
      icon._arrow = arrow;
    });
  }

  mergeRoutesByPath(routes) {
    const pathGroups = new Map();

    routes.forEach(route => {
      const pathKey = route.path.slice(1).join("-");
      if (!pathGroups.has(pathKey)) pathGroups.set(pathKey, []);
      pathGroups.get(pathKey).push(route);
    });

    const mergedRoutes = [];

    pathGroups.forEach(group => {
      if (group.length > 1) {
        mergedRoutes.push({
          merged: true,
          sources: group.map(r => r.source),
          path: group[0].path.slice(1),
          totalDays: Math.min(...group.map(r => r.totalDays)),
          maxDays: Math.max(...group.map(r => r.totalDays)),
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
    return routes.map(route => {
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
    return routes.filter(a => {
      return !routes.some(b => {
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
        const strictlyBetter = b.totalDays < a.totalDays || b.path.length < a.path.length;

        return betterDays && betterJumps && strictlyBetter;
      });
    });
  }

  filterStrictlyDominatedRoutes(routes) {
    if (!routes || routes.length === 0) return routes;

    // Extract target from both merged and non-merged routes
    const getTarget = (route) => {
      if (route.merged) {
        return route.path[route.path.length - 1];
      }
      return route.target || route.path[route.path.length - 1];
    };

    // Get path for comparison (handle merged routes)
    const getPath = (route) => {
      if (route.merged) {
        return route.path;
      }
      return route.path.slice(1); // Remove source for non-merged routes
    };

    // Group routes by target
    const grouped = new Map();
    for (const r of routes) {
      const target = getTarget(r);
      if (!grouped.has(target)) grouped.set(target, []);
      grouped.get(target).push(r);
    }

    return routes.filter(a => {
      const target = getTarget(a);
      const group = grouped.get(target);

      // If this is the only route to that target, keep it
      if (group.length === 1) return true;

      const aPath = getPath(a);

      // Check if there's a direct route (single jump) to this target
      const hasDirectRoute = group.some(r => {
        const rPath = getPath(r);
        return rPath.length === 1; // Direct route has only the destination
      });
      
      // If a direct route exists and this route is indirect, exclude it
      if (hasDirectRoute && aPath.length > 1) return false;

      // Compare against all other routes to same target
      return !group.some(b => {
        if (a === b) return false;

        const bPath = getPath(b);

        // Check if b is a subsequence of a
        let i = 0;
        for (let j = 0; j < aPath.length && i < bPath.length; j++) {
          if (aPath[j] === bPath[i]) i++;
        }
        const bIsSubsequence = i === bPath.length;
        if (!bIsSubsequence) return false;

        // Dominance conditions
        const betterDays = b.totalDays <= a.totalDays;
        const betterJumps = bPath.length <= aPath.length;
        const strictlyBetter =
          b.totalDays < a.totalDays ||
          bPath.length < aPath.length;

        return betterDays && betterJumps && strictlyBetter;
      });
    });
  }

  normalizePath(route) {
    return route.path.slice(1);
  }

  createMergedRouteCard(mergedRoute, color, routeNumber) {
    const card = document.createElement("div");
    card.className = "route-card merged-route-card";

    const displayRoute = mergedRoute.path
      .map((node, index) => {
        const abbr = this.abbrList[node] || node;
        const isLast = index === mergedRoute.path.length - 1;
        const showFullName = isLast && !this.wantDestinationTracker;
        const trackerInfo = this.getTrackerInfoHTML(node);

        // Get tracker type and color for destination
        // Get tracker type and color for destination
        let colorStyle = '';
        if (color === "custom" && this.customColor) {
          if (isLast) {
            colorStyle = ` style="color: ${this.customColor}; font-weight: 600;"`;
          }
        }
        else if (color === "typebased") {
          if (isLast) {
            const tracker = this.getTrackerData(node);
            if (tracker) {
              const typeColor = this.getTrackerTypeColor(tracker.Type);
              if (typeColor) {
                colorStyle = ` style="color: ${typeColor}; font-weight: 600;"`;
              }
            }
          }
        }

        return showFullName
          ? `<span${colorStyle}>${abbr} (${node})</span>${trackerInfo ? ' ' + trackerInfo : ''}`
          : `<span${colorStyle}>${abbr}</span>${trackerInfo ? ' ' + trackerInfo : ''}`;
      })
      .join(" → ");

    const jumps = mergedRoute.path.length;
    const daysRange =
      mergedRoute.totalDays === mergedRoute.maxDays
        ? `${mergedRoute.totalDays} days`
        : `${mergedRoute.totalDays}-${mergedRoute.maxDays} days`;

    let sourcesHTML = `<div class="merged-sources">
    <div class="merged-sources-header">Starting trackers:</div>`;

    mergedRoute.sourceRoutes.forEach(sourceRoute => {
      const firstNode = sourceRoute.source;
      const secondNode = sourceRoute.path[1];

      if (this.routeInfo[firstNode] && this.routeInfo[firstNode][secondNode]) {
        const maxDaysValue = this.getMaxDays(firstNode, secondNode, this.routeInfo, this.unlockInviteClass);
        const routeData = this.routeInfo[firstNode][secondNode];
        const requirement = routeData.reqs || "";
        const lastActivity = routeData.updated || "Unknown";
        const activeStatus = routeData.active || "Unknown";

        let statusClass = "status-unknown";
        if (activeStatus.toLowerCase() === "yes") statusClass = "status-recruiting";
        if (activeStatus.toLowerCase() === "no") statusClass = "status-closed";

        const statusText =
          activeStatus === "Yes" ? "Recruiting" :
            activeStatus === "No" ? "Closed" : "Unknown";

        const daysDisplay = maxDaysValue === null ? "Unknown" : `${maxDaysValue}d`;

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
              </div>`
            : ""
          }
            <div class="route-step-detail">
              <div class="route-step-label">Last checked:</div>
              <div class="route-step-value">${lastActivity}</div>
            </div>
          </div>
        </div>`;
      }
    });

    sourcesHTML += "</div>";

    let stepsHTML = "";
    for (let i = 0; i < mergedRoute.path.length - 1; i++) {
      const node = mergedRoute.path[i];
      const nextNode = mergedRoute.path[i + 1];

      if (this.routeInfo[node] && this.routeInfo[node][nextNode]) {
        const maxDaysValue = this.getMaxDays(node, nextNode, this.routeInfo, this.unlockInviteClass);
        const routeData = this.routeInfo[node][nextNode];
        const requirement = routeData.reqs || "";
        const lastActivity = routeData.updated || "Unknown";
        const activeStatus = routeData.active || "Unknown";

        let statusClass = "status-unknown";
        if (activeStatus.toLowerCase() === "yes") statusClass = "status-recruiting";
        if (activeStatus.toLowerCase() === "no") statusClass = "status-closed";

        const statusText =
          activeStatus === "Yes" ? "Recruiting" :
            activeStatus === "No" ? "Closed" : "Unknown";

        const daysDisplay = maxDaysValue === null ? "Unknown" : `${maxDaysValue}d`;

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
      <span>Route #${routeNumber} (${mergedRoute.sources.length} sources)</span>
      <span>${jumps} jump${jumps !== 1 ? "s" : ""} · ${daysRange}</span>
    </div>
    ${sourcesHTML}
    ${stepsHTML}
  `;

    return card;
  }

  createRouteCard(route, color, routeNumber) {
    const card = document.createElement("div");
    card.className = "route-card";

    const displayRoute = route.path
      .map((node, index) => {
        const abbr = this.abbrList[node] || node;
        const isLast = index === route.path.length - 1;
        const showFullName = isLast && !this.wantDestinationTracker;
        const trackerInfo = this.getTrackerInfoHTML(node);

        // Get tracker type and color for destination
        // Get tracker type and color for destination
        let colorStyle = '';
        if (color === "custom" && this.customColor) {
          if (isLast) {
            colorStyle = ` style="color: ${this.customColor}; font-weight: 600;"`;
          }
        }
        else if (color === "typebased") {
          if (isLast) {
            const tracker = this.getTrackerData(node);
            if (tracker) {
              const typeColor = this.getTrackerTypeColor(tracker.Type);
              if (typeColor) {
                colorStyle = ` style="color: ${typeColor}; font-weight: 600;"`;
              }
            }
          }
        }

        return showFullName
          ? `<span${colorStyle}>${abbr} (${node})</span>${trackerInfo ? ' ' + trackerInfo : ''}`
          : `<span${colorStyle}>${abbr}</span>${trackerInfo ? ' ' + trackerInfo : ''}`;
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
        const maxDaysValue = this.getMaxDays(node, nextNode, this.routeInfo, this.unlockInviteClass);
        const routeData = this.routeInfo[node][nextNode];
        const requirement = routeData.reqs || "";
        const lastActivity = routeData.updated || "Unknown";
        const activeStatus = routeData.active || "Unknown";

        let statusClass = "status-unknown";
        if (activeStatus.toLowerCase() === "yes") statusClass = "status-recruiting";
        if (activeStatus.toLowerCase() === "no") statusClass = "status-closed";

        const statusText =
          activeStatus === "Yes" ? "Recruiting" :
            activeStatus === "No" ? "Closed" : "Unknown";

        const daysDisplay = maxDaysValue === null ? "Unknown" : `${maxDaysValue}d`;

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
