/**
 * TalentTracker - Job Application Dashboard Logic
 */

// Configuration
const SHEET_EXPORT_URL = 'https://docs.google.com/spreadsheets/d/1LdXmp9wAildqYdRIyzA32BMMQIDDM2kT25lMrgYeRbk/export?format=csv';

// Form & API Configuration — all magic numbers and URLs in one place
const FORM_API_ENDPOINT             = 'https://newdawn.tail74eef3.ts.net/webhook/jappmotlet';
const NOTES_API_ENDPOINT            = 'https://newdawn.tail74eef3.ts.net/webhook/interprepnotes';
const FORM_TIMEOUT_MS               = 90_000;                  // AbortController timeout for all form submissions
const CACHE_TTL_MS                  = 24 * 60 * 60 * 1_000;   // 24-hour localStorage cache TTL
const FORM_TOAST_DURATION           = 5000;
const FORM_SUBMISSION_RESET_TIMEOUT = 10000;

/** Cached theme colours — read once from CSS custom properties at startup */
const theme = {};
function cacheThemeColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (v) => cs.getPropertyValue(v).trim();
  theme.primary = get('--color-primary') || '#1a73e8';
  theme.error = get('--color-error') || '#d93025';
  theme.warning = get('--color-warning') || '#f9ab00';
  theme.secondary = get('--color-text-secondary') || '#5f6368';
  theme.scores = [1, 2, 3, 4, 5].map(n =>
    get(`--color-score-${n}`) || ['#d93025', '#ff8da1', '#f9ab00', '#8bc34a', '#1e8e3e'][n - 1]
  );
}

/** Returns true when a string begins with http:// or https:// */
const isUrl = (v) => v.startsWith('http://') || v.startsWith('https://');

/**
 * Debounce utility — collapses rapid-fire calls into one delayed execution.
 * @param {Function} fn   - Function to debounce
 * @param {number}   wait - Milliseconds to wait after the last call
 */
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
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

// State variables
let currentApp = null;

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

class FormApp {
  constructor() {
    this.saveDraftTimer = null;
    this.isSubmitting = false;
    this.initDoms();
    this.initEventListeners();
    this.loadDraft();
    this.initCharacterCounters();
  }

  initDoms() {
    this.form = document.querySelector("#job_opening");
    this.submitBtn = document.querySelector("#submit_btn");
    this.spinner = document.querySelector("#job_spin");
    this.resetBtn = document.querySelector("#reset_btn");
    this.inputs = this.form.querySelectorAll('input, textarea');
    this.hiringTeam = document.querySelector("#hiring_team");
    this.jobDesc = document.querySelector("#job_description");
    this.companyDesc = document.querySelector("#company_description");
    this.jobDescCounter = document.querySelector("#job_description_counter");
    this.companyDescCounter = document.querySelector("#company_description_counter");
  }

  initEventListeners() {
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));

    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => this.handleReset());
    }

    // Auto-save on input with debounce
    this.inputs.forEach(input => {
      input.addEventListener('input', () => {
        this.saveDraft();
        if (input === this.jobDesc || input === this.companyDesc) {
          this.updateCounter(input);
        }
      });

      // Real-time validation
      input.addEventListener('blur', () => this.validateField(input));
    });

    // Hiring Team focus/blur behavior
    if (this.hiringTeam) {
      this.hiringTeam.addEventListener("focus", () => {
        if (this.hiringTeam.value === "Not Defined") {
          this.hiringTeam.value = "";
        }
      });
      this.hiringTeam.addEventListener("blur", () => {
        if (this.hiringTeam.value.trim() === "") {
          this.hiringTeam.value = "Not Defined";
        }
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') {
          // Only trigger if form is visible/active
          const newAppSec = document.querySelector('.new-application-section');
          if (newAppSec && newAppSec.style.display !== 'none') {
            this.form.requestSubmit();
          }
        }
      }
    });
  }

  validateField(input) {
    if (!input.checkValidity()) {
      input.classList.add('is-invalid');
    } else {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      setTimeout(() => input.classList.remove('is-valid'), 2000);
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    // Double-submit guard
    if (this.isSubmitting) return;

    if (!this.form.checkValidity()) {
      this.form.classList.add('was-validated');
      showToast('Please fill in all required fields correctly.', 'warning');

      // Focus and scroll to first invalid field
      const firstInvalid = this.form.querySelector(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      return;
    }

    this.isSubmitting = true;
    showToast('Submitting your application... Please wait for feedback.', 'info');

    await postForm(FORM_API_ENDPOINT, new FormData(this.form), {
      setLoading: (v) => this.setLoadingState(v),
      onSuccess:  ()  => this.handleSuccess(),
      onError:    (e) => this.handleError(e.name === 'AbortError'
        ? 'Submission error: Request timed out after 90 seconds.'
        : 'Submission error: ' + e.message),
    });

    this.isSubmitting = false;
  }

  setLoadingState(isLoading) {
    this.submitBtn.disabled = isLoading;
    if (this.resetBtn) {
      this.resetBtn.disabled = isLoading;
    }
    this.form.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    if (isLoading) {
      this.spinner.classList.remove("hidden");
      this.spinner.classList.add("active");
    } else {
      this.spinner.classList.remove("active");
      this.spinner.classList.add("hidden");
    }
  }

  handleSuccess() {
    showToast('Application submitted successfully!', 'success');

    // Clear draft after successful submission
    localStorage.removeItem('job_app_draft');

    setTimeout(() => {
      this.form.reset();
      this.form.classList.remove('was-validated');
      this.inputs.forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
      });
      if (this.hiringTeam) {
        this.hiringTeam.value = "Not Defined";
      }
      this.initCharacterCounters();

      // Auto-switch to Home tab
      if (typeof switchTab === 'function') {
        switchTab('home');
      }
    }, FORM_SUBMISSION_RESET_TIMEOUT);
  }

  handleError(message) {
    showToast(`Error: ${message}`, 'error');
  }

  handleReset() {
    // Two-click confirmation pattern – avoids native confirm() which browsers suppress
    if (!this.resetPending) {
      this.resetPending = true;
      const btn = this.resetBtn;
      const originalTitle = btn.getAttribute('title');
      btn.setAttribute('title', 'Click again to confirm reset');
      btn.classList.add('reset-confirm-pending');
      showToast('Click Reset again to confirm clearing the form.', 'warning');

      this._resetPendingTimer = setTimeout(() => {
        this.resetPending = false;
        btn.setAttribute('title', originalTitle);
        btn.classList.remove('reset-confirm-pending');
      }, 3000);
      return;
    }

    // Second click – confirmed, proceed with reset
    clearTimeout(this._resetPendingTimer);
    this.resetPending = false;
    if (this.resetBtn) {
      this.resetBtn.setAttribute('title', 'Reset Form');
      this.resetBtn.classList.remove('reset-confirm-pending');
    }

    // Explicitly clear every field
    this.inputs.forEach(input => {
      if (input === this.hiringTeam) {
        input.value = "Not Defined";
      } else {
        input.value = "";
      }
      input.classList.remove('is-valid', 'is-invalid');
    });

    this.form.classList.remove('was-validated');
    localStorage.removeItem('job_app_draft');
    this.initCharacterCounters();
    showToast('Form has been reset.', 'info');
  }

  saveDraft() {
    if (this.saveDraftTimer) {
      clearTimeout(this.saveDraftTimer);
    }
    this.saveDraftTimer = setTimeout(() => {
      const data = {};
      this.inputs.forEach(input => {
        data[input.name] = input.value;
      });
      localStorage.setItem('job_app_draft', JSON.stringify(data));
    }, 500);
  }

  loadDraft() {
    try {
      const draft = localStorage.getItem('job_app_draft');
      if (draft) {
        const data = JSON.parse(draft);
        this.inputs.forEach(input => {
          if (data[input.name]) {
            input.value = data[input.name];
          }
        });
        showToast('Restored your progress from draft.', 'info');
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
      localStorage.removeItem('job_app_draft');
    }
  }

  initCharacterCounters() {
    if (this.jobDesc) this.updateCounter(this.jobDesc);
    if (this.companyDesc) this.updateCounter(this.companyDesc);
  }

  updateCounter(input) {
    const length = input.value.length;
    if (input === this.jobDesc && this.jobDescCounter) {
      this.jobDescCounter.textContent = `${length} / 15000`;
    } else if (input === this.companyDesc && this.companyDescCounter) {
      this.companyDescCounter.textContent = `${length} / 15000`;
    }
  }
}

