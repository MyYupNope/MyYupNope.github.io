/**
 * TalentTracker - Job Application Dashboard Logic
 */

// Configuration
const SHEET_EXPORT_URL = 'https://docs.google.com/spreadsheets/d/1LdXmp9wAildqYdRIyzA32BMMQIDDM2kT25lMrgYeRbk/export?format=csv';

/**
 * FacetedSelect Class
 * Reusable ES6 class to control select toggle actions, search inputs, active options filtering,
 * and keyboard navigation (ArrowUp/Down, Enter, Escape).
 */
class FacetedSelect {
  constructor(container, trigger, searchInput, optionsList, defaultText) {
    this.container = container;
    this.trigger = trigger;
    this.searchInput = searchInput;
    this.optionsList = optionsList;
    this.defaultText = defaultText;
    
    this.focusedIndex = -1;
    this.initEvents();
  }
  
  initEvents() {
    // Toggle active dropdown state on trigger click
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasActive = this.container.classList.contains('active');
      
      // Close other active dropdowns
      document.querySelectorAll('.custom-select').forEach(sel => {
        if (sel !== this.container) {
          sel.classList.remove('active');
          const trigger = sel.querySelector('.select-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        }
      });
      
      this.container.classList.toggle('active');
      const isActive = this.container.classList.contains('active');
      this.trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      
      if (!wasActive) {
        this.searchInput.value = '';
        this.filterOptions();
        this.searchInput.focus();
        this.resetFocus();
      }
    });
    
    // Filter dropdown elements on user input
    this.searchInput.addEventListener('input', () => {
      this.filterOptions();
      this.resetFocus();
    });
    
    // Handle keyboard accessibility
    this.container.addEventListener('keydown', (e) => {
      if (!this.container.classList.contains('active')) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.moveFocus(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.moveFocus(-1);
          break;
        case 'Enter':
          e.preventDefault();
          this.selectFocused();
          break;
        case 'Escape':
          e.preventDefault();
          this.close();
          this.trigger.focus();
          break;
      }
    });
  }
  
  close() {
    this.container.classList.remove('active');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.resetFocus();
  }
  
  resetFocus() {
    this.focusedIndex = -1;
    this.updateKbdFocusUI();
  }
  
  updateKbdFocusUI() {
    const options = this.getSelectableOptions();
    options.forEach((opt, idx) => {
      if (idx === this.focusedIndex) {
        opt.classList.add('kbd-focused');
        opt.scrollIntoView({ block: 'nearest' });
      } else {
        opt.classList.remove('kbd-focused');
      }
    });
  }
  
  getSelectableOptions() {
    return Array.from(this.optionsList.querySelectorAll('.option')).filter(opt => {
      return opt.style.display !== 'none' && 
             !opt.classList.contains('loading') && 
             !opt.classList.contains('no-match');
    });
  }
  
  moveFocus(dir) {
    const options = this.getSelectableOptions();
    if (options.length === 0) return;
    
    this.focusedIndex += dir;
    if (this.focusedIndex < 0) {
      this.focusedIndex = options.length - 1;
    } else if (this.focusedIndex >= options.length) {
      this.focusedIndex = 0;
    }
    this.updateKbdFocusUI();
  }
  
  selectFocused() {
    const options = this.getSelectableOptions();
    if (this.focusedIndex >= 0 && this.focusedIndex < options.length) {
      options[this.focusedIndex].click();
    }
  }
  
  filterOptions() {
    const filterText = this.searchInput.value.toLowerCase().trim();
    const options = this.optionsList.querySelectorAll('.option');
    let matches = 0;
    
    options.forEach(option => {
      if (option.classList.contains('loading') || option.classList.contains('no-match')) return;
      
      // Always show the "All..." default filter option
      if (option.textContent.startsWith('All ')) {
        option.style.display = '';
        matches++;
        return;
      }
      
      const text = option.textContent.toLowerCase();
      if (text.includes(filterText)) {
        option.style.display = '';
        matches++;
      } else {
        option.style.display = 'none';
      }
    });
    
    // Clear out-of-date "No Matches" labels
    const existingNoMatch = this.optionsList.querySelector('.option.no-match');
    if (existingNoMatch) existingNoMatch.remove();
    
    if (matches === 1) { // Only the default "All..." matched
      const noMatchLi = document.createElement('li');
      noMatchLi.className = 'option no-match';
      noMatchLi.textContent = 'No matching items';
      this.optionsList.appendChild(noMatchLi);
    }
  }
  
