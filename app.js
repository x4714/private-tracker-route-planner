// Main application entry point

// Handle extension messages to prevent console errors
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse({});
    return false;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Initialize UI immediately before loading data
  const sourceInput = document.getElementById("sourceInput");
  const targetInput = document.getElementById("targetInput");
  const sourceDropdown = document.getElementById("sourceDropdown");
  const targetDropdown = document.getElementById("targetDropdown");
  const maxJumpsInput = document.getElementById("maxJumpsInput");
  const maxJumpsRadios = document.querySelectorAll("#maxJumpsRadios input");
  const maxDaysInput = document.getElementById("maxDaysInput");
  const maxDaysRadios = document.querySelectorAll("#maxDaysRadios input");
  const sortRadios = document.querySelectorAll("#sortRadios input");
  const mergeRadios = document.querySelectorAll("#mergeRoutesRadios input");
  const colorSchemeRadios = document.querySelectorAll("#colorSchemeRadios input");
  const customColorPicker = document.getElementById("customColorPicker");
  const colorPickerInput = document.getElementById("colorPicker");

  // Debounce timers
  let sourceDebounceTimer;
  let targetDebounceTimer;
  let previousSourceValue = "";
  let previousTargetValue = "";

  // Calculation state tracking
  let currentCalculationId = 0;
  let lastCalculationId = -1;
  let lastRenderOperationId = 0;

  // Load settings from localStorage
  let maxJumps = parseInt(localStorage.getItem("maxJumps"), 10);
  let maxDays = parseInt(localStorage.getItem("maxDays"), 10);
  let sortOptionValue = localStorage.getItem("sortOption");
  let savedMerge = localStorage.getItem("mergeRoutes") || "no";
  let mergeRoutes = savedMerge;
  let color = localStorage.getItem("colorScheme") || "default";

  const urlParams = new URLSearchParams(window.location.search);
  const fromParam = urlParams.get("from");
  const toParam = urlParams.get("to");
  const jumpsParam = parseInt(urlParams.get("jumps"), 10);
  const daysParam = parseInt(urlParams.get("days"), 10);
  const sortParam = urlParams.get("sort");
  const mergeParam = urlParams.get("merge");
  const colorParam = urlParams.get("color");

  if (fromParam) sourceInput.value = fromParam;
  if (toParam) targetInput.value = toParam;
  if (!isNaN(jumpsParam)) maxJumps = jumpsParam;
  if (!isNaN(daysParam)) maxDays = daysParam;
  if (sortParam) sortOptionValue = sortParam;
  if (mergeParam !== null) mergeRoutes = mergeParam;
  if (colorParam) color = colorParam;

  if (isNaN(maxJumps)) maxJumps = 4;
  if (isNaN(maxDays)) maxDays = 720;
  if (!sortOptionValue) sortOptionValue = "fastest";

  // Load data asynchronously after UI is ready
  loadDataAndInitialize();

  async function loadDataAndInitialize() {
    let data;
    try {
      const response = await fetch("trackers.json");
      if (!response.ok) throw new Error("File not found");
      data = await response.json();
    } catch (error) {
      console.log(
        "%c" + "Data missing!",
        "color: #ff0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;"
      );
      return;
    }

    const { routeInfo, unlockInviteClass, abbrList } = data;

    // Prepare tracker list
    const allTrackers = Array.from(
      new Set(
        Object.keys(routeInfo).flatMap((startKey) => [
          startKey,
          ...Object.keys(routeInfo[startKey]),
        ])
      )
    ).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Initialize components
    const getAbbrFn = (name) => getAbbr(name, abbrList);

    const autocomplete = new Autocomplete(allTrackers, abbrList);
    const routeCalculator = new RouteCalculator(
      routeInfo,
      unlockInviteClass,
      allTrackers,
      getAbbrFn
    );
    const uiRenderer = await UIRenderer.create(
      routeInfo,
      unlockInviteClass,
      abbrList,
      getMaxDays
    );

    await uiRenderer.ensureTrackersLoaded();

    // Safe wrapper for renderResults that tracks render operations
    async function safeRenderResults(result, calculationId) {
      // Assign a unique ID to this render operation
      lastRenderOperationId++;
      const renderOperationId = lastRenderOperationId;

      console.log(`[RENDER] Starting render #${renderOperationId} for calculation #${calculationId}, current calc ID: ${currentCalculationId}`);

      // Return early if a newer calculation/render has been initiated
      if (calculationId !== null && calculationId !== currentCalculationId) {
        console.log(`[RENDER] CANCELLED render #${renderOperationId} - calculation ${calculationId} is stale (current: ${currentCalculationId})`);
        return;
      }

      // Store the render operation ID on UIRenderer so it can validate during batching
      uiRenderer.currentRenderOperationId = renderOperationId;
      
      // Render the results
      console.log(`[RENDER] Actually rendering results for operation #${renderOperationId}`, result.status);
      await uiRenderer.renderResults(result, mergeRoutes, color, color === "custom" ? colorPickerInput.value : null);

      // Check one final time after rendering to ensure this is still the latest operation
      if (renderOperationId !== lastRenderOperationId || (calculationId !== null && calculationId !== currentCalculationId)) {
        console.log(`[RENDER] ABORTED render #${renderOperationId} after rendering - newer operation detected`);
        return;
      }

      console.log(`[RENDER] Completed render #${renderOperationId} successfully`);
    }

    // Calculate and render routes
    async function calculateRoute() {
      const startRaw = sourceInput.value.trim();
      const endRaw = targetInput.value.trim();

      console.log(`[CALC] calculateRoute called with: source="${startRaw}", target="${endRaw}"`);

      // Return early if both inputs are empty - don't calculate or show loading
      if (!startRaw && !endRaw) {
        console.log(`[CALC] Both inputs empty, incrementing calculation ID`);
        // Cancel any pending calculations
        currentCalculationId++;
        console.log(`[CALC] New calculation ID: ${currentCalculationId}`);
        document.getElementById("loadingIndicator").style.display = "none";
        await safeRenderResults({ status: "empty" }, null);
        return;
      }

      // Generate a unique ID for this calculation
      currentCalculationId++;
      const calculationId = currentCalculationId;

      console.log(`[CALC] Starting new calculation #${calculationId}`);

      document.getElementById("loadingIndicator").style.display = "block";

      await new Promise((resolve) => setTimeout(resolve, 0)); // allow UI to update

      // Check if this calculation was cancelled while waiting
      if (calculationId !== currentCalculationId) {
        console.log(`[CALC] CANCELLED calculation #${calculationId} - newer calculation started`);
        document.getElementById("loadingIndicator").style.display = "none";
        return;
      }

      const sourceInputs = startRaw
        ? startRaw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s)
        : [];
      const targetInputs = endRaw
        ? endRaw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s)
        : [];

      console.log(`[CALC] Processing calculation #${calculationId}: ${sourceInputs.length} sources, ${targetInputs.length} targets`);

      // Wrap heavy calculation in requestAnimationFrame to keep UI responsive
      const result = await new Promise((resolve) => {
        requestAnimationFrame(() => {
          // Check if this calculation was cancelled while waiting for next frame
          if (calculationId !== currentCalculationId) {
            console.log(`[CALC] CANCELLED calculation #${calculationId} in RAF - newer calculation started`);
            resolve(null);
            return;
          }

          console.log(`[CALC] Actually computing routes for calculation #${calculationId}`);
          const calcResult = routeCalculator.calculate(
            sourceInputs,
            targetInputs,
            maxJumps,
            maxDays
          );

          if (calcResult.status === "success") {
            const selectedSort =
              Array.from(sortRadios).find((r) => r.checked)?.value || "fastest";
            routeCalculator.sortRoutes(calcResult.routes, selectedSort);
          }

          console.log(`[CALC] Computed result for calculation #${calculationId}:`, calcResult.status);
          resolve(calcResult);
        });
      });

      // Check one final time before rendering
      if (calculationId !== currentCalculationId || result === null) {
        console.log(`[CALC] ABANDONED calculation #${calculationId} - will not render (current ID: ${currentCalculationId})`);
        document.getElementById("loadingIndicator").style.display = "none";
        return;
      }

      console.log(`[CALC] Rendering results for calculation #${calculationId}`);
      await safeRenderResults(result, calculationId);
      document.getElementById("loadingIndicator").style.display = "none";
    }

    // Handle input activity
    const handleInputActivity = () => {
      const hasValue =
        sourceInput.value.trim().length > 0 ||
        targetInput.value.trim().length > 0;
      uiRenderer.updateSearchState(hasValue);
      updateURL(
        sourceInput.value,
        targetInput.value,
        maxJumps,
        maxDays,
        sortRadios,
        mergeRoutes,
        color
      );
    };

    // Autocomplete callback
    const onAutocompleteSelect = () => {
      console.log(`[AUTOCOMPLETE] Item selected: source="${sourceInput.value}", target="${targetInput.value}"`);
      console.log(`[AUTOCOMPLETE] Triggering calculation (current calculation ID: ${currentCalculationId})`);
      calculateRoute();
      handleInputActivity();
      updateURL(
        sourceInput.value,
        targetInput.value,
        maxJumps,
        maxDays,
        sortRadios,
        mergeRoutes,
        color
      );
    };

    // Setup autocomplete
    autocomplete.setupEventListeners(
      sourceInput,
      sourceDropdown,
      targetInput,
      targetDropdown,
      onAutocompleteSelect
    );

    sourceInput.addEventListener("input", (e) => {
      clearTimeout(sourceDebounceTimer);
      const value = e.target.value;
      const hasCommaAdded = value.includes(",") && !previousSourceValue.includes(",");
      previousSourceValue = value;

      console.log(`[INPUT] sourceInput changed to: "${value}"`);

      // If clearing input, cancel any pending calculations and show empty state
      if (!value.trim() && !targetInput.value.trim()) {
        console.log(`[INPUT] Both inputs cleared, cancelling calculations`);
        currentCalculationId++;
        console.log(`[INPUT] New calculation ID: ${currentCalculationId}`);
        document.getElementById("loadingIndicator").style.display = "none";
        safeRenderResults({ status: "empty" }, null);
        handleInputActivity();
        updateURL(
          sourceInput.value,
          targetInput.value,
          maxJumps,
          maxDays,
          sortRadios,
          mergeRoutes,
          color
        );
        return;
      }

      // Show autocomplete immediately for user suggestions
      autocomplete.show(
        sourceInput,
        sourceDropdown,
        value,
        onAutocompleteSelect
      );

      // But only calculate routes on comma or after 1 second
      sourceDebounceTimer = setTimeout(() => {
        console.log(`[INPUT] sourceInput debounce timeout fired`);
        handleInputActivity();
        // Only calculate if at least one input has a value
        if (sourceInput.value.trim() || targetInput.value.trim()) {
          console.log(`[INPUT] Triggering calculation from sourceInput debounce`);
          calculateRoute();
        }
        updateURL(
          sourceInput.value,
          targetInput.value,
          maxJumps,
          maxDays,
          sortRadios,
          mergeRoutes,
          color
        );
      }, hasCommaAdded ? 0 : 1000);
    }, { passive: true });

    targetInput.addEventListener("input", (e) => {
      clearTimeout(targetDebounceTimer);
      const value = e.target.value;
      const hasCommaAdded = value.includes(",") && !previousTargetValue.includes(",");
      previousTargetValue = value;

      console.log(`[INPUT] targetInput changed to: "${value}"`);

      // If clearing input, cancel any pending calculations and show empty state
      if (!value.trim() && !sourceInput.value.trim()) {
        console.log(`[INPUT] Both inputs cleared, cancelling calculations`);
        currentCalculationId++;
        console.log(`[INPUT] New calculation ID: ${currentCalculationId}`);
        document.getElementById("loadingIndicator").style.display = "none";
        safeRenderResults({ status: "empty" }, null);
        handleInputActivity();
        updateURL(
          sourceInput.value,
          targetInput.value,
          maxJumps,
          maxDays,
          sortRadios,
          mergeRoutes,
          color
        );
        return;
      }

      // Show autocomplete immediately for user suggestions
      autocomplete.show(
        targetInput,
        targetDropdown,
        value,
        onAutocompleteSelect
      );

      // But only calculate routes on comma or after 1 second
      targetDebounceTimer = setTimeout(() => {
        console.log(`[INPUT] targetInput debounce timeout fired`);
        handleInputActivity();
        // Only calculate if at least one input has a value
        if (sourceInput.value.trim() || targetInput.value.trim()) {
          console.log(`[INPUT] Triggering calculation from targetInput debounce`);
          calculateRoute();
        }
        updateURL(
          sourceInput.value,
          targetInput.value,
          maxJumps,
          maxDays,
          sortRadios,
          mergeRoutes,
          color
        );
      }, hasCommaAdded ? 0 : 1000);
    }, { passive: true });

    sourceInput.addEventListener("focus", (e) => {
      autocomplete.show(
        sourceInput,
        sourceDropdown,
        e.target.value,
        onAutocompleteSelect
      );
      handleInputActivity();
    });

    targetInput.addEventListener("focus", (e) => {
      autocomplete.show(
        targetInput,
        targetDropdown,
        e.target.value,
        onAutocompleteSelect
      );
      handleInputActivity();
    });

    sourceInput.addEventListener("change", handleInputActivity);
    targetInput.addEventListener("change", handleInputActivity);

    if (fromParam || toParam) {
      handleInputActivity();
      // Ensure tracker data is loaded before initial calculation
      await uiRenderer.ensureTrackersLoaded();
      await calculateRoute();
    }

    // Settings management

    // show/hide settings panel
    const settingsToggle = document.getElementById("settingsToggle");
    const settingsMenu = document.getElementById("settingsMenu");
    if (settingsToggle && settingsMenu) {
      settingsToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle("open");
      });

      // close when clicking outside
      document.addEventListener("click", (e) => {
        if (
          settingsMenu.classList.contains("open") &&
          !settingsMenu.contains(e.target) &&
          e.target !== settingsToggle
        ) {
          settingsMenu.classList.remove("open");
        }
      });
    }

    // scroll-to-top button
    const scrollBtn = document.getElementById('scrollTopBtn');
    let scrollUpdateScheduled = false;
    
    function updateScrollBtn() {
      if (!scrollBtn) return;
      scrollBtn.classList.add('visible');
    }

    function scheduleScrollBtnUpdate() {
      if (!scrollUpdateScheduled) {
        scrollUpdateScheduled = true;
        requestAnimationFrame(() => {
          updateScrollBtn();
          scrollUpdateScheduled = false;
        });
      }
    }

    window.addEventListener('scroll', scheduleScrollBtnUpdate, { passive: true });
    window.addEventListener('resize', scheduleScrollBtnUpdate, { passive: true });
    const routeContainer = document.getElementById('routeContainer');
    if (routeContainer) {
      routeContainer.addEventListener('scroll', scheduleScrollBtnUpdate, { passive: true });
    }
    // trigger initial evaluation in case results are pre-loaded or orientation changed
    updateScrollBtn();
    if (scrollBtn) {
      // make sure pointer events are enabled (just in case)
      scrollBtn.style.pointerEvents = 'auto';

      scrollBtn.addEventListener('click', () => {
        // debug output for troubleshooting
        console.log('scrollTopBtn clicked, pos', {
          doc: document.documentElement.scrollTop,
          body: document.body.scrollTop,
          cont: routeContainer ? routeContainer.scrollTop : null,
        });

        // primary scroll
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;

        // also scroll routeContainer if it's the scrollable area
        if (routeContainer) {
          routeContainer.scrollTop = 0;
        }
      });
    }

    function setMaxJumps(value) {
      maxJumpsInput.value = value;
      let matched = false;
      maxJumpsRadios.forEach((r) => {
        r.checked = r.value == value;
        if (r.checked) matched = true;
      });
      if (!matched) maxJumpsRadios.forEach((r) => (r.checked = false));
      maxJumps = value;
      localStorage.setItem("maxJumps", value);
      calculateRoute();
      updateURL(
        sourceInput.value,
        targetInput.value,
        maxJumps,
        maxDays,
        sortRadios,
        mergeRoutes,
        color
      );
    }

    maxJumpsRadios.forEach((radio) => {
      radio.addEventListener("change", () =>
        setMaxJumps(parseInt(radio.value, 10))
      );
    });
    maxJumpsInput.addEventListener("change", () => {
      let val = parseInt(maxJumpsInput.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      setMaxJumps(val);
    });
    setMaxJumps(maxJumps);

    function setMaxDays(value) {
      maxDaysInput.value = value;
      let matched = false;
      maxDaysRadios.forEach((r) => {
        r.checked = r.value == value;
        if (r.checked) matched = true;
      });
      if (!matched) maxDaysRadios.forEach((r) => (r.checked = false));
      maxDays = value;
      localStorage.setItem("maxDays", value);
      calculateRoute();
      updateURL(
        sourceInput.value,
        targetInput.value,
        maxJumps,
        maxDays,
        sortRadios,
        mergeRoutes,
        color
      );
    }

    maxDaysRadios.forEach((radio) => {
      radio.addEventListener("change", () =>
        setMaxDays(parseInt(radio.value, 10))
      );
    });
    maxDaysInput.addEventListener("change", () => {
      let val = parseInt(maxDaysInput.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      setMaxDays(val);
    });
    setMaxDays(maxDays);

    function setSortOption(value) {
      sortRadios.forEach((r) => (r.checked = r.value === value));
      localStorage.setItem("sortOption", value);
      calculateRoute();
    }
    sortRadios.forEach((radio) => {
      radio.addEventListener("change", () => setSortOption(radio.value));
    });
    setSortOption(sortOptionValue);

    // Merge routes setting
    function setMergeRoutes(value) {
      mergeRadios.forEach((r) => (r.checked = r.value === value));
      mergeRoutes = value;
      localStorage.setItem("mergeRoutes", value);
      calculateRoute();
      updateURL(
        sourceInput.value,
        targetInput.value,
        maxJumps,
        maxDays,
        sortRadios,
        mergeRoutes,
        color
      );
    }
    mergeRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.checked) setMergeRoutes(radio.value);
      });
    });

    function applyColorScheme(value) {
      colorSchemeRadios.forEach((r) => (r.checked = r.value === value));
      color = value;
      localStorage.setItem("colorScheme", value);

      // Show/hide custom color picker
      if (value === "custom") {
        customColorPicker.style.display = "block";
      } else {
        customColorPicker.style.display = "none";
      }

      calculateRoute();
      updateURL(
        sourceInput.value,
        targetInput.value,
        maxJumps,
        maxDays,
        sortRadios,
        mergeRoutes,
        color
      );
    }

    colorSchemeRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.checked) applyColorScheme(radio.value);
      });
    });
    
    // Debounce timer for color picker
    let colorPickerDebounceTimer;
    
    // Handle custom color picker changes - LIVE UPDATE with value display and debounce
    colorPickerInput.addEventListener("input", () => {
      const colorValue = document.getElementById("colorValue");
      if (colorValue) {
        colorValue.textContent = colorPickerInput.value.toUpperCase();
      }
      
      // Clear existing timer
      clearTimeout(colorPickerDebounceTimer);
      
      // Debounce the calculation to prevent lag while dragging
      if (color === "custom") {
        colorPickerDebounceTimer = setTimeout(() => {
          calculateRoute();
        }, 150); // Wait 150ms after user stops dragging
      }
    });
    
    // Immediate update when user releases the color picker
    colorPickerInput.addEventListener("change", () => {
      clearTimeout(colorPickerDebounceTimer);
      if (color === "custom") {
        calculateRoute();
      }
    });

    applyColorScheme(color);
    setMergeRoutes(savedMerge);

    // Initialize color value display
    const colorValueElement = document.getElementById("colorValue");
    if (colorValueElement) {
      colorValueElement.textContent = colorPickerInput.value.toUpperCase();
      
      // Allow clicking color value to copy to clipboard
      colorValueElement.addEventListener("click", () => {
        navigator.clipboard.writeText(colorPickerInput.value);
        const originalText = colorValueElement.textContent;
        colorValueElement.textContent = "Copied!";
        setTimeout(() => {
          colorValueElement.textContent = originalText;
        }, 1000);
      });
    }

    // Fetch last update time
    fetchLastUpdate();
  }
});