/**
 * Shared form submission utility.
 * Handles AbortController timeout, fetch, JSON result check, and error routing
 * so individual submit handlers only express their own success/error logic.
 *
 * @param {string}   url         - POST endpoint
 * @param {FormData} formData    - Payload
 * @param {object}   opts
 * @param {function} opts.setLoading - Called with true/false around the fetch
 * @param {function} opts.onSuccess  - Called when result.ok === true
 * @param {function} opts.onError    - Called with the Error on any failure
 */
async function postForm(url, formData, { setLoading, onSuccess, onError }) {
  setLoading(true);
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), FORM_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errText}`);
    }
    const result = await response.json();
    if (result.ok === true) {
      onSuccess(result);
    } else {
      throw new Error(result.message || 'The submission was not successful. Please try again.');
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[postForm] error:', err);
    onError(err);
  } finally {
    setLoading(false);
  }
}

let rawApplications = [];
let activeApplications = []; // Applications where status <> retired and status <> rejected
let filteredApplications = []; // Currently filtered applications
let selectedCompany = null;
let selectedJobTitle = null;
let selectedStatus = null;

let currentPage = 1;
let rowsPerPage = 10;

let companySelect, jobSelect, statusSelect;

/** true = charts need a full rebuild (set when new data arrives; cleared after render) */
let isDashboardDirty = true;

/** Module-level switchTab reference — assigned by initTabNavigation() */
let switchTab = null;

// DOM Elements
const syncStatusEl = document.getElementById('syncStatus');
const statTotalEl = document.getElementById('statTotal');
const statActiveAppsEl = document.getElementById('statActiveApps');
const statCompaniesEl = document.getElementById('statCompanies');
const statJobsEl = document.getElementById('statJobs');
const statInterviewsEl = document.getElementById('statInterviews');
const statConversionEl = document.getElementById('statConversion');
const statRejectionRateEl = document.getElementById('statRejectionRate');
const statAvgSuitabilityEl = document.getElementById('statAvgSuitability');
const statThisWeekEl = document.getElementById('statThisWeek');
const statThisMonthEl = document.getElementById('statThisMonth');

const btnResetFilters = document.getElementById('btnResetFilters');
const registryTableBody = document.getElementById('registryTableBody');
const noResultsEl = document.getElementById('noResults');
const resultsCountEl = document.getElementById('resultsCount');
const activeInterviewsCountEl = document.getElementById('activeInterviewsCount');
let currentSortVal = 'date-desc';

/** Debounced version of applyFilters — initialised in initializeApp(), used by filter dropdown callbacks */
let debouncedApplyFilters = null;

// Pagination + table container — cached at startup to avoid re-querying on every render
const tableContainer = document.querySelector('.registry-table-container');
const paginationInfo = document.getElementById('paginationInfo');
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');

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

// Drawer container elements — needed at module scope for event binding and drawer state checks
const drawerOverlay = document.getElementById('drawerOverlay');
const detailsDrawer = document.getElementById('detailsDrawer');
const btnCloseDrawer = document.getElementById('btnCloseDrawer');

// Initialize the Application
function initializeApp() {
  cacheThemeColors();
  debouncedApplyFilters = debounce(applyFilters, 80);

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
 * Helper to copy HTML of a target element as rich text for MS Word/Google Docs compatibility,
 * and show a temporary checkmark on the button.
 */
function copyElementHtml(button, targetElement) {
  if (!targetElement) return;
  const html = targetElement.innerHTML;
  const plainText = targetElement.innerText || targetElement.textContent || '';

  // Create blobs for both rich HTML and plain text fallback
  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([plainText], { type: 'text/plain' });

  const clipboardItem = new ClipboardItem({
    'text/html': htmlBlob,
    'text/plain': textBlob
  });

  navigator.clipboard.write([clipboardItem]).then(() => {
    button.classList.add('copied');
    const iconCopy = button.querySelector('.icon-copy');
    const iconCheck = button.querySelector('.icon-check');
    if (iconCopy) iconCopy.style.display = 'none';
    if (iconCheck) iconCheck.style.display = 'inline-block';

    setTimeout(() => {
      button.classList.remove('copied');
      if (iconCopy) iconCopy.style.display = 'inline-block';
      if (iconCheck) iconCheck.style.display = 'none';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy HTML: ', err);
  });
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

  // Registry refresh button — busts cache and forces a fresh network fetch
  const btnRefreshRegistry = document.getElementById('btnRefreshRegistry');
  if (btnRefreshRegistry) {
    btnRefreshRegistry.addEventListener('click', () => {
      btnRefreshRegistry.classList.add('is-refreshing');
      // Resolve the loading class once the sync status updates to success or error
      const observer = new MutationObserver(() => {
        const dot = syncStatusEl.querySelector('.status-dot');
        if (dot && (dot.classList.contains('ready') || dot.classList.contains('error'))) {
          btnRefreshRegistry.classList.remove('is-refreshing');
          observer.disconnect();
        }
      });
      observer.observe(syncStatusEl, { subtree: true, attributes: true, attributeFilter: ['class'] });
      fetchData(true);
    });
  }

  // Drawer Close Actions
  btnCloseDrawer.addEventListener('click', closeDetailsDrawer);
  drawerOverlay.addEventListener('click', closeDetailsDrawer);

  // Drawer Tab Click Event Listeners
  const drawerTabs = detailsDrawer.querySelectorAll('.drawer-tab');
  drawerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (!tab.classList.contains('disabled')) {
        selectTab(tab.id);
      }
    });
  });

  // Drawer Tabs Keyboard Navigation (Arrow keys Left/Right)
  const drawerTabsContainer = detailsDrawer.querySelector('.drawer-tabs');
  if (drawerTabsContainer) {
    drawerTabsContainer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const tabs = Array.from(drawerTabsContainer.querySelectorAll('.drawer-tab'));
        const enabledTabs = tabs.filter(t => !t.classList.contains('disabled'));
        const activeIndex = enabledTabs.findIndex(t => t.classList.contains('active'));

        let nextIndex = activeIndex;
        if (e.key === 'ArrowRight') {
          nextIndex = (activeIndex + 1) % enabledTabs.length;
        } else if (e.key === 'ArrowLeft') {
          nextIndex = (activeIndex - 1 + enabledTabs.length) % enabledTabs.length;
        }

        const nextTab = enabledTabs[nextIndex];
        if (nextTab) {
          selectTab(nextTab.id);
          nextTab.focus();
        }
      }
    });
  }

  // ESC Key to close dropdowns and drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      companySelect.close();
      jobSelect.close();
      statusSelect.close();
      closeDetailsDrawer();
    }
  });

  // Table sorting from header clicks
  document.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort-field');
      const currentVal = currentSortVal;
      const [currentField, currentDir] = currentVal.split('-');

      let newDir = 'asc';
      if (field === currentField) {
        newDir = currentDir === 'asc' ? 'desc' : 'asc';
      } else {
        newDir = field === 'date' ? 'desc' : 'asc';
      }

      currentSortVal = `${field}-${newDir}`;
      applyFilters(true);
    });
  });

  // Paging controls — module-level btnPrevPage / btnNextPage are used directly

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

  // Chart range toggle listener has been removed as timeframe filtering is no longer active.

  // Copy HTML buttons in Job Interview accordion
  const btnCopyCompany = document.getElementById('btnCopyInterviewCompany');
  if (btnCopyCompany) {
    btnCopyCompany.addEventListener('click', () => {
      const target = document.getElementById('drawerInterviewCompany');
      copyElementHtml(btnCopyCompany, target);
    });
  }

  const btnCopyPrep = document.getElementById('btnCopyInterviewPreparation');
  if (btnCopyPrep) {
    btnCopyPrep.addEventListener('click', () => {
      const target = document.getElementById('drawerInterviewPreparation');
      copyElementHtml(btnCopyPrep, target);
    });
  }

  const btnResetCompanyNotes = document.getElementById('btnResetInterviewCompanyNotes');
  if (btnResetCompanyNotes) {
    btnResetCompanyNotes.addEventListener('click', () => {
      const inp = document.getElementById('inputInterviewCompanyNotes');
      if (inp) {
        inp.value = '';
        showToast('Company notes reset', 'info');
      }
    });
  }

  const btnResetPrepNotes = document.getElementById('btnResetInterviewPreparationNotes');
  if (btnResetPrepNotes) {
    btnResetPrepNotes.addEventListener('click', () => {
      const inp = document.getElementById('inputInterviewPreparationNotes');
      if (inp) {
        inp.value = '';
        showToast('Preparation notes reset', 'info');
      }
    });
  }

  const formJobInterview = document.getElementById('jobinterview');
  if (formJobInterview) {
    formJobInterview.addEventListener('submit', (e) => {
      e.preventDefault();

      const companyNotesEl = document.getElementById('inputInterviewCompanyNotes');
      const prepNotesEl    = document.getElementById('inputInterviewPreparationNotes');

      const submitter = e.submitter;
      if (submitter) {
        if (submitter.id === 'btnSubmitInterviewCompanyNotes') {
          if (!companyNotesEl || companyNotesEl.value.trim() === '') {
            showToast('Please enter some notes before submitting', 'warning');
            return;
          }
        } else if (submitter.id === 'btnSubmitInterviewPreparationNotes') {
          if (!prepNotesEl || prepNotesEl.value.trim() === '') {
            showToast('Please enter some notes before submitting', 'warning');
            return;
          }
        }
      } else {
        // Fallback if submitted via enter key or other means: check that at least one field is filled
        const companyVal = companyNotesEl ? companyNotesEl.value.trim() : '';
        const prepVal    = prepNotesEl    ? prepNotesEl.value.trim()    : '';
        if (companyVal === '' && prepVal === '') {
          showToast('Please enter some notes before submitting', 'warning');
          return;
        }
      }

      submitJobInterviewForm();
    });
  }
}

let isInterviewSubmitting = false;

function setInterviewLoadingState(isLoading) {
  const form = document.getElementById('jobinterview');
  if (form) {
    form.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }

  // Disable/enable all submit, reset buttons, and textareas in the notes section
  const elements = [
    document.getElementById('btnSubmitInterviewCompanyNotes'),
    document.getElementById('btnResetInterviewCompanyNotes'),
    document.getElementById('btnSubmitInterviewPreparationNotes'),
    document.getElementById('btnResetInterviewPreparationNotes'),
    document.getElementById('inputInterviewCompanyNotes'),
    document.getElementById('inputInterviewPreparationNotes')
  ];
  elements.forEach(el => {
    if (el) el.disabled = isLoading;
  });
}

/**
 * Submit the Job Interview notes form to the webhook
 */
async function submitJobInterviewForm() {
  const form = document.getElementById('jobinterview');
  if (!form) return;

  // Double-submit guard
  if (isInterviewSubmitting) return;

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    showToast('Please fill in all required fields correctly.', 'warning');
    return;
  }

  isInterviewSubmitting = true;
  showToast('Submitting your notes... Please wait for feedback.', 'info');

  await postForm(NOTES_API_ENDPOINT, new FormData(form), {
    setLoading: (v) => setInterviewLoadingState(v),
    onSuccess: () => {
      form.classList.remove('was-validated');
      showToast('Notes submitted successfully!', 'success');
      // Patch the in-memory record immediately so the drawer reflects the change without waiting for a network round-trip
      if (currentApp) {
        const companyNotesEl = document.getElementById('inputInterviewCompanyNotes');
        const prepNotesEl    = document.getElementById('inputInterviewPreparationNotes');
        currentApp['Interview_Company_Notes']     = companyNotesEl ? companyNotesEl.value.trim() : '';
        currentApp['Interview_Preparation_Notes'] = prepNotesEl    ? prepNotesEl.value.trim()    : '';
      }
      // Schedule a silent background sync to confirm server state after 3 seconds
      setTimeout(fetchData, 3000);
    },
    onError: (e) => {
      showToast(e.name === 'AbortError'
        ? 'Submission error: Request timed out after 90 seconds.'
        : 'Submission error: ' + e.message,
        'error');
    },
  });

  isInterviewSubmitting = false;
}

/**
 * Read cached CSV from localStorage. Returns the CSV string or null.
 */
function readCache() {
  const raw = localStorage.getItem('talent_tracker_csv_cache');
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.csv && obj.timestamp) {
      if (Date.now() - obj.timestamp < CACHE_TTL_MS) return obj.csv;
      console.log('[interviewz] Cache expired');
      return null;
    }
  } catch (e) {
    return raw; // Legacy: raw CSV string (no JSON wrapper)
  }
  return null;
}

/**
 * Write CSV text to localStorage with a timestamp.
 */
function writeCache(csvText) {
  try {
    localStorage.setItem(
      'talent_tracker_csv_cache',
      JSON.stringify({ csv: csvText, timestamp: Date.now() })
    );
  } catch (e) {
    console.warn('Unable to cache CSV to localStorage:', e);
  }
}

/**
 * Fetch and Parse Data with offline Local Storage support.
 * @param {boolean} [forceRefresh=false] — when true, the local cache is cleared
 *   before fetching so the response is always written fresh.
 */
function fetchData(forceRefresh = false) {
  if (forceRefresh) {
    localStorage.removeItem('talent_tracker_csv_cache');
  }

  const cachedCsvText = readCache();
  let hasLoadedFromCache = false;

  if (cachedCsvText) {
    try {
      parseAndInitializeData(cachedCsvText);
      hasLoadedFromCache = true;
      updateSyncStatus('syncing', 'Syncing (cached loaded)...');
    } catch (e) {
      console.error('Error parsing cached CSV data:', e);
      localStorage.removeItem('talent_tracker_csv_cache');
    }
  } else {
    updateSyncStatus('syncing', 'Fetching Live Spreadsheet...');
  }

  fetch(SHEET_EXPORT_URL)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.text();
    })
    .then(csvText => {
      writeCache(csvText);
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
 * Uses a char array accumulator (join at field boundary) instead of string
 * concatenation for better performance on large spreadsheets.
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const nextC = text[i + 1];

    if (c === '"') {
      if (inQuotes && nextC === '"') {
        currentField.push('"');
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentField.join(''));
      currentField = [];
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      currentRow.push(currentField.join(''));
      currentField = [];
      if (c === '\r' && nextC === '\n') i++;
      rows.push(currentRow);
      currentRow = [];
    } else {
      currentField.push(c);
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.join(''));
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
    app._index = i;
    rawApplications.push(app);
  }

  // 1) Filter out retired and rejected applications
  activeApplications = rawApplications.filter(app => {
    const status = (app['Application Status'] || '').trim().toLowerCase();
    return status !== 'retired' && status !== 'rejected';
  });

  // Populate dynamic filters & render lists
  updateFiltersUI();
  applyFilters();

  // Mark dashboard as needing a rebuild then render all widgets
  isDashboardDirty = true;
  renderAllDashboardWidgets(rawApplications);

  // If the details drawer is currently active, refresh its data
  if (detailsDrawer && detailsDrawer.classList.contains('active') && currentApp) {
    const updatedApp = rawApplications.find(a => a._index === currentApp._index);
    if (updatedApp) {
      // Preserve any optimistically-patched note fields from currentApp so that
      // a background sync triggered right after a successful submission does not
      // momentarily flash the old server values back into the textareas before
      // the sheet has had a chance to propagate the change.
      const NOTE_FIELDS = ['Interview_Company_Notes', 'Interview_Preparation_Notes'];
      NOTE_FIELDS.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(currentApp, field)) {
          updatedApp[field] = currentApp[field];
        }
      });
      openDetailsDrawer(updatedApp, true); // Keep the active tab
    }
  }
}

/**
 * Calculates dashboard statistics — single pass over rawApplications.
 */
function calculateStatistics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - distanceToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const companies = new Set();
  const jobs = new Set();
  let interviews = 0;
  let converted = 0;
  let rejected = 0;
  let totalSuit = 0;
  let suitCount = 0;
  let appsThisWeek = 0;
  let appsThisMonth = 0;

  rawApplications.forEach(app => {
    const status = (app['Application Status'] || '').trim().toLowerCase();
    const company = (app['Company Name'] || '').trim();
    const job = (app['Job Title'] || '').trim();
    const dateStr = (app['Create Date'] || '').trim();
    const suitVal = (app['Job_Suitability'] || app['Job Suitability'] || '').trim();

    if (company) companies.add(company);
    if (job) jobs.add(job);
    if (status.includes('interview')) interviews++;
    if (status.includes('interview') || status === 'offer' || status === 'ready') converted++;
    if (status === 'rejected') rejected++;

    const score = parseFloat(suitVal);
    if (!isNaN(score)) { totalSuit += score; suitCount++; }

    if (dateStr) {
      const appDate = parseDate(dateStr);
      appDate.setHours(0, 0, 0, 0);
      if (appDate >= startOfWeek) appsThisWeek++;
      if (appDate >= startOfMonth) appsThisMonth++;
    }
  });

  const total = rawApplications.length;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
  const avgSuitability = suitCount > 0 ? (totalSuit / suitCount).toFixed(1) : '0.0';

  if (statTotalEl) statTotalEl.textContent = total;
  if (statActiveAppsEl) statActiveAppsEl.textContent = activeApplications.length;
  if (statCompaniesEl) statCompaniesEl.textContent = companies.size;
  if (statJobsEl) statJobsEl.textContent = jobs.size;
  if (statInterviewsEl) statInterviewsEl.textContent = interviews;
  if (statConversionEl) statConversionEl.textContent = `${conversionRate}%`;
  if (statRejectionRateEl) statRejectionRateEl.textContent = `${rejectionRate}%`;
  if (statAvgSuitabilityEl) statAvgSuitabilityEl.textContent = `${avgSuitability}/5`;
  if (statThisWeekEl) statThisWeekEl.textContent = appsThisWeek;
  if (statThisMonthEl) statThisMonthEl.textContent = appsThisMonth;
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
    debouncedApplyFilters(true);
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
    debouncedApplyFilters(true);
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
    debouncedApplyFilters(true);
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
  const sortVal = currentSortVal;
  filteredApplications.sort((a, b) => {
    let comparison = 0;

    if (sortVal.startsWith('date')) {
      const dateA = parseDate(a['Create Date']);
      const dateB = parseDate(b['Create Date']);
      comparison = dateA - dateB; // Oldest first (asc)
      if (sortVal === 'date-desc') {
        comparison = dateB - dateA; // Newest first (desc)
        if (comparison === 0) {
          comparison = b._index - a._index;
        }
      } else if (sortVal === 'date-asc') {
        if (comparison === 0) {
          comparison = a._index - b._index;
        }
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
    } else if (sortVal.startsWith('status')) {
      const statusA = (a['Application Status'] || '').trim();
      const statusB = (b['Application Status'] || '').trim();
      comparison = statusA.localeCompare(statusB, undefined, { sensitivity: 'base', numeric: true });
      if (sortVal === 'status-desc') {
        comparison = statusB.localeCompare(statusA, undefined, { sensitivity: 'base', numeric: true });
      }
    } else if (sortVal.startsWith('suitability')) {
      const valA = (a['Job_Suitability'] || a['Job Suitability'] || '').trim();
      const valB = (b['Job_Suitability'] || b['Job Suitability'] || '').trim();
      const numA = parseInt(valA, 10);
      const numB = parseInt(valB, 10);

      const isNaN_A = isNaN(numA);
      const isNaN_B = isNaN(numB);

      if (isNaN_A && isNaN_B) {
        comparison = 0;
      } else if (isNaN_A) {
        comparison = 1; // Put NaNs at the end
      } else if (isNaN_B) {
        comparison = -1; // Put NaNs at the end
      } else {
        comparison = sortVal === 'suitability-desc' ? numB - numA : numA - numB;
      }
    }

    if (comparison === 0) {
      comparison = b._index - a._index;
    }

    return comparison;
  });

  renderTable();
  renderActiveInterviewsPanel(filteredApplications);
}

/**
 * Update sorting indicators on table headers
 */
function updateHeaderSortIndicators() {
  const currentVal = currentSortVal;
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

  if (filteredApplications.length === 0) {
    noResultsEl.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('section-hidden');
    return;
  }

  noResultsEl.classList.add('hidden');
  if (tableContainer) tableContainer.classList.remove('section-hidden');

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

    const company          = (app['Company Name'] || '').trim();
    const title            = (app['Job Title'] || '').trim();
    const status           = (app['Application Status'] || '').trim();
    const dateStr          = (app['Create Date'] || '').trim();
    const suitabilityScore = (app['Job_Suitability'] || app['Job Suitability'] || '').trim();
    const scoreNum         = parseInt(suitabilityScore, 10);
    const scoreClass       = !isNaN(scoreNum) && scoreNum >= 1 && scoreNum <= 5 ? `score-${scoreNum}` : '';
    const statusClass      = status.toLowerCase().replace(/\s+/g, '-');

    // Title cell
    const titleTd   = document.createElement('td');
    const titleSpan = document.createElement('span');
    titleSpan.className   = 'table-job-title';
    titleSpan.textContent = title;
    titleTd.appendChild(titleSpan);

    // Company cell
    const companyTd   = document.createElement('td');
    const companySpan = document.createElement('span');
    companySpan.className   = 'table-company';
    companySpan.textContent = company;
    companyTd.appendChild(companySpan);

    // Status cell
    const statusTd   = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.className   = `status-badge ${statusClass}`;
    statusSpan.textContent = status;
    statusTd.appendChild(statusSpan);

    // Date cell
    const dateTd   = document.createElement('td');
    const dateSpan = document.createElement('span');
    dateSpan.className   = 'table-date';
    dateSpan.textContent = formatDisplayDate(dateStr);
    dateTd.appendChild(dateSpan);

    // Suitability cell
    const suitTd = document.createElement('td');
    if (suitabilityScore) {
      const suitSpan = document.createElement('span');
      suitSpan.className   = `score-badge ${scoreClass}`;
      suitSpan.textContent = `Score: ${suitabilityScore}`;
      suitTd.appendChild(suitSpan);
    } else {
      const dash = document.createElement('span');
      dash.style.color  = 'var(--color-text-secondary)';
      dash.textContent  = '-';
      suitTd.appendChild(dash);
    }

    // Action cell — SVG is static markup, safe to use innerHTML here
    const actionTd  = document.createElement('td');
    const actionBtn = document.createElement('button');
    actionBtn.type      = 'button';
    actionBtn.className = 'table-action-btn';
    actionBtn.innerHTML = `View Detail
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
    actionTd.appendChild(actionBtn);

    row.append(titleTd, companyTd, statusTd, dateTd, suitTd, actionTd);
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
 * Switch Active Drawer Tab
 */