  populate(items, selectedValue, onSelectCallback) {
    this.optionsList.innerHTML = '';
    
    // Default option
    const allLi = document.createElement('li');
    allLi.className = `option ${selectedValue === null ? 'selected' : ''}`;
    allLi.setAttribute('role', 'option');
    allLi.setAttribute('aria-selected', selectedValue === null ? 'true' : 'false');
    allLi.textContent = this.defaultText;
    allLi.addEventListener('click', () => {
      this.trigger.querySelector('.trigger-text').textContent = this.defaultText;
      this.close();
      onSelectCallback(null);
    });
    this.optionsList.appendChild(allLi);
    
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = `option ${selectedValue === item ? 'selected' : ''}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', selectedValue === item ? 'true' : 'false');
      li.textContent = item;
      li.addEventListener('click', () => {
        this.trigger.querySelector('.trigger-text').textContent = item;
        this.close();
        onSelectCallback(item);
      });
      this.optionsList.appendChild(li);
    });
    
    this.trigger.querySelector('.trigger-text').textContent = selectedValue || this.defaultText;
    this.filterOptions();
  }
}

// App State
let rawApplications = [];
let activeApplications = []; // Applications where status <> retired and status <> rejected
let filteredApplications = []; // Currently filtered applications
let selectedCompany = null;
let selectedJobTitle = null;
let selectedStatus = null;

let currentPage = 1;
let rowsPerPage = 10;
let selectedChartRange = 'all';

let companySelect, jobSelect, statusSelect;

// DOM Elements
const syncStatusEl = document.getElementById('syncStatus');
const statCompaniesEl = document.getElementById('statCompanies');
const statJobsEl = document.getElementById('statJobs');
const statInterviewsEl = document.getElementById('statInterviews');
const statConversionEl = document.getElementById('statConversion');

const btnResetFilters = document.getElementById('btnResetFilters');
const registryTableBody = document.getElementById('registryTableBody');
const noResultsEl = document.getElementById('noResults');
const resultsCountEl = document.getElementById('resultsCount');
const sortSelect = document.getElementById('sortSelect');

// Custom Select Dropdowns
const companySelectContainer = document.getElementById('companySelectContainer');
const companyTrigger = document.getElementById('companyTrigger');
const companySearch = document.getElementById('companySearch');
const companyOptions = document.getElementById('companyOptions');

const jobSelectContainer = document.getElementById('jobSelectContainer');
const jobTrigger = document.getElementById('jobTrigger');
const jobSearch = document.getElementById('jobSearch');
const jobOptions = document.getElementById('jobOptions');

const statusSelectContainer = document.getElementById('statusSelectContainer');
const statusTrigger = document.getElementById('statusTrigger');
const statusSearch = document.getElementById('statusSearch');
const statusOptions = document.getElementById('statusOptions');

// Drawer Elements
const drawerOverlay = document.getElementById('drawerOverlay');
const detailsDrawer = document.getElementById('detailsDrawer');
const btnCloseDrawer = document.getElementById('btnCloseDrawer');
const drawerStatusBadge = document.getElementById('drawerStatusBadge');
const drawerJobTitle = document.getElementById('drawerJobTitle');
const drawerCompanyName = document.getElementById('drawerCompanyName');
const drawerDate = document.getElementById('drawerDate');
const drawerSuitabilityScoreContainer = document.getElementById('drawerSuitabilityScoreContainer');
const drawerSuitabilityScore = document.getElementById('drawerSuitabilityScore');
const drawerSuitabilityEval = document.getElementById('drawerSuitabilityEval');
const sectionSuitabilityEval = document.getElementById('sectionSuitabilityEval');
const drawerComments = document.getElementById('drawerComments');
const sectionComments = document.getElementById('sectionComments');
const drawerJobDescription = document.getElementById('drawerJobDescription');
const drawerCompanyDescription = document.getElementById('drawerCompanyDescription');
const linkJobUrl = document.getElementById('linkJobUrl');
const linkCompanyFolder = document.getElementById('linkCompanyFolder');
const drawerInterviewCompany = document.getElementById('drawerInterviewCompany');
const drawerInterviewPreparation = document.getElementById('drawerInterviewPreparation');

// Initialize the Application
function initializeApp() {
  // Instantiate selectors
  companySelect = new FacetedSelect(companySelectContainer, companyTrigger, companySearch, companyOptions, 'All Companies');
  jobSelect = new FacetedSelect(jobSelectContainer, jobTrigger, jobSearch, jobOptions, 'All Job Titles');
  statusSelect = new FacetedSelect(statusSelectContainer, statusTrigger, statusSearch, statusOptions, 'All Statuses');

  setupEventListeners();
  fetchData();
  initTabNavigation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

/**
 * Event Listeners Setup
 */
function setupEventListeners() {
  // Global click listener to close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!companySelectContainer.contains(e.target)) {
      companySelect.close();
    }
    if (!jobSelectContainer.contains(e.target)) {
      jobSelect.close();
    }
    if (!statusSelectContainer.contains(e.target)) {
      statusSelect.close();
    }
  });

  // Reset Filters Button
  btnResetFilters.addEventListener('click', () => {
    selectedCompany = null;
    selectedJobTitle = null;
    selectedStatus = null;
    
    // Refresh filter UI and data views
    updateFiltersUI();
    applyFilters(true);
  });

  // Drawer Close Actions
  btnCloseDrawer.addEventListener('click', closeDetailsDrawer);
  drawerOverlay.addEventListener('click', closeDetailsDrawer);
  
  // Accordion Toggle Event Listeners
  const accordionItems = detailsDrawer.querySelectorAll('.accordion-item');
  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    if (header) {
      header.addEventListener('click', () => {
        const isAlreadyActive = item.classList.contains('active');
        
        // Close all accordion items in detailsDrawer
        accordionItems.forEach(i => i.classList.remove('active'));
        
        // Toggle current one
        if (!isAlreadyActive) {
          item.classList.add('active');
          
          // Smooth scroll the expanded section to the top of the drawer body
          const container = detailsDrawer.querySelector('.drawer-body');
          if (container) {
            const items = Array.from(detailsDrawer.querySelectorAll('.accordion-item'));
            const clickedIndex = items.indexOf(item);
            
            const containerStyle = window.getComputedStyle(container);
            const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
            const gap = parseFloat(containerStyle.gap) || 0;
            
            let accumulatedHeight = 0;
            for (let i = 0; i < clickedIndex; i++) {
              const currentItem = items[i];
              if (!currentItem.classList.contains('hidden')) {
                const headerEl = currentItem.querySelector('.accordion-header');
                const headerHeight = headerEl ? headerEl.offsetHeight : 0;
                
                const itemStyle = window.getComputedStyle(currentItem);
                const paddingBottom = parseFloat(itemStyle.paddingBottom) || 0;
                const borderBottom = parseFloat(itemStyle.borderBottomWidth) || 0;
                
                accumulatedHeight += headerHeight + paddingBottom + borderBottom;
                accumulatedHeight += gap;
              }
            }
            
            const targetScrollTop = accumulatedHeight + paddingTop;
            
            container.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          }
        }
      });
    }
  });

  // ESC Key to close dropdowns and drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      companySelect.close();
      jobSelect.close();
      statusSelect.close();
      closeDetailsDrawer();
    }
  });

  // Sort dropdown change listener
  sortSelect.addEventListener('change', () => {
    applyFilters(true);
  });

  // Table sorting from header clicks
  document.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort-field');
      const currentVal = sortSelect.value;
      const [currentField, currentDir] = currentVal.split('-');
      
      let newDir = 'asc';
      if (field === currentField) {
        newDir = currentDir === 'asc' ? 'desc' : 'asc';
      } else {
        newDir = field === 'date' ? 'desc' : 'asc';
      }
      
      sortSelect.value = `${field}-${newDir}`;
      applyFilters(true);
    });
  });

  // Paging controls
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  
  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
  }
  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      const maxPage = Math.ceil(filteredApplications.length / rowsPerPage);
      if (currentPage < maxPage) {
        currentPage++;
        renderTable();
      }
    });
  }

  // Rows per page dropdown listener
  const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');
  if (rowsPerPageSelect) {
    rowsPerPageSelect.addEventListener('change', (e) => {
      rowsPerPage = parseInt(e.target.value, 10) || 10;
      currentPage = 1;
      renderTable();
    });
  }

  // Chart range toggle listener
  const rangeToggleContainer = document.getElementById('chartRangeToggle');
  if (rangeToggleContainer) {
    rangeToggleContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-toggle');
      if (!btn) return;
      
      rangeToggleContainer.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      selectedChartRange = btn.getAttribute('data-range');
      
      if (rawApplications.length > 0) {
        try {
          initAnalyticsChart(rawApplications);
        } catch (error) {
          console.error("Failed to render chart on range toggle:", error);
        }
      }
    });
  }
}

/**
 * Fetch and Parse Data with offline Local Storage support
 */
function fetchData() {
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const cachedVal = localStorage.getItem('talent_tracker_csv_cache');
  let cachedCsvText = null;
  let hasLoadedFromCache = false;

  if (cachedVal) {
    try {
      // Try parsing as JSON first
      const cachedObj = JSON.parse(cachedVal);
      if (cachedObj && typeof cachedObj === 'object' && cachedObj.csv && cachedObj.timestamp) {
        if (Date.now() - cachedObj.timestamp < CACHE_TTL_MS) {
          cachedCsvText = cachedObj.csv;
        } else {
          console.log('[interviewz] Cache expired');
        }
      }
    } catch (e) {
      // JSON parsing failed, likely the old raw CSV string format
      cachedCsvText = cachedVal;
    }
  }

  if (cachedCsvText) {
    try {
      parseAndInitializeData(cachedCsvText);
      hasLoadedFromCache = true;
      updateSyncStatus('syncing', 'Syncing (cached loaded)...');
    } catch (e) {
      console.error('Error parsing cached CSV data:', e);
      localStorage.removeItem('talent_tracker_csv_cache');
      cachedCsvText = null;
    }
  } else {
    updateSyncStatus('syncing', 'Fetching Live Spreadsheet...');
  }

  fetch(SHEET_EXPORT_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(csvText => {
      try {
        const cacheObj = {
          csv: csvText,
          timestamp: Date.now()
        };
        localStorage.setItem('talent_tracker_csv_cache', JSON.stringify(cacheObj));
      } catch (e) {
        console.warn('Unable to cache CSV to localStorage:', e);
      }
      if (csvText !== cachedCsvText) {
        parseAndInitializeData(csvText);
      } else {
        console.log('[interviewz] Fetched data is identical to cache, skipping re-render');
      }
      updateSyncStatus('success', 'Connected & Synced');
    })
    .catch(error => {
      console.error('Error fetching sheet data:', error);
      updateSyncStatus('error', 'Sync Failed - View Local Cache');
      
      if (!hasLoadedFromCache) {
        registryTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 3rem; pointer-events: none;">
              <h3 style="color: var(--color-error); margin-bottom: 0.5rem;">Failed to load live data</h3>
              <p style="color: var(--color-text-secondary);">There was an issue fetching the Google Sheet. Please check your internet connection or the spreadsheet sharing settings.</p>
            </td>
          </tr>
        `;
      }
    });
}

