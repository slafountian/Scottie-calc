// Fraction Calculator Logic

class Fraction {
    constructor(numerator, denominator) {
        this.numerator = numerator;
        this.denominator = denominator || 1;
        this.simplify();
    }

    // Find Greatest Common Divisor
    gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b !== 0) {
            let temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    // Simplify the fraction
    simplify() {
        if (this.denominator === 0) {
            this.numerator = 0;
            this.denominator = 1;
            return;
        }

        const divisor = this.gcd(this.numerator, this.denominator);
        this.numerator = this.numerator / divisor;
        this.denominator = this.denominator / divisor;

        // Handle negative fractions
        if (this.denominator < 0) {
            this.numerator = -this.numerator;
            this.denominator = -this.denominator;
        }
    }

    // Add two fractions
    add(other) {
        const newNum = this.numerator * other.denominator + other.numerator * this.denominator;
        const newDen = this.denominator * other.denominator;
        return new Fraction(newNum, newDen);
    }

    // Subtract two fractions
    subtract(other) {
        const newNum = this.numerator * other.denominator - other.numerator * this.denominator;
        const newDen = this.denominator * other.denominator;
        return new Fraction(newNum, newDen);
    }

    // Convert to inches format string (for display)
    toInchesString() {
        if (this.denominator === 1) {
            return `${this.numerator}"`;
        }

        const whole = Math.floor(Math.abs(this.numerator) / this.denominator);
        const remainder = Math.abs(this.numerator) % this.denominator;
        const isNegative = this.numerator < 0;

        if (whole === 0) {
            return `${isNegative ? '-' : ''}${remainder}/${this.denominator}"`;
        }

        if (remainder === 0) {
            return `${isNegative ? '-' : ''}${whole}"`;
        }

        return `${isNegative ? '-' : ''}${whole} ${remainder}/${this.denominator}"`;
    }

    // Convert to decimal
    toDecimal() {
        return this.numerator / this.denominator;
    }

    // Convert to string
    toString() {
        if (this.denominator === 1) {
            return this.numerator.toString();
        }
        return `${this.numerator}/${this.denominator}`;
    }
}

// DOM Elements
const measurementsContainer = document.getElementById('measurementsContainer');
const runningTotal = document.getElementById('runningTotal');
const runningTotalInches = document.getElementById('runningTotalInches');
const addMeasurementBtn = document.getElementById('addMeasurementBtn');
const clearBtn = document.getElementById('clearBtn');
const fractionButtons = document.querySelectorAll('.fraction-btn');
const resultDisplay = document.getElementById('resultDisplay');
// Keypad elements
let keypadContainer = null;
let keypadGrid = null;
let keypadLabel = null;
let currentKeypadInput = null;
let isKeypadInteracting = false;
// historySelect will be initialized in DOMContentLoaded

// State
let measurements = [];
let selectedMeasurementIndex = null;
const MAX_MEASUREMENTS = 20;

// History
const HISTORY_KEY = 'calculator_history';
const MAX_HISTORY = 20;
let historySelect = null;

// Helper function to convert feet + inches + fraction to a single fraction (in inches)
function feetInchesToFraction(feet, inches, num, den) {
    const wholeFeet = parseInt(feet) || 0;
    const wholeInches = parseInt(inches) || 0;
    const numerator = parseInt(num) || 0;
    const denominator = parseInt(den) || 1;
    
    const totalInches = wholeFeet * 12 + wholeInches;
    const totalNumerator = totalInches * denominator + numerator;
    return new Fraction(totalNumerator, denominator);
}

