document.addEventListener('DOMContentLoaded', () => {
    const weightCells = document.querySelectorAll('.weight-cell');
    const terminalOutput = document.querySelector('.terminal');
    const specimen = document.querySelector('.specimen-large');
    const selectedWeights = new Set();

    // Preselect 400
    const defaultWeight = '400';
    selectedWeights.add(defaultWeight);
    
    weightCells.forEach(cell => {
        const weight = cell.textContent.trim();
        if (weight === defaultWeight) {
            cell.classList.add('active');
        }
        
        cell.style.cursor = 'pointer';
        
        cell.addEventListener('click', () => {
            if (selectedWeights.has(weight)) {
                selectedWeights.delete(weight);
                cell.classList.remove('active');
            } else {
                selectedWeights.add(weight);
                cell.classList.add('active');
            }
            
            updateTerminal();
            updateSpecimen();
        });
    });

    function updateSpecimen() {
        const weights = Array.from(selectedWeights).sort((a, b) => parseInt(a) - parseInt(b));
        const primaryWeight = weights.length > 0 ? parseInt(weights[0]) : 400;
        specimen.style.fontWeight = primaryWeight;
    }

    function updateTerminal() {
        const weights = Array.from(selectedWeights).sort((a, b) => parseInt(a) - parseInt(b));
        const variantsStr = weights.length > 0 ? ` -v ${weights.join(',')}` : '';
        const command = `gfcli install "Inter"${variantsStr}`;
        
        // Clear and rebuild terminal content
        terminalOutput.innerHTML = `
            <div><span class="prompt">tinsever@Air-von-Tin</span> <span class="cmd">hello-there % ${command}</span></div>
            <div class="out-dim" style="margin: 10px 0;">Downloading Google Font List...</div>
            <div class="out-accent">Inter variants processed</div>
            <br>
            <div><span class="prompt">tinsever@Air-von-Tin</span> <span class="cmd">hello-there % </span><span style="background: var(--accent); width: 8px; height: 15px; display: inline-block; vertical-align: middle;"></span></div>
        `;
    }

    // Initial update
    updateSpecimen();
});