/**
 * Updates the Header Sync Status Indicator
 */
function updateSyncStatus(status, text) {
  const dot = syncStatusEl.querySelector('.status-dot');
  const txt = syncStatusEl.querySelector('.status-text');
  
  dot.className = 'status-dot';
  txt.textContent = text;
  
  if (status === 'success') {
    dot.classList.add('ready');
  } else if (status === 'error') {
    dot.classList.add('error');
  } else {
    dot.classList.add('pulsing');
  }
}

/**
 * State-Machine CSV Parser
 * Handles multiline cells, double double-quotes, and commas within cells correctly.
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const nextC = text[i + 1];

    if (c === '"') {
      if (inQuotes && nextC === '"') {
        // Escaped double quote inside a quoted field ("")
        currentField += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      
      // Skip \n if we just handled \r
      if (c === '\r' && nextC === '\n') {
        i++;
      }
      
      rows.push(currentRow);
      currentRow = [];
    } else {
      currentField += c;
    }
  }

  // Handle remaining field/row if file doesn't end with a newline
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Map CSV rows into JSON objects and set initial state
 */
function parseAndInitializeData(csvText) {
  const parsedRows = parseCSV(csvText);
  if (parsedRows.length < 2) return;

  const headers = parsedRows[0].map(h => h.trim());
  rawApplications = [];

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const app = {};
    headers.forEach((header, index) => {
      app[header] = row[index] !== undefined ? row[index] : '';
    });
    rawApplications.push(app);
  }

  // 1) Filter out retired and rejected applications
  activeApplications = rawApplications.filter(app => {
    const status = (app['Application Status'] || '').trim().toLowerCase();
    return status !== 'retired' && status !== 'rejected';
  });

  // Calculate high level overview metrics
  calculateStatistics();

  // Populate dynamic filters & render lists
  updateFiltersUI();
  applyFilters();

  // Render bottom analytics graph
  try {
    initAnalyticsChart(rawApplications);
  } catch (error) {
    console.error("Failed to render initial analytics chart:", error);
  }
}