// Parse history string (like "5' 3 1/2"" or "3 1/2""") into components
// Returns: {feet: number, inches: number, num: number, den: number}
function parseHistoryString(historyString) {
    let feet = 0;
    let inches = 0;
    let num = 0;
    let den = 1;
    
    // Remove quotes and trim
    let str = historyString.replace(/"/g, '').trim();
    
    // Check for negative
    const isNegative = str.startsWith('-');
    if (isNegative) {
        str = str.substring(1).trim();
    }
    
    // Parse feet (look for ' symbol)
    const feetMatch = str.match(/(\d+)\s*'/);
    if (feetMatch) {
        feet = parseInt(feetMatch[1]) || 0;
        str = str.replace(feetMatch[0], '').trim();
    }
    
    // Parse whole inches (number before fraction or at end)
    const wholeInchesMatch = str.match(/^(\d+)(?:\s|$)/);
    if (wholeInchesMatch) {
        inches = parseInt(wholeInchesMatch[1]) || 0;
        str = str.replace(wholeInchesMatch[0], '').trim();
    }
    
    // Parse fraction (look for "num/den" pattern)
    const fractionMatch = str.match(/(\d+)\s*\/\s*(\d+)/);
    if (fractionMatch) {
        num = parseInt(fractionMatch[1]) || 0;
        den = parseInt(fractionMatch[2]) || 1;
    }
    
    // If no fraction found but there's remaining numbers, treat as whole inches
    if (!fractionMatch && !wholeInchesMatch && str.match(/\d+/)) {
        const numMatch = str.match(/(\d+)/);
        if (numMatch) {
            inches = parseInt(numMatch[1]) || 0;
        }
    }
    
    // Apply negative sign to feet (will cascade in calculation)
    if (isNegative && (feet > 0 || inches > 0 || num > 0)) {
        // For simplicity, we'll set inches negative if feet is 0, or handle in the measurement
        // Actually, we'll populate positive and let user change operation button if needed
        // Or we could make feet negative
        if (feet === 0) {
            // If no feet, make inches negative by setting a flag or handling in populate function
            // For now, populate positive and user can use subtract button
        } else {
            feet = -feet;
        }
    }
    
    return { feet, inches, num, den, isNegative };
}

// Populate a measurement from history string
function populateMeasurementFromHistory(historyString) {
    // Parse the history string
    const parsed = parseHistoryString(historyString);
    
    // Find the next empty measurement or add a new one
    let targetMeasurement = null;
    
    // First, try to find an empty measurement (all fields empty)
    for (let i = 0; i < measurements.length; i++) {
        const m = measurements[i];
        if (!m.feetInput.value && !m.inchesInput.value && !m.numInput.value) {
            targetMeasurement = m;
            break;
        }
    }
    
    // If no empty measurement found, add a new one
    if (!targetMeasurement) {
        if (measurements.length < MAX_MEASUREMENTS) {
            addMeasurement();
            // Get the newly added measurement
            targetMeasurement = measurements[measurements.length - 1];
        } else {
            alert('Maximum measurements reached. Clear some measurements first.');
            return;
        }
    }
    
    // Populate the values
    if (targetMeasurement) {
        targetMeasurement.feetInput.value = parsed.feet !== 0 ? Math.abs(parsed.feet) : '';
        targetMeasurement.inchesInput.value = parsed.inches !== 0 ? Math.abs(parsed.inches) : '';
        targetMeasurement.numInput.value = parsed.num !== 0 ? parsed.num : '';
        targetMeasurement.denInput.value = parsed.den !== 1 ? parsed.den : '1';
        
        // If negative, set to subtract operation
        if (parsed.isNegative) {
            targetMeasurement.isAdd = false;
            targetMeasurement.opBtn.textContent = '−';
            targetMeasurement.opBtn.className = 'measurement-op-btn subtract';
        } else {
            targetMeasurement.isAdd = true;
            targetMeasurement.opBtn.textContent = '+';
            targetMeasurement.opBtn.className = 'measurement-op-btn add';
        }
        
        // Update running total (don't save to history when populating from history)
        updateRunningTotal();
        
        // Focus on the populated measurement and scroll to show last 2
        setTimeout(() => {
            if (targetMeasurement.feetInput) {
                scrollToLastMeasurements();
                targetMeasurement.feetInput.focus();
            }
        }, 50);
    }
}

// Convert fraction to feet and inches format string
function fractionToFeetInchesString(fraction) {
    const isNegative = fraction.numerator < 0;
    const absNumerator = Math.abs(fraction.numerator);
    const denominator = fraction.denominator;
    
    const inchesPerFoot = 12 * denominator;
    const feet = Math.floor(absNumerator / inchesPerFoot);
    const remainingNumerator = absNumerator % inchesPerFoot;
    
    let resultString = '';
    if (feet > 0) {
        resultString = `${feet}' `;
    }
    
    if (remainingNumerator > 0 || feet === 0) {
        const remainingFraction = new Fraction(remainingNumerator, denominator);
        remainingFraction.simplify();
        resultString += remainingFraction.toInchesString();
    } else if (feet > 0) {
        resultString = resultString.trim() + ' 0"';
    }
    
    if (isNegative && resultString !== '0"') {
        resultString = '-' + resultString;
    }
    if (!resultString.trim()) {
        resultString = '0"';
    }
    
    return resultString;
}

// Convert fraction to inches-only format string (no feet conversion)
function fractionToInchesOnlyString(fraction) {
    const isNegative = fraction.numerator < 0;
    const absNumerator = Math.abs(fraction.numerator);
    const denominator = fraction.denominator;
    
    // Convert to inches and fraction
    const wholeInches = Math.floor(absNumerator / denominator);
    const remainingNumerator = absNumerator % denominator;
    
    let resultString = '';
    
    if (wholeInches > 0) {
        resultString = `${wholeInches}`;
    }
    
    if (remainingNumerator > 0) {
        const remainingFraction = new Fraction(remainingNumerator, denominator);
        remainingFraction.simplify();
        if (wholeInches > 0) {
            resultString += ` ${remainingFraction.numerator}/${remainingFraction.denominator}`;
        } else {
            resultString = `${remainingFraction.numerator}/${remainingFraction.denominator}`;
        }
    }
    
    if (!resultString) {
        resultString = '0';
    }
    
    resultString += '"';
    
    if (isNegative && resultString !== '0"') {
        resultString = '-' + resultString;
    }
    
    return resultString;
}

// Calculate running total
function calculateRunningTotal() {
    let total = new Fraction(0, 1);
    
    measurements.forEach(measurement => {
        const feet = parseFloat(measurement.feetInput.value) || 0;
        const inches = parseFloat(measurement.inchesInput.value) || 0;
        const num = parseFloat(measurement.numInput.value) || 0;
        const den = parseFloat(measurement.denInput.value) || 1;
        
        if (den === 0) return;
        
        const fraction = feetInchesToFraction(feet, inches, num, den);
        
        if (measurement.isAdd) {
            total = total.add(fraction);
        } else {
            total = total.subtract(fraction);
        }
    });
    
    return total;
}

// Update running total display
function updateRunningTotal() {
    const total = calculateRunningTotal();
    const resultString = fractionToFeetInchesString(total);
    const inchesOnlyString = fractionToInchesOnlyString(total);
    
    // Update both displays
    runningTotal.textContent = resultString;
    if (runningTotalInches) {
        runningTotalInches.textContent = inchesOnlyString;
    }
    
    // Update result display
    const decimal = total.toDecimal();
    const fractionString = total.toString();
    
    if (measurements.length > 0) {
        resultDisplay.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 4px; font-weight: 700;">${resultString} | ${inchesOnlyString}</div>
            <div style="font-size: 12px; opacity: 0.9;">${fractionString} = ${decimal.toFixed(4)}"</div>
        `;
        resultDisplay.classList.add('has-result');
    } else {
        resultDisplay.textContent = '';
        resultDisplay.classList.remove('has-result');
    }
}

// History functions
function loadHistory() {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error loading history:', e);
        return [];
    }
}

function saveHistory(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Error saving history:', e);
    }
}

function addToHistory(resultString) {
    if (!resultString || resultString === '0"') return;
    
    let history = loadHistory();
    
    // Remove if already exists (avoid duplicates, move to top if exists)
    history = history.filter(item => item.result !== resultString);
    
    // Add to beginning
    history.unshift({
        result: resultString,
        timestamp: Date.now()
    });
    
    // Keep only last MAX_HISTORY entries
    if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
    }
    
    saveHistory(history);
    updateHistoryDropdown();
}

function updateHistoryDropdown() {
    if (!historySelect) return;
    
    const history = loadHistory();
    const currentValue = historySelect.value;
    
    // Clear existing options except the first placeholder
    historySelect.innerHTML = '<option value="">Select from history...</option>';
    
    if (history.length === 0) {
        return;
    }
    
    // Add history items
    history.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = item.result;
        historySelect.appendChild(option);
    });
    
    // Restore previous selection if still valid
    if (currentValue && historySelect.querySelector(`option[value="${currentValue}"]`)) {
        historySelect.value = currentValue;
    }
}

// Wrapper function to update running total and save to history
function updateRunningTotalWithHistory() {
    updateRunningTotal();
    
    // Save current result to history (only if measurements have values)
    if (measurements.length > 0) {
        let hasValues = false;
        measurements.forEach(m => {
            if (m.feetInput.value || m.inchesInput.value || m.numInput.value) {
                hasValues = true;
            }
        });
        
        if (hasValues) {
            const total = calculateRunningTotal();
            const resultString = fractionToFeetInchesString(total);
            addToHistory(resultString);
        }
    }
}

// Create a measurement input element
function createMeasurementElement(index) {
    const measurementDiv = document.createElement('div');
    measurementDiv.className = 'measurement-item';
    measurementDiv.dataset.index = index;
    
    // Operation button (+/-)
    const opBtn = document.createElement('button');
    opBtn.className = 'measurement-op-btn add';
    opBtn.textContent = '+';
    opBtn.type = 'button';
        opBtn.addEventListener('click', () => {
        const measurement = measurements[index];
        measurement.isAdd = !measurement.isAdd;
        opBtn.textContent = measurement.isAdd ? '+' : '−';
        opBtn.className = `measurement-op-btn ${measurement.isAdd ? 'add' : 'subtract'}`;
        updateRunningTotalWithHistory();
    });
    
    // Inputs container
    const inputsDiv = document.createElement('div');
    inputsDiv.className = 'measurement-inputs';
    
    // Feet/inches/fraction entry
    const entryDiv = document.createElement('div');
    entryDiv.className = 'feet-inches-fraction-entry';
    
    // Feet input
    const feetInput = document.createElement('input');
    feetInput.type = 'text';
    feetInput.readOnly = true; // Prevent native keyboard, we'll use custom keypad
    feetInput.id = `feet${index}`;
    feetInput.className = 'feet-input';
    feetInput.placeholder = '0';
    
    const feetLabel = document.createElement('span');
    feetLabel.className = 'feet-label';
    feetLabel.textContent = "'";
    
    // Inches input
    const inchesInput = document.createElement('input');
    inchesInput.type = 'text';
    inchesInput.readOnly = true; // Prevent native keyboard, we'll use custom keypad
    inchesInput.id = `inches${index}`;
    inchesInput.className = 'inches-input';
    inchesInput.placeholder = '0';
    
    const inchesLabel = document.createElement('span');
    inchesLabel.className = 'inches-label';
    inchesLabel.textContent = '"';
    
    // Fraction entry
    const fractionDiv = document.createElement('div');
    fractionDiv.className = 'fraction-entry';
    
    const numInput = document.createElement('input');
    numInput.type = 'text';
    numInput.readOnly = true; // Prevent native keyboard, we'll use custom keypad
    numInput.id = `num${index}`;
    numInput.placeholder = '0';
    
    const fractionLine = document.createElement('span');
    fractionLine.className = 'fraction-line';
    fractionLine.textContent = '/';
    
    const denInput = document.createElement('input');
    denInput.type = 'text';
    denInput.readOnly = true; // Prevent native keyboard, we'll use custom keypad
    denInput.id = `den${index}`;
    denInput.placeholder = '1';
    denInput.value = '1';
    
    fractionDiv.appendChild(numInput);
    fractionDiv.appendChild(fractionLine);
    fractionDiv.appendChild(denInput);
    
    entryDiv.appendChild(feetInput);
    entryDiv.appendChild(feetLabel);
    entryDiv.appendChild(inchesInput);
    entryDiv.appendChild(inchesLabel);
    entryDiv.appendChild(fractionDiv);
    
    inputsDiv.appendChild(entryDiv);
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'measurement-remove-btn';
    removeBtn.textContent = '×';
    removeBtn.type = 'button';
    removeBtn.title = 'Remove measurement';
    removeBtn.addEventListener('click', () => {
        removeMeasurement(index);
    });
    
    measurementDiv.appendChild(opBtn);
    measurementDiv.appendChild(inputsDiv);
    measurementDiv.appendChild(removeBtn);
    
    // Store measurement object
    const measurement = {
        element: measurementDiv,
        opBtn: opBtn,
        feetInput: feetInput,
        inchesInput: inchesInput,
        numInput: numInput,
        denInput: denInput,
        isAdd: true,
        index: index
    };
    
    // Add input listeners
    [feetInput, inchesInput, numInput, denInput].forEach(input => {
        input.addEventListener('input', () => {
            selectedMeasurementIndex = index;
            updateRunningTotal(); // Update display but don't save to history on every keypress
        });
        input.addEventListener('focus', () => {
            selectedMeasurementIndex = index;
            
            // Show custom keypad instead of native keyboard
            showKeypad(input, measurement);
            
            // Scroll to show this measurement while keeping keypad/fractions visible
            setTimeout(() => {
                // If this is one of the last 2 measurements, just scroll it into view
                const isLastTwo = index >= measurements.length - 2;
                if (isLastTwo) {
                    measurement.element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest',
                        inline: 'nearest'
                    });
                } else {
                    // For older measurements, scroll to show last 2 instead
                    scrollToLastMeasurements();
                }
            }, 100);
        });
        
        input.addEventListener('blur', () => {
            // Reset keypad when input loses focus (with small delay to allow button clicks)
            // Use a longer delay to allow keypad button clicks to complete
            setTimeout(() => {
                // If focus moved into the keypad, keep the current input active.
                // This is critical for web browsers where clicking a button steals focus.
                const activeEl = document.activeElement;
                const focusIsInKeypad = keypadContainer && activeEl && keypadContainer.contains(activeEl);
                if (currentKeypadInput === input && (isKeypadInteracting || focusIsInKeypad)) {
                    // Re-focus the input so multi-digit entry works without re-tapping the field
                    input.focus();
                    return;
                }

                // Only hide if the input is still the current one and focus is truly elsewhere
                if (currentKeypadInput === input && activeEl !== input) {
                    hideKeypad();
                }
            }, 300);
        });
    });
    
    measurements[index] = measurement;
    return measurementDiv;
}

// Add a new measurement
function addMeasurement() {
    if (measurements.length >= MAX_MEASUREMENTS) {
        alert(`Maximum ${MAX_MEASUREMENTS} measurements allowed`);
        return;
    }
    
    const index = measurements.length;
    const element = createMeasurementElement(index);
    measurementsContainer.appendChild(element);
    updateAddButtonState();
    updateRunningTotalWithHistory();
    
    // Focus on the first input (feet) of the newly added measurement and scroll to show last 2
    setTimeout(() => {
        if (measurements[index] && measurements[index].feetInput) {
            // Scroll measurements container to show the last 2 measurements
            scrollToLastMeasurements();
            measurements[index].feetInput.focus();
            selectedMeasurementIndex = index;
        }
    }, 50);
}

// Remove a measurement
function removeMeasurement(index) {
    if (measurements.length <= 1) {
        alert('At least one measurement is required');
        return;
    }
    
    const measurement = measurements[index];
    if (measurement && measurement.element) {
        measurement.element.remove();
    }
    
    // Save current values before removing
    const oldMeasurements = measurements.map(m => ({
        feet: m.feetInput.value,
        inches: m.inchesInput.value,
        num: m.numInput.value,
        den: m.denInput.value,
        isAdd: m.isAdd
    }));
    
    measurements.splice(index, 1);
    oldMeasurements.splice(index, 1);
    
    // Recreate all measurements to fix indices
    measurementsContainer.innerHTML = '';
    measurements = [];
    oldMeasurements.forEach((m, i) => {
        const newElement = createMeasurementElement(i);
        measurementsContainer.appendChild(newElement);
        // Restore values
        measurements[i].feetInput.value = m.feet;
        measurements[i].inchesInput.value = m.inches;
        measurements[i].numInput.value = m.num;
        measurements[i].denInput.value = m.den;
        measurements[i].isAdd = m.isAdd;
        measurements[i].opBtn.textContent = m.isAdd ? '+' : '−';
        measurements[i].opBtn.className = `measurement-op-btn ${m.isAdd ? 'add' : 'subtract'}`;
    });
    
    updateAddButtonState();
    updateRunningTotalWithHistory();
}

// Update add button state
function updateAddButtonState() {
    if (measurements.length >= MAX_MEASUREMENTS) {
        addMeasurementBtn.disabled = true;
        addMeasurementBtn.style.opacity = '0.5';
    } else {
        addMeasurementBtn.disabled = false;
        addMeasurementBtn.style.opacity = '1';
    }
}


// Quick fraction button handlers
fractionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.num);
        const den = parseInt(btn.dataset.den);
        
        if (selectedMeasurementIndex !== null && measurements[selectedMeasurementIndex]) {
            const measurement = measurements[selectedMeasurementIndex];
            measurement.numInput.value = num;
            measurement.denInput.value = den;
            measurement.numInput.focus();
            updateRunningTotal(); // Update display but don't save to history on fraction button click
        } else if (measurements.length > 0) {
            // Use last measurement if none selected
            const measurement = measurements[measurements.length - 1];
            measurement.numInput.value = num;
            measurement.denInput.value = den;
            measurement.numInput.focus();
            selectedMeasurementIndex = measurements.length - 1;
            updateRunningTotal(); // Update display but don't save to history on fraction button click
        }
    });
});

// History handler removed

// Add measurement button handler
addMeasurementBtn.addEventListener('click', addMeasurement);

// Clear all function - explicitly reset everything
// Made global so it can be called from inline onclick
window.clearAll = function() {
    console.log('clearAll called'); // Debug log
    
    // 1. Remove all DOM elements (this also removes all event listeners)
    measurementsContainer.innerHTML = '';
    
    // 2. Reset all JavaScript state variables
    measurements = [];
    selectedMeasurementIndex = null;
    
    // 3. Clear the display
    if (runningTotal) runningTotal.textContent = '0"';
    if (runningTotalInches) runningTotalInches.textContent = '0"';
    if (resultDisplay) {
        resultDisplay.textContent = '';
        resultDisplay.classList.remove('has-result');
    }
    
    // 4. Recreate initial state (one empty measurement)
    addMeasurement();
    updateAddButtonState();
    
    // 5. Focus on first input
    setTimeout(() => {
        if (measurements.length > 0 && measurements[0] && measurements[0].feetInput) {
            measurements[0].feetInput.focus();
        }
    }, 50);
};

// Clear history function - explicitly clear history
// Made global so it can be called from inline onclick
// Made EXACTLY like clearAll - no confirmation, immediate execution, direct DOM manipulation
window.clearHistory = function() {
    console.log('clearHistory called'); // Debug log
    
    // 1. Clear history from localStorage (always works)
    localStorage.removeItem(HISTORY_KEY);
    
    // 2. Get historySelect directly and clear dropdown (like clearAll manipulates measurementsContainer)
    const select = document.getElementById('historySelect');
    if (select) {
        select.innerHTML = '<option value="">Select from history...</option>';
        console.log('History dropdown cleared');
    }
    
    console.log('History cleared from localStorage');
};

// Scroll measurements container to show last 2 measurements
function scrollToLastMeasurements() {
    if (measurements.length === 0) return;
    
    const container = measurementsContainer;
    if (!container) return;
    
    // Get the last 2 measurements
    const lastIndex = measurements.length - 1;
    const secondLastIndex = Math.max(0, measurements.length - 2);
    
    if (measurements[lastIndex] && measurements[lastIndex].element) {
        // Scroll to show the last measurement at the bottom of visible area
        setTimeout(() => {
            measurements[lastIndex].element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'end',
                inline: 'nearest'
            });
        }, 10);
    }
}

// Custom Keypad Functions
function initKeypad() {
    keypadContainer = document.getElementById('keypadContainer');
    keypadGrid = document.getElementById('keypadGrid');
    keypadLabel = document.getElementById('keypadLabel');
    
    if (!keypadContainer || !keypadGrid) return;
    
    // Create keypad buttons
    const buttons = [
        { value: '1', class: 'number' },
        { value: '2', class: 'number' },
        { value: '3', class: 'number' },
        { value: '4', class: 'number' },
        { value: '5', class: 'number' },
        { value: '6', class: 'number' },
        { value: '7', class: 'number' },
        { value: '8', class: 'number' },
        { value: '9', class: 'number' },
        { value: '0', class: 'number zero' },
        { value: '.', class: 'decimal' },
        { value: '←', class: 'backspace' }
    ];
    
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `keypad-btn ${btn.class}`;
        button.textContent = btn.value;
        // Prevent the keypad button from stealing focus from the active input
        button.tabIndex = -1;
        button.addEventListener('pointerdown', (e) => {
            isKeypadInteracting = true;
            e.preventDefault();
            e.stopPropagation();
        });
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleKeypadInput(btn.value);
            // Reset after the click completes
            setTimeout(() => { isKeypadInteracting = false; }, 0);
        });
        keypadGrid.appendChild(button);
    });
}

function setActiveMeasurementRow(inputEl, type) {
    // type: "feet" | "inches" | "fraction"
    const row = inputEl?.closest?.('.measurement-item');
    if (!row) return;
    
    // Clear previous active row + type
    document.querySelectorAll('.measurement-item.is-active').forEach(el => {
        el.classList.remove('is-active', 'active-feet', 'active-inches', 'active-fraction');
    });
    
    row.classList.add('is-active');
    
    if (type === 'feet') row.classList.add('active-feet');
    if (type === 'inches') row.classList.add('active-inches');
    if (type === 'fraction') row.classList.add('active-fraction');
}

function showKeypad(input, measurement) {
    if (!keypadContainer) return;
    
    currentKeypadInput = input;
    
    // Determine keypad type based on input
    let label = 'Tap a field to enter';
    let keypadType = '';
    let activeType = '';
    
    if (input === measurement.feetInput) {
        label = 'Feet';
        keypadType = 'feet-active';
        activeType = 'feet';
    } else if (input === measurement.inchesInput) {
        label = 'Inches';
        keypadType = 'inches-active';
        activeType = 'inches';
    } else if (input === measurement.numInput || input === measurement.denInput) {
        label = 'Fraction';
        keypadType = 'fraction-active';
        activeType = 'fraction';
    }
    
    keypadLabel.textContent = label;
    keypadContainer.className = `keypad-container-static ${keypadType}`;
    
    // Highlight the active measurement row
    setActiveMeasurementRow(input, activeType);
}

function hideKeypad() {
    if (!keypadContainer) return;
    
    keypadContainer.className = 'keypad-container-static';
    keypadLabel.textContent = 'Tap a field to enter';
    currentKeypadInput = null;
}

function handleKeypadInput(value) {
    if (!currentKeypadInput) return;
    
    const currentValue = currentKeypadInput.value || '';
    const inputId = currentKeypadInput.id || '';
    
    if (value === '←') {
        // Backspace
        currentKeypadInput.value = currentValue.slice(0, -1);
    } else if (value === '.') {
        // Decimal point (only if not already present)
        if (!currentValue.includes('.')) {
            currentKeypadInput.value = currentValue + '.';
        }
    } else {
        // Number input
        // Check max digits for feet input (3 digits max)
        if (inputId.startsWith('feet')) {
            const digitsOnly = currentValue.replace(/[^0-9]/g, '');
            if (digitsOnly.length >= 3) {
                return; // Don't add more digits, feet is limited to 3
            }
        }
        
        // Check max digits for inches input (2 digits max)
        if (inputId.startsWith('inches')) {
            const digitsOnly = currentValue.replace(/[^0-9]/g, '');
            if (digitsOnly.length >= 2) {
                return; // Don't add more digits, inches is limited to 2
            }
        }
        
        // For fraction denominator, don't allow 0
        if (inputId.startsWith('den') && currentValue === '0' && value === '0') {
            return; // Don't allow 00
        }
        
        // Add the number
        currentKeypadInput.value = currentValue + value;
    }
    
    // Trigger input event to update calculations
    currentKeypadInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Keep focus on the input to allow multiple digits
    if (currentKeypadInput) {
        // Use setTimeout to ensure focus happens after the click event completes
        setTimeout(() => {
            if (currentKeypadInput) {
                currentKeypadInput.focus();
            }
        }, 10);
    }
}

// Regular Calculator Logic
let calcMode = 'construction'; // 'construction' or 'regular'
let calcCurrentValue = '0';
let calcPreviousValue = null;
let calcOperation = null;
let calcShouldResetDisplay = false;

const constructionCalc = document.getElementById('constructionCalculator');
const regularCalc = document.getElementById('regularCalculator');
const modeToggleBtn = document.getElementById('modeToggleBtn');
const calcScreen = document.getElementById('calcScreen');

function switchCalculatorMode() {
    if (calcMode === 'construction') {
        // Switch to regular calculator
        calcMode = 'regular';
        if (constructionCalc) constructionCalc.style.display = 'none';
        if (regularCalc) regularCalc.style.display = 'flex';
        if (modeToggleBtn) {
            modeToggleBtn.querySelector('.mode-icon').textContent = '📏';
            modeToggleBtn.querySelector('.mode-text').textContent = 'Construction';
            modeToggleBtn.title = 'Switch to Construction Calculator';
        }
    } else {
        // Switch to construction calculator
        calcMode = 'construction';
        if (constructionCalc) constructionCalc.style.display = 'flex';
        if (regularCalc) regularCalc.style.display = 'none';
        if (modeToggleBtn) {
            modeToggleBtn.querySelector('.mode-icon').textContent = '🔢';
            modeToggleBtn.querySelector('.mode-text').textContent = 'Regular';
            modeToggleBtn.title = 'Switch to Regular Calculator';
        }
    }
}

function updateCalcDisplay(value) {
    if (calcScreen) {
        calcScreen.textContent = value;
    }
}

function handleCalcNumber(number) {
    if (calcShouldResetDisplay) {
        calcCurrentValue = '0';
        calcShouldResetDisplay = false;
    }
    
    if (calcCurrentValue === '0') {
        calcCurrentValue = number;
    } else {
        calcCurrentValue += number;
    }
    updateCalcDisplay(calcCurrentValue);
}

function handleCalcDecimal() {
    if (calcShouldResetDisplay) {
        calcCurrentValue = '0';
        calcShouldResetDisplay = false;
    }
    
    if (!calcCurrentValue.includes('.')) {
        calcCurrentValue += '.';
        updateCalcDisplay(calcCurrentValue);
    }
}

function handleCalcOperator(operator) {
    const inputValue = parseFloat(calcCurrentValue);
    
    if (calcPreviousValue === null) {
        calcPreviousValue = inputValue;
    } else if (calcOperation) {
        const result = performCalcOperation(calcPreviousValue, inputValue, calcOperation);
        calcCurrentValue = String(result);
        updateCalcDisplay(calcCurrentValue);
        calcPreviousValue = result;
    }
    
    calcShouldResetDisplay = true;
    calcOperation = operator;
    updateOperatorButtonStates(operator);
}

function updateOperatorButtonStates(activeOperator) {
    // Remove active class from all operator buttons
    const operatorButtons = document.querySelectorAll('.calc-btn-operator');
    operatorButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to the selected operator button
    if (activeOperator) {
        const operatorMap = {
            'add': 'add',
            'subtract': 'subtract',
            'multiply': 'multiply',
            'divide': 'divide'
        };
        
        const button = document.querySelector(`[data-action="${operatorMap[activeOperator]}"]`);
        if (button) {
            button.classList.add('active');
        }
    }
}

function performCalcOperation(prev, current, operation) {
    switch (operation) {
        case 'add':
            return prev + current;
        case 'subtract':
            return prev - current;
        case 'multiply':
            return prev * current;
        case 'divide':
            return prev / current;
        default:
            return current;
    }
}

function handleCalcEquals() {
    if (calcOperation && calcPreviousValue !== null) {
        const inputValue = parseFloat(calcCurrentValue);
        const result = performCalcOperation(calcPreviousValue, inputValue, calcOperation);
        calcCurrentValue = String(result);
        updateCalcDisplay(calcCurrentValue);
        calcPreviousValue = null;
        calcOperation = null;
        calcShouldResetDisplay = true;
        updateOperatorButtonStates(null); // Clear active state
    }
}

function handleCalcClear() {
    calcCurrentValue = '0';
    updateCalcDisplay(calcCurrentValue);
}

function handleCalcClearAll() {
    calcCurrentValue = '0';
    calcPreviousValue = null;
    calcOperation = null;
    calcShouldResetDisplay = false;
    updateCalcDisplay(calcCurrentValue);
    updateOperatorButtonStates(null); // Clear active state
}

function handleCalcBackspace() {
    if (calcCurrentValue.length > 1) {
        calcCurrentValue = calcCurrentValue.slice(0, -1);
    } else {
        calcCurrentValue = '0';
    }
    updateCalcDisplay(calcCurrentValue);
}

function initRegularCalculator() {
    if (!regularCalc) return;
    
    // Setup mode toggle buttons
    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', switchCalculatorMode);
    }
    
    // Setup regular calc mode button
    const regularCalcModeBtn = document.getElementById('regularCalcModeBtn');
    if (regularCalcModeBtn) {
        regularCalcModeBtn.addEventListener('click', switchCalculatorMode);
    }
    
    // Setup calculator buttons
    const calcButtons = regularCalc.querySelectorAll('.calc-btn');
    calcButtons.forEach(button => {
        button.addEventListener('click', () => {
            const number = button.getAttribute('data-number');
            const action = button.getAttribute('data-action');
            
            if (number !== null) {
                handleCalcNumber(number);
            } else if (action) {
                switch (action) {
                    case 'add':
                        handleCalcOperator('add');
                        break;
                    case 'subtract':
                        handleCalcOperator('subtract');
                        break;
                    case 'multiply':
                        handleCalcOperator('multiply');
                        break;
                    case 'divide':
                        handleCalcOperator('divide');
                        break;
                    case 'equals':
                        handleCalcEquals();
                        break;
                    case 'decimal':
                        handleCalcDecimal();
                        break;
                    case 'clear':
                        handleCalcClear();
                        break;
                    case 'clearAll':
                        handleCalcClearAll();
                        break;
                    case 'backspace':
                        handleCalcBackspace();
                        break;
                }
            }
        });
    });
}

// Initialize
addMeasurement(); // Add first measurement
updateRunningTotalWithHistory();

// Long-press header easter egg: show random builder motto
(function initHeaderLongPress() {
    const header = document.querySelector('.app-header');
    if (!header) return;
    
    const mottos = [
        'MEASURE TWICE',
        'CUT ONCE',
        'SEND IT',
        'GOOD ENOUGH AIN\'T',
        'CLOSE ENOUGH ISN\'T',
        'BUILT NOT BOUGHT'
    ];
    
    let pressTimer = null;
    const titleEl = document.querySelector('.app-header h1');
    if (!titleEl) return;
    
    const originalTitle = titleEl.innerHTML;
    
    header.addEventListener('touchstart', startPress, { passive: false });
    header.addEventListener('mousedown', startPress);
    
    header.addEventListener('touchend', cancelPress);
    header.addEventListener('mouseup', cancelPress);
    header.addEventListener('mouseleave', cancelPress);
    header.addEventListener('touchcancel', cancelPress);
    
    function startPress(e) {
        // Prevent default to avoid text selection and context menu
        e.preventDefault();
        e.stopPropagation();
        pressTimer = setTimeout(() => {
            const motto = mottos[Math.floor(Math.random() * mottos.length)];
            titleEl.textContent = motto;
            
            setTimeout(() => {
                titleEl.innerHTML = originalTitle;
            }, 3500); // 3.5 seconds - longer display time
        }, 700); // 0.7 second long press - quicker trigger
    }
    
    function cancelPress() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }
})();

// Highlight the active row based on which input is tapped/focused
document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    
    if (t.classList.contains('feet-input')) {
        setActiveMeasurementRow(t, 'feet');
    } else if (t.classList.contains('inches-input')) {
        setActiveMeasurementRow(t, 'inches');
    } else {
        // Fraction inputs: check if inside fraction-entry
        const isFraction = t.closest('.fraction-entry') && (t.tagName === 'INPUT');
        if (isFraction) {
            setActiveMeasurementRow(t, 'fraction');
        }
    }
});

// Setup clear button handler and history select (fallback in case inline onclick doesn't work)
document.addEventListener('DOMContentLoaded', function() {
    // Initialize regular calculator
    initRegularCalculator();
    
    // Initialize keypad
    initKeypad();
    // Initialize history select
    historySelect = document.getElementById('historySelect');
    if (historySelect) {
        updateHistoryDropdown();
        
        // Handle history selection
        historySelect.addEventListener('change', function(e) {
            const value = e.target.value;
            
            if (value && value !== '') {
                // Load selected history item
                const history = loadHistory();
                const index = parseInt(value);
                if (history[index]) {
                    const resultString = history[index].result;
                    
                    // Parse and populate into next measurement
                    populateMeasurementFromHistory(resultString);
                    
                    // Reset selection
                    historySelect.value = '';
                }
            }
        });
    }
    
    // Clear history button handler (fallback in case inline onclick doesn't work)
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clear history button clicked via event listener');
            if (window.clearHistory) {
                window.clearHistory();
            }
        });
        console.log('Clear history button handler attached');
    } else {
        console.error('Clear history button not found!');
    }
    
    // Clear button handler
    const btn = document.getElementById('clearBtn');
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clear button clicked via event listener');
            if (window.clearAll) {
                window.clearAll();
            }
        });
        console.log('Clear button handler attached');
    } else {
        console.error('Clear button not found!');
    }
});

// Also try to attach immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(function() {
        // Initialize history select if DOM is already loaded
        if (!historySelect) {
            historySelect = document.getElementById('historySelect');
            if (historySelect) {
                updateHistoryDropdown();
                
                historySelect.addEventListener('change', function(e) {
                    const value = e.target.value;
                    
                    if (value && value !== '') {
                        const history = loadHistory();
                        const index = parseInt(value);
                        if (history[index]) {
                            const resultString = history[index].result;
                            
                            // Parse and populate into next measurement
                            populateMeasurementFromHistory(resultString);
                            
                            // Reset selection
                            historySelect.value = '';
                        }
                    }
                });
            }
        }
        
        // Clear history button handler (if DOM already loaded)
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn && !clearHistoryBtn.onclick) {
            clearHistoryBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clear history button clicked (immediate handler)');
                if (window.clearHistory) {
                    window.clearHistory();
                }
            });
        }
        
        // Clear button handler
        const btn = document.getElementById('clearBtn');
        if (btn && !btn.onclick) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clear button clicked (immediate handler)');
                if (window.clearAll) {
                    window.clearAll();
                }
            });
        }
    }, 100);
}
