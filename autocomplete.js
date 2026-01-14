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
      const aAbbr = (this.abbrListLower[a] || '');
      const bAbbr = (this.abbrListLower[b] || '');

      const score = (name, abbr) => {
        if (name.startsWith(searchTerm)) return 0;
        if (abbr.startsWith(searchTerm)) return 1;
        if (name.includes(searchTerm)) return 2;
        if (abbr.includes(searchTerm)) return 3;
        return 4;
      };

      const aScore = score(aLower, aAbbr);
      const bScore = score(bLower, bAbbr);

      if (aScore !== bScore) return aScore - bScore;
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
      const highlight = (text) =>
        text.replace(
          new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'),
          '<mark>$1</mark>'
        );

      const nameHTML = highlight(tracker);
      const abbrHTML = this.abbrList[tracker]
        ? ` (${highlight(this.abbrList[tracker])})`
        : '';


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