/**
 * Calculates dashboard statistics based on active applications
 */
function calculateStatistics() {
  // Count unique companies in active applications
  const uniqueCompanies = new Set(
    activeApplications.map(app => (app['Company Name'] || '').trim()).filter(name => name !== '')
  );
  statCompaniesEl.textContent = uniqueCompanies.size;

  // Count unique job titles in active applications
  const uniqueJobs = new Set(
    activeApplications.map(app => (app['Job Title'] || '').trim()).filter(title => title !== '')
  );
  statJobsEl.textContent = uniqueJobs.size;

  // Count interviewing/interview applications
  const interviewApps = activeApplications.filter(app => {
    const status = (app['Application Status'] || '').trim().toLowerCase();
    return status.includes('interview');
  });
  statInterviewsEl.textContent = interviewApps.length;

  // Calculate Conversion Rate: reached "interview" or beyond (offer, ready)
  const conversionApps = activeApplications.filter(app => {
    const status = (app['Application Status'] || '').trim().toLowerCase();
    return status.includes('interview') || status === 'offer' || status === 'ready';
  });
  const conversionRate = activeApplications.length > 0
    ? Math.round((conversionApps.length / activeApplications.length) * 100)
    : 0;
  statConversionEl.textContent = `${conversionRate}%`;
}

/**
 * 1) Company Name: Alphabetical order, status <> retired
 * 2) Job Title: Associated to company selection, or all job titles of active companies if none selected, alphabetical order.
 */
