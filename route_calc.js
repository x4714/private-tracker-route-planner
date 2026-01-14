// Route calculation logic using BFS

class RouteCalculator {
  constructor(routeInfo, unlockInviteClass, allTrackers, getAbbrFn) {
    this.routeInfo = routeInfo;
    this.unlockInviteClass = unlockInviteClass;
    this.allTrackers = allTrackers;
    this.getAbbr = getAbbrFn;
  }

  calculate(sourceInputs, end, maxJumps, maxDays) {
    if (sourceInputs.length === 0 && !end) {
      return { status: 'empty', routes: [] };
    }

    if (sourceInputs.length === 1 && end && sourceInputs[0] === end) {
      return { status: 'same', message: 'One account per lifetime!', routes: [] };
    }

    let startNodes = [];
    const allTrackerKeys = Object.keys(this.routeInfo);

    if (sourceInputs.length > 0) {
      startNodes = allTrackerKeys.filter(tracker => {
        const trackerLower = tracker.toLowerCase();
        const trackerAbbr = this.getAbbr(tracker).toLowerCase();
        
        return sourceInputs.some(input => {
          const inputLower = input.toLowerCase();
          
          const isStrictInput = this.allTrackers.some(validT => 
            validT.toLowerCase() === inputLower || 
            this.getAbbr(validT).toLowerCase() === inputLower
          );
          
          if (isStrictInput) {
            return trackerLower === inputLower || trackerAbbr === inputLower;
          } else {
            return trackerLower.includes(inputLower) || trackerAbbr === inputLower;
          }
        });
      });
    } else if (end) {
      startNodes = allTrackerKeys;
    }

    if (startNodes.length === 0 && sourceInputs.length > 0) {
      return { 
        status: 'not_found', 
        message: `No trackers found matching: ${sourceInputs.join(', ')}`,
        routes: [] 
      };
    }

    const isStrictTarget = end && this.allTrackers.some(t => 
      t.toLowerCase() === end.toLowerCase() || 
      this.getAbbr(t).toLowerCase() === end.toLowerCase()
    );

    let allRoutes = this._findRoutes(startNodes, end, isStrictTarget, maxJumps, maxDays);

    if (allRoutes.length === 0) {
      return { status: 'no_routes', message: 'No routes found', routes: [] };
    }

    return { status: 'success', routes: allRoutes };
  }

  _findRoutes(startNodes, end, isStrictTarget, maxJumps, maxDays) {
    let allRoutes = [];
    const startNodeSet = new Set(startNodes);
    const queue = [];

    startNodes.forEach(start => {
      queue.push({
        source: start,
        current: start,
        path: [start],
        totalDays: 0
      });
    });

    while (queue.length > 0) {
      const { source, current, path, totalDays } = queue.shift();

      if (path.length > 1) {
        let isTargetMatch = true;
        
        if (end) {
          const currentLower = current.toLowerCase();
          const currentAbbr = this.getAbbr(current).toLowerCase();
          const endLower = end.toLowerCase();
          
          if (isStrictTarget) {
            isTargetMatch = currentLower === endLower || currentAbbr === endLower;
          } else {
            isTargetMatch = currentLower.includes(endLower) || currentAbbr.includes(endLower);
          }
        }
        
        if (isTargetMatch) {
          if (totalDays <= maxDays) {
            allRoutes.push({
              source,
              target: current,
              path,
              totalDays
            });
          }
        }
      }

      if (path.length > maxJumps) continue;

      const neighbors = this.routeInfo[current];
      if (neighbors) {
        Object.entries(neighbors).forEach(([nextTracker, details]) => {
          if (startNodeSet.has(nextTracker) && nextTracker.toLowerCase() !== end?.toLowerCase()) {
            return;
          }

          if (!path.includes(nextTracker)) {
            const edgeDays = details.days;
            const forumReq = this.unlockInviteClass[current];
            const forumDays = forumReq ? forumReq[0] : 0;
            
            let stepDays = null;
            if (edgeDays !== null) {
              stepDays = Math.max(edgeDays, forumDays || 0);
            }
            
            const nextTotalDays = (totalDays === null || stepDays === null) 
              ? totalDays
              : totalDays + stepDays;
            
            if (maxDays !== null && nextTotalDays !== null && nextTotalDays > maxDays) return;

            queue.push({
              source,
              current: nextTracker,
              path: [...path, nextTracker],
              totalDays: nextTotalDays
            });
          }
        });
      }
    }

    return this._removeDuplicates(allRoutes);
  }

  _removeDuplicates(routes) {
    const uniqueRoutes = [];
    const seenPaths = new Set();
    
    routes.forEach(route => {
      const pathSignature = route.path.join('->');
      if (!seenPaths.has(pathSignature)) {
        seenPaths.add(pathSignature);
        uniqueRoutes.push(route);
      }
    });

    return uniqueRoutes;
  }

  sortRoutes(routes, sortOption) {
    if (sortOption === 'fastest') {
      routes.sort((a, b) => {
        if (a.totalDays !== b.totalDays) return a.totalDays - b.totalDays;
        return a.path.length - b.path.length;
      });
    } else if (sortOption === 'fewestJumps') {
      routes.sort((a, b) => {
        if (a.path.length !== b.path.length) return a.path.length - b.path.length;
        return a.totalDays - b.totalDays;
      });
    }
    return routes;
  }
}