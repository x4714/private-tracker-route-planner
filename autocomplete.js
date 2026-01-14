// Autocomplete functionality

class Autocomplete {
  constructor(allTrackers, abbrList) {
    this.allTrackers = allTrackers;
    this.allTrackersLower = allTrackers.map(t => t.toLowerCase());
    this.abbrList = abbrList;
    this.abbrListLower = {};
    
    for (const key in abbrList) {
      this.abbrListLower[key] = abbrList[key].toLowerCase();
    }
    
    this.previousFiltered = [];
  }

  show(input, dropdown, value, onSelect) {
    let searchTerm = value.toLowerCase().trim();
    
    // For source input, get the last term after comma
    if (input.id === 'sourceInput' && searchTerm.includes(',')) {
      const terms = searchTerm.split(',');
      searchTerm = terms[terms.length - 1].trim();
    }
    
    if (!searchTerm) {
      dropdown.style.display = 'none';
      return;
    }

    const filtered = [];
    for (let i = 0; i < this.allTrackers.length; i++) {
      const tracker = this.allTrackers[i];
      const trackerLower = this.allTrackersLower[i];
      const abbrLower = this.abbrListLower[tracker] || '';
      if (trackerLower.includes(searchTerm) || abbrLower.includes(searchTerm)) {
        filtered.push(tracker);
      }
    }

    filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = aLower.startsWith(searchTerm) ? 0 : 1;
      const bStarts = bLower.startsWith(searchTerm) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return aLower.localeCompare(bLower);
    });

    const limited = filtered.slice(0, 20);

    const isSame = limited.length === this.previousFiltered.length &&
      limited.every((t, i) => t === this.previousFiltered[i]);
    if (isSame) return;
    this.previousFiltered = limited.slice();

    dropdown.innerHTML = '';

    limited.forEach(tracker => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      const abbr = this.abbrList[tracker] ? ` (${this.abbrList[tracker]})` : '';
      const nameHTML = tracker.replace(new RegExp(`(${searchTerm})`, 'ig'), '<mark>$1</mark>');
      const abbrHTML = abbr.replace(new RegExp(`(${searchTerm})`, 'ig'), '<mark>$1</mark>');

      item.innerHTML = nameHTML + abbrHTML;

      item.addEventListener('click', () => {
        if (input.id === 'sourceInput') {
          const currentValue = input.value;
          const terms = currentValue.split(',').map(t => t.trim());
          terms[terms.length - 1] = tracker;
          input.value = terms.join(', ');
        } else {
          input.value = tracker;
        }
        dropdown.style.display = 'none';
        onSelect();
      });
      dropdown.appendChild(item);
    });

    dropdown.style.display = limited.length > 0 ? 'block' : 'none';
  }

  setupEventListeners(sourceInput, sourceDropdown, targetInput, targetDropdown, onSelect) {
    document.addEventListener('mousedown', (event) => {
      if (!sourceDropdown.contains(event.target) && !sourceInput.contains(event.target)) {
        sourceDropdown.style.display = 'none';
      }
      if (!targetDropdown.contains(event.target) && !targetInput.contains(event.target)) {
        targetDropdown.style.display = 'none';
      }
    });

    [sourceDropdown, targetDropdown].forEach(dropdown => {
      dropdown.addEventListener('mousedown', (e) => e.stopPropagation());
    });
  }
}