function updateFiltersUI() {
  // --- 1. Populate Company List ---
  const companyPool = activeApplications.filter(app => {
    const matchJob = !selectedJobTitle || (app['Job Title'] || '').trim() === selectedJobTitle;
    const matchStatus = !selectedStatus || (app['Application Status'] || '').trim() === selectedStatus;
    return matchJob && matchStatus;
  });

  const distinctCompanies = [...new Set(
    companyPool.map(app => (app['Company Name'] || '').trim()).filter(name => name !== '')
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  companySelect.populate(distinctCompanies, selectedCompany, (company) => {
    selectedCompany = company;
    
    // Automatically select the Job Title if there is only one associated with the selected company
    if (selectedCompany) {
      const companyApps = activeApplications.filter(app => 
        (app['Company Name'] || '').trim() === selectedCompany
      );
      const companyJobs = [...new Set(
        companyApps.map(app => (app['Job Title'] || '').trim()).filter(title => title !== '')
      )];
      
      if (companyJobs.length === 1) {
        selectedJobTitle = companyJobs[0];
      } else {
        if (selectedJobTitle) {
          const isValid = companyJobs.includes(selectedJobTitle);
          if (!isValid) {
            selectedJobTitle = null;
          }
        }
      }
    } else {
      // If company is set to null (All Companies), reset selectedJobTitle if it's no longer valid
      if (selectedJobTitle) {
        const isValid = activeApplications.some(app => 
          (app['Job Title'] || '').trim() === selectedJobTitle
        );
        if (!isValid) {
          selectedJobTitle = null;
        }
      }
    }

    updateFiltersUI();
    applyFilters(true);
  });

  // --- 2. Populate Job Title List ---
  const jobPool = activeApplications.filter(app => {
    const matchCompany = !selectedCompany || (app['Company Name'] || '').trim() === selectedCompany;
    const matchStatus = !selectedStatus || (app['Application Status'] || '').trim() === selectedStatus;
    return matchCompany && matchStatus;
  });

  const distinctJobs = [...new Set(
    jobPool.map(app => (app['Job Title'] || '').trim()).filter(title => title !== '')
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  jobSelect.populate(distinctJobs, selectedJobTitle, (jobTitle) => {
    selectedJobTitle = jobTitle;

    // If a specific job title is chosen, update the selected company to its associated company
    if (selectedJobTitle) {
      const matchingApp = activeApplications.find(app => (app['Job Title'] || '').trim() === selectedJobTitle);
      if (matchingApp) {
        selectedCompany = (matchingApp['Company Name'] || '').trim();
      }
    }

    updateFiltersUI();
    applyFilters(true);
  });

  // --- 3. Populate Application Status List ---
  const statusPool = activeApplications.filter(app => {
    const matchCompany = !selectedCompany || (app['Company Name'] || '').trim() === selectedCompany;
    const matchJob = !selectedJobTitle || (app['Job Title'] || '').trim() === selectedJobTitle;
    return matchCompany && matchJob;
  });

  const distinctStatuses = [...new Set(
    statusPool.map(app => (app['Application Status'] || '').trim()).filter(status => status !== '')
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  statusSelect.populate(distinctStatuses, selectedStatus, (statusValue) => {
    selectedStatus = statusValue;
    updateFiltersUI();
    applyFilters(true);
  });
}

/**
 * Filter data, enable/disable reset button, and render cards list
 */
function applyFilters(resetPage = true) {
  if (resetPage) {
    currentPage = 1;
  }

  // Toggle Reset Button state
  btnResetFilters.disabled = !selectedCompany && !selectedJobTitle && !selectedStatus;

  // Filter the list
  filteredApplications = activeApplications.filter(app => {
    const matchCompany = !selectedCompany || (app['Company Name'] || '').trim() === selectedCompany;
    const matchJob = !selectedJobTitle || (app['Job Title'] || '').trim() === selectedJobTitle;
    const matchStatus = !selectedStatus || (app['Application Status'] || '').trim() === selectedStatus;
    return matchCompany && matchJob && matchStatus;
  });

  // Dynamic Sorting
  const sortVal = sortSelect.value;
  filteredApplications.sort((a, b) => {
    let comparison = 0;
    
    if (sortVal.startsWith('date')) {
      const dateA = parseDate(a['Create Date']);
      const dateB = parseDate(b['Create Date']);
      comparison = dateA - dateB; // Oldest first (asc)
      if (sortVal === 'date-desc') {
        comparison = dateB - dateA; // Newest first (desc)
      }
    } else if (sortVal.startsWith('job')) {
      const jobA = (a['Job Title'] || '').trim();
      const jobB = (b['Job Title'] || '').trim();
      comparison = jobA.localeCompare(jobB, undefined, { sensitivity: 'base', numeric: true });
      if (sortVal === 'job-desc') {
        comparison = jobB.localeCompare(jobA, undefined, { sensitivity: 'base', numeric: true });
      }
    } else if (sortVal.startsWith('company')) {
      const companyA = (a['Company Name'] || '').trim();
      const companyB = (b['Company Name'] || '').trim();
      comparison = companyA.localeCompare(companyB, undefined, { sensitivity: 'base', numeric: true });
      if (sortVal === 'company-desc') {
        comparison = companyB.localeCompare(companyA, undefined, { sensitivity: 'base', numeric: true });
      }
    }
    
    return comparison;
  });

  renderTable();
}

/**
 * Update sorting indicators on table headers
 */
function updateHeaderSortIndicators() {
  const currentVal = sortSelect.value;
  const [currentField, currentDir] = currentVal.split('-');
  
  document.querySelectorAll('.sortable-header').forEach(header => {
    const field = header.getAttribute('data-sort-field');
    const icon = header.querySelector('.sort-icon');
    if (icon) {
      icon.className = 'sort-icon'; // Clear previous classes
      if (field === currentField) {
        icon.classList.add(currentDir);
      }
    }
  });
}

/**
 * Render Applications Table with pagination
 */
function renderTable() {
  registryTableBody.innerHTML = '';
  resultsCountEl.textContent = filteredApplications.length;

  const tableContainer = document.querySelector('.registry-table-container');
  const paginationInfo = document.getElementById('paginationInfo');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');

  if (filteredApplications.length === 0) {
    noResultsEl.classList.remove('hidden');
    if (tableContainer) tableContainer.style.display = 'none';
    return;
  }

  noResultsEl.classList.add('hidden');
  if (tableContainer) tableContainer.style.display = '';

  // Calculate pagination bounds
  const totalRows = filteredApplications.length;
  const maxPage = Math.ceil(totalRows / rowsPerPage) || 1;
  
  // Bounds check
  if (currentPage > maxPage) {
    currentPage = maxPage;
  }
  if (currentPage < 1) {
    currentPage = 1;
  }

  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = Math.min(startIdx + rowsPerPage, totalRows);

  const pageApplications = filteredApplications.slice(startIdx, endIdx);

  pageApplications.forEach((app) => {
    const row = document.createElement('tr');
    
    const company = (app['Company Name'] || '').trim();
    const title = (app['Job Title'] || '').trim();
    const status = (app['Application Status'] || '').trim();
    const dateStr = (app['Create Date'] || '').trim();
    const suitabilityScore = (app['Job_Suitability'] || app['Job Suitability'] || '').trim();
    const scoreNum = parseInt(suitabilityScore, 10);
    const scoreClass = !isNaN(scoreNum) && scoreNum >= 1 && scoreNum <= 5 ? `score-${scoreNum}` : '';
    
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');

    row.innerHTML = `
      <td><span class="table-job-title">${escapeHtml(title)}</span></td>
      <td><span class="table-company">${escapeHtml(company)}</span></td>
      <td><span class="status-badge ${statusClass}">${escapeHtml(status)}</span></td>
      <td><span class="table-date">${escapeHtml(formatDisplayDate(dateStr))}</span></td>
      <td>
        ${suitabilityScore ? `<span class="score-badge ${scoreClass}">Score: ${escapeHtml(suitabilityScore)}</span>` : '<span style="color: var(--color-text-secondary)">-</span>'}
      </td>
      <td>
        <button type="button" class="table-action-btn">
          View Detail
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </td>
    `;

    row.addEventListener('click', () => openDetailsDrawer(app));
    registryTableBody.appendChild(row);
  });

  // Update pagination info and state
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${totalRows === 0 ? 0 : startIdx + 1} - ${endIdx} of ${totalRows} rows`;
  }
  
  if (btnPrevPage) {
    btnPrevPage.disabled = currentPage === 1;
  }
  if (btnNextPage) {
    btnNextPage.disabled = currentPage === maxPage;
  }

  // Update header sort indicator UI
  updateHeaderSortIndicators();
}

/**
 * Open Details Drawer
 */
function openDetailsDrawer(app) {
  // Populate Drawer Contents
  const status = (app['Application Status'] || '').trim();
  drawerStatusBadge.className = `badge status-badge ${status.toLowerCase().replace(/\s+/g, '-')}`;
  drawerStatusBadge.textContent = status;
  
  drawerJobTitle.textContent = (app['Job Title'] || '').trim();
  drawerCompanyName.textContent = (app['Company Name'] || '').trim();
  drawerDate.textContent = formatDisplayDate((app['Create Date'] || '').trim());
  
  // Suitability Info
  const score = (app['Job_Suitability'] || app['Job Suitability'] || '').trim();
  const evaluation = (app['Job_Suitability_Evaluation'] || app['Job Suitability Evaluation'] || '').trim();
  const sectionD = document.getElementById('sectionD_Suitability');
  
  if (score || evaluation) {
    if (sectionD) sectionD.classList.remove('hidden');
    if (score) {
      drawerSuitabilityScore.textContent = score;
      const scoreNum = parseInt(score, 10);
      const scoreClass = !isNaN(scoreNum) && scoreNum >= 1 && scoreNum <= 5 ? `score-${scoreNum}` : '';
      drawerSuitabilityScore.className = `score-badge ${scoreClass}`;
      drawerSuitabilityScoreContainer.style.display = '';
    } else {
      drawerSuitabilityScoreContainer.style.display = 'none';
    }

    if (evaluation) {
      drawerSuitabilityEval.textContent = evaluation;
      sectionSuitabilityEval.classList.remove('hidden');
    } else {
      sectionSuitabilityEval.classList.add('hidden');
    }
  } else {
    if (sectionD) sectionD.classList.add('hidden');
  }

  // Comments
  const comments = (app['Comments'] || '').trim();
  if (comments) {
    drawerComments.textContent = comments;
    sectionComments.classList.remove('hidden');
  } else {
    sectionComments.classList.add('hidden');
  }

  // Job and Company Descriptions
  drawerJobDescription.textContent = (app['Job Description'] || 'No description provided.').trim();
  drawerCompanyDescription.textContent = (app['Company Description'] || 'No company profile available.').trim();

  // Links
  const jobUrl = (app['Job URL'] || '').trim();
  if (jobUrl) {
    linkJobUrl.href = jobUrl;
    linkJobUrl.style.display = '';
  } else {
    linkJobUrl.style.display = 'none';
  }

  const companyFolder = (app['Company_Folder'] || '').trim();
  if (companyFolder) {
    linkCompanyFolder.href = companyFolder;
    linkCompanyFolder.style.display = '';
  } else {
    linkCompanyFolder.style.display = 'none';
  }

  // Job Interview Info
  const interviewCompany = (app['Interview_Company'] || '').trim();
  const interviewPrep = (app['Interview_Preparation'] || '').trim();
  const sectionE = document.getElementById('sectionE_JobInterview');

  if (interviewCompany || interviewPrep) {
    if (sectionE) sectionE.classList.remove('hidden');

    if (interviewCompany) {
      drawerInterviewCompany.innerHTML = parseMarkdown(interviewCompany);
      document.getElementById('sectionInterviewCompany').classList.remove('hidden');
    } else {
      document.getElementById('sectionInterviewCompany').classList.add('hidden');
    }

    if (interviewPrep) {
      drawerInterviewPreparation.innerHTML = parseMarkdown(interviewPrep);
      document.getElementById('sectionInterviewPreparation').classList.remove('hidden');
    } else {
      document.getElementById('sectionInterviewPreparation').classList.add('hidden');
    }
  } else {
    if (sectionE) sectionE.classList.add('hidden');
  }

  // Reset Accordion: set first section (Section B) to active, others to inactive
  const accordionItems = detailsDrawer.querySelectorAll('.accordion-item');
  accordionItems.forEach((item, index) => {
    if (index === 0) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Show Drawer and Overlay
  drawerOverlay.classList.add('active');
  detailsDrawer.classList.add('active');
  document.body.style.overflow = 'hidden'; // prevent body scrolling
  
  // Reset drawer body scroll position
  detailsDrawer.querySelector('.drawer-body').scrollTop = 0;
}

/**
 * Close Details Drawer
 */
function closeDetailsDrawer() {
  drawerOverlay.classList.remove('active');
  detailsDrawer.classList.remove('active');
  document.body.style.overflow = ''; // restore body scrolling
}

/**
 * Date Parser helper (DD-MM-YYYY)
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    if (!isNaN(d.getTime())) return d;
  }
  const parsed = Date.parse(dateStr);
  if (isNaN(parsed)) {
    console.warn(`[interviewz] Could not parse date: "${dateStr}"`);
    return new Date(0);
  }
  return new Date(parsed);
}

/**
 * Formats a DD-MM-YYYY date into DD-MM-YYYY (We) format
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = parseDate(dateStr);
  if (date.getTime() === 0) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  return `${day}-${month}-${year} (${weekdays[date.getDay()]})`;
}

/**
 * Escapes HTML to prevent XSS injection
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Simple Markdown-to-HTML parser that supports headers, bold, italics, and lists.
 */
function parseMarkdown(text) {
  if (!text) return '';
  
  // Escape HTML first to prevent XSS
  let html = escapeHtml(text);
  
  // Replace headers: ###, ##, #
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italics: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Split into trimmed, non-empty lines
  const lines = html.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');
  let inList = false;
  let result = [];
  
  function isSeparatorRow(line) {
    if (!line.startsWith('|') || !line.endsWith('|') || line.length <= 2) return false;
    const inner = line.slice(1, -1);
    return /^[:\-\s\|]+$/.test(inner) && inner.includes('-');
  }
  
  function parseTableCells(line) {
    return line.slice(1, -1).split('|').map(cell => cell.trim());
  }
  
  function parseAlignments(line) {
    return parseTableCells(line).map(cell => {
      const alignLeft = cell.startsWith(':');
      const alignRight = cell.endsWith(':');
      if (alignLeft && alignRight) return 'center';
      if (alignRight) return 'right';
      if (alignLeft) return 'left';
      return '';
    });
  }
  
  function generateTableHtml(headers, rows, alignments) {
    let tableHtml = '<table class="md-table">';
    tableHtml += '<thead><tr>';
    headers.forEach((header, idx) => {
      const align = alignments[idx] ? ` style="text-align: ${alignments[idx]}"` : '';
      tableHtml += `<th${align}>${header}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    rows.forEach(row => {
      tableHtml += '<tr>';
      for (let idx = 0; idx < headers.length; idx++) {
        const cell = row[idx] !== undefined ? row[idx] : '';
        const align = alignments[idx] ? ` style="text-align: ${alignments[idx]}"` : '';
        tableHtml += `<td${align}>${cell}</td>`;
      }
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    return tableHtml;
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if it's a table
    if (line.startsWith('|') && line.endsWith('|')) {
      if (i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        
        const headers = parseTableCells(line);
        const alignments = parseAlignments(lines[i + 1]);
        const rows = [];
        
        let j = i + 2;
        while (j < lines.length && lines[j].startsWith('|') && lines[j].endsWith('|')) {
          if (isSeparatorRow(lines[j])) {
            break;
          }
          rows.push(parseTableCells(lines[j]));
          j++;
        }
        
        result.push(generateTableHtml(headers, rows, alignments));
        i = j - 1;
        continue;
      }
    }
    
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      const content = line.substring(2).trim();
      result.push(`<li>${content}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (line.startsWith('<h') || line.startsWith('<table')) {
        result.push(line);
      } else {
        result.push(`<p>${line}</p>`);
      }
    }
  }
  
  if (inList) {
    result.push('</ul>');
  }
  
  return result.join('\n');
}

let analyticsChartInstance = null;

/**
 * Initialize and render the bottom analytics timeline chart using Chart.js
 */
function initAnalyticsChart(applications) {
  // Apply date range filter
  let chartApps = applications;
  if (selectedChartRange !== 'all') {
    const daysLimit = parseInt(selectedChartRange, 10);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - daysLimit);
    limitDate.setHours(0, 0, 0, 0);
    
    chartApps = applications.filter(app => {
      const date = parseDate(app['Create Date']);
      return date >= limitDate;
    });
  }

  // 1. Group applications by date
  const dateMap = {};
  
  chartApps.forEach(app => {
    const dateStr = (app['Create Date'] || '').trim();
    if (!dateStr) return;
    
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = { submissions: 0, rejected: 0, interviews: 0 };
    }
    
    dateMap[dateStr].submissions++;
    
    const status = (app['Application Status'] || '').trim().toLowerCase();
    if (status === 'rejected') {
      dateMap[dateStr].rejected++;
    }
    if (status.includes('interview')) {
      dateMap[dateStr].interviews++;
    }
  });

  // 2. Sort dates chronologically
  const sortedDates = Object.keys(dateMap).sort((a, b) => {
    return parseDate(a) - parseDate(b);
  });

  // 3. Prepare datasets
  const submissionsData = [];
  const rejectedData = [];
  const interviewsData = [];
  
  sortedDates.forEach(date => {
    submissionsData.push(dateMap[date].submissions);
    rejectedData.push(dateMap[date].rejected);
    interviewsData.push(dateMap[date].interviews);
  });

  // 4. Render Chart
  const canvasEl = document.getElementById('analyticsChart');
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  
  const chartLabels = sortedDates.map(dateStr => {
    const date = parseDate(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const weekdayLetter = weekdays[date.getDay()];
    return `${day}-${month} (${weekdayLetter})`;
  });

  if (analyticsChartInstance) {
    analyticsChartInstance.destroy();
  }

  analyticsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Total Submissions',
          data: submissionsData,
          borderColor: '#1a73e8', // Primary Blue
          backgroundColor: 'rgba(26, 115, 232, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: '#1a73e8',
          pointHoverRadius: 6
        },
        {
          label: 'Interviews Scheduled',
          data: interviewsData,
          borderColor: '#f9ab00', // Warning Yellow/Amber
          backgroundColor: 'rgba(249, 171, 0, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: '#f9ab00',
          pointHoverRadius: 6
        },
        {
          label: 'Rejected Applications',
          data: rejectedData,
          borderColor: '#d93025', // Error Red
          backgroundColor: 'rgba(217, 48, 37, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: '#d93025',
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              family: 'Roboto, sans-serif',
              size: 12,
              weight: '500'
            },
            color: '#5f6368'
          }
        },
        tooltip: {
          backgroundColor: '#202124',
          titleFont: { family: 'Roboto, sans-serif', size: 13, weight: 'bold' },
          bodyFont: { family: 'Roboto, sans-serif', size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return sortedDates[idx] || ''; // Full DD-MM-YYYY
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { family: 'Roboto, sans-serif', size: 11 },
            color: '#5f6368'
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            stepSize: 1,
            precision: 0,
            font: { family: 'Roboto, sans-serif', size: 11 },
            color: '#5f6368'
          },
          min: 0
        }
      }
    }
  });
}

/**
 * Tab Navigation Management
 * Toggles visibility of sections based on active navigation tab:
 * - Home: Filter Applications & Application Registry
 * - Dashboard: Application Stats & Graphs
 */
function initTabNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const filtersSection = document.querySelector('.filters-section');
  const resultsSection = document.querySelector('.results-section');
  const statsSection = document.querySelector('.stats-section');
  const analyticsSection = document.querySelector('.analytics-section');

  function switchTab(targetTab) {
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === targetTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (targetTab === 'home') {
      if (filtersSection) filtersSection.style.display = '';
      if (resultsSection) resultsSection.style.display = '';
      if (statsSection) statsSection.style.display = 'none';
      if (analyticsSection) analyticsSection.style.display = 'none';
    } else if (targetTab === 'dashboard') {
      if (filtersSection) filtersSection.style.display = 'none';
      if (resultsSection) resultsSection.style.display = 'none';
      if (statsSection) statsSection.style.display = '';
      if (analyticsSection) analyticsSection.style.display = '';

      // Re-trigger chart render to ensure correct layout and scaling
      if (rawApplications.length > 0) {
        try {
          initAnalyticsChart(rawApplications);
        } catch (error) {
          console.error("Failed to render analytics chart on tab switch:", error);
        }
      }
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Default to 'home' tab
  switchTab('home');
}