function selectTab(tabId) {
  const tabs = document.querySelectorAll('.drawer-tab');
  const panes = document.querySelectorAll('.drawer-tab-pane');

  tabs.forEach(tab => {
    if (tab.id === tabId) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    } else {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });

  const selectedTabEl = document.getElementById(tabId);
  const targetPaneId = selectedTabEl ? selectedTabEl.getAttribute('aria-controls') : '';

  panes.forEach(pane => {
    if (pane.id === targetPaneId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

/**
 * DrawerController
 * Encapsulates all open/close/populate logic for the details drawer.
 * Mirrors the FormApp / FacetedSelect class pattern already in the codebase.
 * DOM elements are resolved locally inside each method (no module-scope drawer refs needed).
 */
const DrawerController = {
  /** Open the drawer for a given application record. */
  open(app, keepActiveTab = false) {
    currentApp = app;
    this._populateHeader(app);
    this._populateOverview(app);
    this._populateSuitability(app);
    this._populateInterview(app);

    if (!keepActiveTab) selectTab('tabOverview');

    drawerOverlay.classList.add('active');
    detailsDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    detailsDrawer.querySelector('.drawer-body').scrollTop = 0;
  },

  /** Close the drawer. */
  close() {
    drawerOverlay.classList.remove('active');
    detailsDrawer.classList.remove('active');
    document.body.style.overflow = '';
  },

  // ─── Private helpers ──────────────────────────────────────────────────────

  _populateHeader(app) {
    const status       = (app['Application Status'] || '').trim();
    const jobTitleVal  = (app['Job Title']           || '').trim();
    const companyVal   = (app['Company Name']        || '').trim();

    const badge = document.getElementById('drawerStatusBadge');
    if (badge) {
      badge.className   = `badge status-badge ${status.toLowerCase().replace(/\s+/g, '-')}`;
      badge.textContent = status;
    }

    const titleDisplay   = document.getElementById('drawerJobTitleDisplay');
    const companyDisplay = document.getElementById('drawerCompanyNameDisplay');
    const titleInput     = document.getElementById('drawerJobTitle');
    const companyInput   = document.getElementById('drawerCompanyName');
    const dateEl         = document.getElementById('drawerDate');

    if (titleDisplay)   titleDisplay.textContent   = jobTitleVal;
    if (companyDisplay) companyDisplay.textContent = companyVal;
    if (titleInput)     titleInput.value           = jobTitleVal;
    if (companyInput)   companyInput.value         = companyVal;
    if (dateEl)         dateEl.textContent         = formatDisplayDate((app['Create Date'] || '').trim());
  },

  _populateOverview(app) {
    // Hiring Team
    const hiringTeamVal = (app['Hiring Team'] || '').trim();
    const hiringTeamEl  = document.getElementById('drawerHiringTeam');
    if (hiringTeamEl) {
      if (hiringTeamVal) {
        if (isUrl(hiringTeamVal)) {
          hiringTeamEl.innerHTML = `<a href="${escapeHtml(hiringTeamVal)}" target="_blank" class="inline-link-btn">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            Link
          </a>`;
        } else {
          hiringTeamEl.textContent = hiringTeamVal;
        }
      } else {
        hiringTeamEl.textContent = 'Not Specified';
      }
    }

    // Follow-up
    const followUpVal = (app['Follow-Up'] || '').trim();
    const followUpEl  = document.getElementById('drawerFollowUp');
    if (followUpEl) {
      if (followUpVal) {
        if (isUrl(followUpVal)) {
          followUpEl.innerHTML = `<a href="${escapeHtml(followUpVal)}" target="_blank" class="inline-link-btn">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            Link
          </a>`;
        } else {
          followUpEl.textContent = followUpVal;
        }
      } else {
        followUpEl.textContent = 'Not Specified';
      }
    }

    // Comments
    const comments   = (app['Comments'] || '').trim();
    const commentsEl = document.getElementById('drawerComments');
    if (commentsEl) commentsEl.textContent = comments || '-';

    // Descriptions
    const jobDescEl  = document.getElementById('drawerJobDescription');
    const coDescEl   = document.getElementById('drawerCompanyDescription');
    if (jobDescEl) jobDescEl.textContent = (app['Job Description']     || 'No description provided.').trim();
    if (coDescEl)  coDescEl.textContent  = (app['Company Description'] || 'No company profile available.').trim();

    // Links
    const jobUrl        = (app['Job URL']        || '').trim();
    const companyFolder = (app['Company_Folder'] || '').trim();
    const linkJobUrl    = document.getElementById('linkJobUrl');
    const linkJobAnchor = document.getElementById('linkJobUrlAnchor');
    const linkFolder    = document.getElementById('linkCompanyFolder');

    if (linkJobUrl) linkJobUrl.value = jobUrl;
    if (linkJobAnchor) {
      if (jobUrl) { linkJobAnchor.href = jobUrl; linkJobAnchor.style.display = ''; }
      else        { linkJobAnchor.style.display = 'none'; }
    }
    if (linkFolder) {
      if (companyFolder) { linkFolder.href = companyFolder; linkFolder.style.display = ''; }
      else               { linkFolder.style.display = 'none'; }
    }
  },

  _populateSuitability(app) {
    const score      = (app['Job_Suitability'] || app['Job Suitability'] || '').trim();
    const evaluation = (app['Job_Suitability_Evaluation'] || app['Job Suitability Evaluation'] || '').trim();
    const tabSuit    = document.getElementById('tabSuitability');

    if (score || evaluation) {
      if (tabSuit) { tabSuit.classList.remove('disabled'); tabSuit.removeAttribute('disabled'); }

      const fillEl    = document.getElementById('scoreCircleFill');
      const circleEl  = document.getElementById('suitabilityScoreCircle');
      const scoreDisp = document.getElementById('drawerSuitabilityScore');
      const scoreBox  = document.getElementById('drawerSuitabilityScoreContainer');
      const evalDisp  = document.getElementById('drawerSuitabilityEval');
      const evalSec   = document.getElementById('sectionSuitabilityEval');

      if (score) {
        if (scoreDisp) scoreDisp.textContent = score;
        const scoreNum   = parseInt(score, 10);
        const scoreClass = !isNaN(scoreNum) && scoreNum >= 1 && scoreNum <= 5 ? `score-${scoreNum}` : '';
        if (circleEl) circleEl.className = `suitability-score-circle ${scoreClass}`;
        if (fillEl) {
          const pct = !isNaN(scoreNum) && scoreNum >= 1 && scoreNum <= 5 ? scoreNum / 5 : 0;
          fillEl.style.strokeDashoffset = 251.2 * (1 - pct);
        }
        if (scoreBox) scoreBox.style.display = '';
      } else {
        if (scoreBox) scoreBox.style.display = 'none';
        if (fillEl)   fillEl.style.strokeDashoffset = 251.2;
        if (circleEl) circleEl.className = 'suitability-score-circle';
      }

      if (evaluation) {
        if (evalDisp) evalDisp.textContent = evaluation;
        if (evalSec)  evalSec.classList.remove('hidden');
      } else {
        if (evalSec) evalSec.classList.add('hidden');
      }
    } else {
      if (tabSuit) { tabSuit.classList.add('disabled'); tabSuit.setAttribute('disabled', 'true'); }
    }
  },

  _populateInterview(app) {
    const interviewCompany = (app['Interview_Company']    || '').trim();
    const interviewPrep    = (app['Interview_Preparation'] || '').trim();
    const tabInterview     = document.getElementById('tabInterview');

    if (interviewCompany || interviewPrep) {
      if (tabInterview) { tabInterview.classList.remove('disabled'); tabInterview.removeAttribute('disabled'); }

      const companyContentEl = document.getElementById('drawerInterviewCompany');
      const prepContentEl    = document.getElementById('drawerInterviewPreparation');
      const btnCopyCompany   = document.getElementById('btnCopyInterviewCompany');
      const btnCopyPrep      = document.getElementById('btnCopyInterviewPreparation');
      const companyNotesEl   = document.getElementById('inputInterviewCompanyNotes');
      const prepNotesEl      = document.getElementById('inputInterviewPreparationNotes');

      if (companyContentEl) companyContentEl.innerHTML = interviewCompany ? parseMarkdown(interviewCompany) : '-';
      if (btnCopyCompany)   btnCopyCompany.style.display = interviewCompany ? '' : 'none';

      if (prepContentEl) prepContentEl.innerHTML = interviewPrep ? parseMarkdown(interviewPrep) : '-';
      if (btnCopyPrep)   btnCopyPrep.style.display = interviewPrep ? '' : 'none';

      if (companyNotesEl) companyNotesEl.value = (app['Interview_Company_Notes']    || '').trim();
      if (prepNotesEl)    prepNotesEl.value    = (app['Interview_Preparation_Notes'] || '').trim();

      // Re-enable editing now that textareas content is refreshed
      setInterviewLoadingState(false);
    } else {
      if (tabInterview) { tabInterview.classList.add('disabled'); tabInterview.setAttribute('disabled', 'true'); }
    }
  },
};

/**
 * Thin wrappers preserved for backward compatibility with all existing callers.
 */
function openDetailsDrawer(app, keepActiveTab = false) {
  DrawerController.open(app, keepActiveTab);
}

function closeDetailsDrawer() {
  DrawerController.close();
}




let cumulativeSubmissionsChartInstance = null;

function initCumulativeSubmissionsChart(applications) {
  const canvasEl = document.getElementById('cumulativeSubmissionsChart');
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');

  // 1. Group applications by date
  const dateMap = {};

  applications.forEach(app => {
    const dateStr = (app['Create Date'] || '').trim();
    if (!dateStr) return;

    if (!dateMap[dateStr]) {
      dateMap[dateStr] = 0;
    }
    dateMap[dateStr]++;
  });

  // 2. Sort dates chronologically
  const sortedDates = Object.keys(dateMap).sort((a, b) => {
    return parseDate(a) - parseDate(b);
  });

  // 3. Prepare cumulative dataset
  let runningTotal = 0;
  const cumulativeData = [];
  sortedDates.forEach(date => {
    runningTotal += dateMap[date];
    cumulativeData.push(runningTotal);
  });

  // 4. Render Chart
  const chartLabels = sortedDates.map(dateStr => {
    const date = parseDate(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const weekdayLetter = weekdays[date.getDay()];
    return `${day}-${month} (${weekdayLetter})`;
  });

  const primaryColor = theme.primary;
  const textColor = theme.secondary;

  if (cumulativeSubmissionsChartInstance) {
    cumulativeSubmissionsChartInstance.data.labels = chartLabels;
    cumulativeSubmissionsChartInstance.data.datasets[0].data = cumulativeData;
    cumulativeSubmissionsChartInstance.update('none');
    return;
  }

  cumulativeSubmissionsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Total Submissions',
          data: cumulativeData,
          borderColor: primaryColor,
          backgroundColor: primaryColor + '14', // translucent
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: primaryColor,
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
            color: textColor
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
            color: textColor
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            stepSize: 5,
            precision: 0,
            font: { family: 'Roboto, sans-serif', size: 11 },
            color: textColor
          },
          min: 0
        }
      }
    }
  });
}

