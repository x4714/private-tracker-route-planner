// Main application entry point

window.addEventListener("load", async function () {
  // Load data
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
  }

  const { routeInfo, unlockInviteClass, abbrList } = data;

  // DOM elements
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

  // Debounce timers
  let sourceDebounceTimer;
  let targetDebounceTimer;

  // Load settings from localStorage and URL params
  let maxJumps = parseInt(localStorage.getItem("maxJumps"), 10);
  let maxDays = parseInt(localStorage.getItem("maxDays"), 10);
  let sortOptionValue = localStorage.getItem("sortOption");
  let savedMerge = localStorage.getItem("mergeRoutes") || "no";


  const urlParams = new URLSearchParams(window.location.search);
  const fromParam = urlParams.get("from");
  const toParam = urlParams.get("to");
  const jumpsParam = parseInt(urlParams.get("jumps"), 10);
  const daysParam = parseInt(urlParams.get("days"), 10);
  const sortParam = urlParams.get("sort");
  const mergeParam = urlParams.get("merge");

  if (fromParam) sourceInput.value = fromParam;
  if (toParam) targetInput.value = toParam;
  if (!isNaN(jumpsParam)) maxJumps = jumpsParam;
  if (!isNaN(daysParam)) maxDays = daysParam;
  if (sortParam) sortOptionValue = sortParam;
  if (mergeParam !== null) mergeRoutes = mergeParam === "true";

  if (isNaN(maxJumps)) maxJumps = 4;
  if (isNaN(maxDays)) maxDays = 720;
  if (!sortOptionValue) sortOptionValue = "fastest";

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
  const uiRenderer = new UIRenderer(
    routeInfo,
    unlockInviteClass,
    abbrList,
    getMaxDays
  );

  // Calculate and render routes
  async function calculateRoute() {
    document.getElementById("loadingIndicator").style.display = "block";

    await new Promise((resolve) => setTimeout(resolve)); // allow UI to update

    const startRaw = sourceInput.value.trim();
    const endRaw = targetInput.value.trim();

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

    const result = routeCalculator.calculate(
      sourceInputs,
      targetInputs,
      maxJumps,
      maxDays
    );

    if (result.status === "success") {
      const selectedSort =
        Array.from(sortRadios).find((r) => r.checked)?.value || "fastest";
      routeCalculator.sortRoutes(result.routes, selectedSort);
    }

    uiRenderer.renderResults(result, mergeRoutes);
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
      mergeRoutes
    );
  };

  // Autocomplete callback
  const onAutocompleteSelect = () => {
    calculateRoute();
    handleInputActivity();
    updateURL(
      sourceInput.value,
      targetInput.value,
      maxJumps,
      maxDays,
      sortRadios,
      mergeRoutes
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
    sourceDebounceTimer = setTimeout(() => {
      autocomplete.show(
        sourceInput,
        sourceDropdown,
        value,
        onAutocompleteSelect
      );
      handleInputActivity();
    }, 150);
  });

  targetInput.addEventListener("input", (e) => {
    clearTimeout(targetDebounceTimer);
    const value = e.target.value;
    targetDebounceTimer = setTimeout(() => {
      autocomplete.show(
        targetInput,
        targetDropdown,
        value,
        onAutocompleteSelect
      );
      handleInputActivity();
    }, 150);
  });

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

  if (fromParam || toParam) handleInputActivity();

  // Settings management
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
      mergeRoutes
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
      mergeRoutes
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
      mergeRoutes
    );
  }
  mergeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) setMergeRoutes(radio.value);
  });
});

  setMergeRoutes(savedMerge);

  // Fetch last update time
  fetchLastUpdate();
});