let statusSplitChartInstance = null;

function initStatusSplitChart(applications) {
  const canvasEl = document.getElementById('statusSplitChart');
  if (!canvasEl) return;

  const ctx = canvasEl.getContext('2d');

  let rejected = 0;
  let applied = 0;
  let interviews = 0;
  let other = 0;

  applications.forEach(app => {
    const status = (app['Application Status'] || '').trim().toLowerCase();
    if (status === 'rejected') rejected++;
    else if (status.includes('interview')) interviews++;
    else if (status === 'applied') applied++;
    else if (status) other++;
  });

  const data = [rejected, applied, interviews];
  const labels = ['Rejected', 'Applied (Pending)', 'Interviews'];

  const primaryColor = theme.primary;
  const warningColor = theme.warning;
  const errorColor = theme.error;
  const textColor = theme.secondary;

  const colors = [errorColor, primaryColor, warningColor];

  if (other > 0) {
    data.push(other);
    labels.push('Other');
    colors.push('#70757a');
  }

  if (statusSplitChartInstance) {
    statusSplitChartInstance.data.labels = labels;
    statusSplitChartInstance.data.datasets[0].data = data;
    statusSplitChartInstance.data.datasets[0].backgroundColor = colors;
    statusSplitChartInstance.update('none');
    return;
  }

  statusSplitChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Status Split',
        data: data,
        backgroundColor: colors,
        borderRadius: 6,
        maxBarThickness: 45
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#202124',
          titleFont: { family: 'Roboto, sans-serif', size: 12, weight: 'bold' },
          bodyFont: { family: 'Roboto, sans-serif', size: 12 },
          cornerRadius: 8,
          callbacks: {
            label: (item) => {
              const total = data.reduce((a, b) => a + b, 0);
              const val = data[item.dataIndex];
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return ` ${item.label}: ${val} (${pct}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Roboto, sans-serif', size: 11 },
            color: textColor
          }
        },
        y: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            stepSize: 5,
            precision: 0,
            font: { family: 'Roboto, sans-serif', size: 11 },
            color: textColor
          },
          min: 0
        }
      }
    }
  });
}

let suitabilityBarChartInstance = null;

function initSuitabilityBarChart(applications) {
  const canvasEl = document.getElementById('suitabilityBarChart');
  if (!canvasEl) return;

  const ctx = canvasEl.getContext('2d');

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  applications.forEach(app => {
    const scoreVal = (app['Job_Suitability'] || app['Job Suitability'] || '').trim();
    const score = parseInt(scoreVal, 10);
    if (score >= 1 && score <= 5) {
      counts[score]++;
    }
  });

  const labels = ['Score 1', 'Score 2', 'Score 3', 'Score 4', 'Score 5'];
  const data = [counts[1], counts[2], counts[3], counts[4], counts[5]];

  const [color1, color2, color3, color4, color5] = theme.scores;
  const textColor = theme.secondary;

  const colors = [color1, color2, color3, color4, color5];

  if (suitabilityBarChartInstance) {
    suitabilityBarChartInstance.data.datasets[0].data = data;
    suitabilityBarChartInstance.update('none');
    return;
  }

  suitabilityBarChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Applications',
        data: data,
        backgroundColor: colors,
        borderRadius: 4,
        maxBarThickness: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#202124',
          titleFont: { family: 'Roboto, sans-serif', size: 12, weight: 'bold' },
          bodyFont: { family: 'Roboto, sans-serif', size: 12 },
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Roboto, sans-serif', size: 11 },
            color: textColor
          }
        },
        y: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            stepSize: 5,
            precision: 0,
            font: { family: 'Roboto, sans-serif', size: 11 },
            color: textColor
          },
          min: 0
        }
      }
    }
  });
}

let topCompaniesChartInstance = null;

function initTopCompaniesChart(applications) {
  const canvasEl = document.getElementById('topCompaniesChart');
  if (!canvasEl) return;

  const ctx = canvasEl.getContext('2d');

  const companyCounts = {};
  applications.forEach(app => {
    const company = (app['Company Name'] || '').trim();
    if (company) {
      companyCounts[company] = (companyCounts[company] || 0) + 1;
    }
  });

  const sortedCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const labels = sortedCompanies.map(item => item[0]);
  const data = sortedCompanies.map(item => item[1]);

  const primaryColor = theme.primary;
  const textColor = theme.secondary;

  if (topCompaniesChartInstance) {
    topCompaniesChartInstance.data.labels = labels;
    topCompaniesChartInstance.data.datasets[0].data = data;
    topCompaniesChartInstance.update('none');
    return;
  }

  topCompaniesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Applications',
        data: data,
        backgroundColor: primaryColor + 'cc',
        hoverBackgroundColor: primaryColor,
        borderRadius: 4,
        maxBarThickness: 20
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#202124',
          titleFont: { family: 'Roboto, sans-serif', size: 12, weight: 'bold' },
          bodyFont: { family: 'Roboto, sans-serif', size: 12 },
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            stepSize: 1,
            precision: 0,
            font: { family: 'Roboto, sans-serif', size: 11 },
            color: textColor
          },
          min: 0
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: 'Roboto, sans-serif', size: 10 },
            color: textColor
          }
        }
      }
    }
  });
}

function getLastComment(commentsStr) {
  if (!commentsStr) return 'No comments available.';
  const lines = commentsStr.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');
  if (lines.length === 0) return 'No comments available.';
  return lines[lines.length - 1];
}

function parseCommentLine(line) {
  const match = line.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    return `<span class="comment-date">[${escapeHtml(match[1])}]</span> <span class="comment-text">${escapeHtml(match[2])}</span>`;
  }
  return escapeHtml(line);
}

function renderActiveInterviewsPanel(applications) {
  const sectionEl = document.getElementById('activeInterviewsSection');
  const gridEl = document.getElementById('activeInterviewsGrid');
  if (!sectionEl || !gridEl) return;

  const interviewApps = applications.filter(app => {
    const status = (app['Application Status'] || '').trim().toLowerCase();
    return status.includes('interview');
  });

  const activeTabBtn = document.querySelector('.nav-btn.active');
  const isHomeTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') === 'home' : true;

  if (!isHomeTab) {
    sectionEl.classList.add('section-hidden');
    return;
  }

  const hasActiveFilters = !!(selectedCompany || selectedJobTitle || selectedStatus);

  if (interviewApps.length === 0) {
    if (applications.length === 0) {
      sectionEl.classList.remove('section-hidden');
      if (activeInterviewsCountEl) {
        activeInterviewsCountEl.textContent = '0';
      }
      gridEl.innerHTML = '<div class="no-results-text" style="grid-column: 1 / -1; text-align: center; color: var(--color-text-secondary); font-size: 0.95rem; padding: 1.5rem 0;">No results</div>';
      return;
    } else if (hasActiveFilters) {
      sectionEl.classList.remove('section-hidden');
      if (activeInterviewsCountEl) {
        activeInterviewsCountEl.textContent = '0';
      }
      gridEl.innerHTML = '<div class="no-results-text" style="grid-column: 1 / -1; text-align: center; color: var(--color-text-secondary); font-size: 0.95rem; padding: 1.5rem 0;">No results for current filters.</div>';
      return;
    } else {
      sectionEl.classList.add('section-hidden');
      return;
    }
  }

  sectionEl.classList.remove('section-hidden');
  if (activeInterviewsCountEl) {
    activeInterviewsCountEl.textContent = interviewApps.length;
  }
  gridEl.innerHTML = '';

  interviewApps.forEach(app => {
    const company     = (app['Company Name'] || '').trim();
    const title       = (app['Job Title'] || '').trim();
    const scoreVal    = (app['Job_Suitability'] || app['Job Suitability'] || '').trim();
    const commentsVal = (app['Comments'] || '').trim();
    const followUpVal = (app['Follow-Up'] || '').trim();

    const scoreNum   = parseInt(scoreVal, 10);
    const scoreClass = !isNaN(scoreNum) && scoreNum >= 1 && scoreNum <= 5 ? `score-${scoreNum}` : '';

    const lastCommentLine  = getLastComment(commentsVal);
    const formattedComment = parseCommentLine(lastCommentLine);

    // ── Card shell ────────────────────────────────────────────────────────
    const card = document.createElement('div');
    card.className        = 'interview-card';
    card.dataset.appIndex = app._index;

    // ── Header ────────────────────────────────────────────────────────────
    const header    = document.createElement('div');
    header.className = 'interview-card-header';

    const headerLeft = document.createElement('div');

    const companyH4 = document.createElement('h4');
    companyH4.className   = 'interview-company';
    companyH4.textContent = company;

    const titleP = document.createElement('p');
    titleP.className   = 'interview-title';
    titleP.textContent = title;

    headerLeft.append(companyH4, titleP);
    header.appendChild(headerLeft);

    if (scoreVal) {
      const scoreBadge = document.createElement('span');
      scoreBadge.className   = `score-badge ${scoreClass}`;
      scoreBadge.textContent = `Suitability: ${scoreVal}`;
      header.appendChild(scoreBadge);
    }

    // ── Body ──────────────────────────────────────────────────────────────
    const body     = document.createElement('div');
    body.className = 'interview-card-body';

    const activityDiv = document.createElement('div');
    activityDiv.className = 'interview-latest-activity';

    const activityLabel = document.createElement('span');
    activityLabel.className   = 'activity-label';
    activityLabel.textContent = 'Latest Activity';

    // formattedComment is already escaped by parseCommentLine, safe to set via innerHTML
    const activityContent = document.createElement('div');
    activityContent.className = 'activity-content';
    activityContent.innerHTML = formattedComment;

    activityDiv.append(activityLabel, activityContent);
    body.appendChild(activityDiv);

    // ── Footer ────────────────────────────────────────────────────────────
    const footer     = document.createElement('div');
    footer.className = 'interview-card-footer';

    if (followUpVal) {
      if (isUrl(followUpVal)) {
        const followUpLink = document.createElement('a');
        followUpLink.href      = followUpVal;
        followUpLink.target    = '_blank';
        followUpLink.className = 'interview-btn';
        // SVG is static, safe to use innerHTML
        followUpLink.innerHTML = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg> Follow Up`;
        footer.appendChild(followUpLink);
      } else {
        const followUpSpan = document.createElement('span');
        followUpSpan.className   = 'followup-text';
        followUpSpan.textContent = `Follow Up: ${followUpVal}`;
        footer.appendChild(followUpSpan);
      }
    }

    const viewBtn = document.createElement('button');
    viewBtn.type      = 'button';
    viewBtn.className = 'interview-btn secondary view-detail-trigger';
    viewBtn.innerHTML = `View Details <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
    footer.appendChild(viewBtn);

    card.append(header, body, footer);

    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailsDrawer(app);
    });

    gridEl.appendChild(card);
  });
}

function renderAllDashboardWidgets(applications) {
  if (applications.length === 0) return;
  try {
    calculateStatistics();
    initCumulativeSubmissionsChart(applications);
    initStatusSplitChart(applications);
    initSuitabilityBarChart(applications);
    initTopCompaniesChart(applications);
    renderActiveInterviewsPanel(filteredApplications);
    isDashboardDirty = false; // charts are up to date
  } catch (error) {
    console.error("Error rendering dashboard widgets:", error);
  }
}


/**
 * Tab Navigation Management
 */
function initTabNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const filtersSection = document.querySelector('.filters-section');
  const resultsSection = document.querySelector('.results-section');
  const activeInterviewsSection = document.getElementById('activeInterviewsSection');
  const statsSection = document.querySelector('.stats-section');
  const analyticsSection = document.querySelector('.analytics-section');
  const newApplicationSection = document.querySelector('.new-application-section');

  /** Toggle a section's visibility via the .section-hidden utility class */
  const show = (el) => el && el.classList.remove('section-hidden');
  const hide = (el) => el && el.classList.add('section-hidden');

  switchTab = function (targetTab) {
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
    });

    if (targetTab === 'home') {
      show(filtersSection);
      show(resultsSection);
      if (rawApplications.length > 0) renderActiveInterviewsPanel(filteredApplications);
      hide(statsSection);
      hide(analyticsSection);
      hide(newApplicationSection);
    } else if (targetTab === 'dashboard') {
      hide(filtersSection);
      hide(resultsSection);
      hide(activeInterviewsSection);
      show(statsSection);
      show(analyticsSection);
      hide(newApplicationSection);

      // Only rebuild charts when new data has arrived since the last render
      if (rawApplications.length > 0 && isDashboardDirty) {
        try {
          renderAllDashboardWidgets(rawApplications);
        } catch (error) {
          console.error('Failed to render dashboard widgets on tab switch:', error);
        }
      }
    } else if (targetTab === 'new-application') {
      hide(filtersSection);
      hide(resultsSection);
      hide(activeInterviewsSection);
      hide(statsSection);
      hide(analyticsSection);
      show(newApplicationSection);

      // Lazy-init FormApp on first tab visit
      if (!window._formApp) {
        window._formApp = new FormApp();
      }
    }
  };

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  // Default to 'home' tab
  switchTab('home');
}

/**
 * Dynamic Toast Alert Utility
 */
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `<span class="toast-message">${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  // Trigger transition
  setTimeout(() => toast.classList.add('show'), 10);

  // Fade out and remove
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 4000);
}
