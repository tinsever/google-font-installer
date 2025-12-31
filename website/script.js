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
        terminalOutput.innerHTML = '';

        // First line: prompt and command
        const line1 = document.createElement('div');
        const prompt1 = document.createElement('span');
        prompt1.className = 'prompt';
        prompt1.textContent = 'tinsever@Air-von-Tin';
        const cmd1 = document.createElement('span');
        cmd1.className = 'cmd';
        cmd1.textContent = `hello-there % ${command}`;
        line1.appendChild(prompt1);
        line1.appendChild(document.createTextNode(' '));
        line1.appendChild(cmd1);
        terminalOutput.appendChild(line1);

        // Second line: dimmed output
        const line2 = document.createElement('div');
        line2.className = 'out-dim';
        line2.style.margin = '10px 0';
        line2.textContent = 'Downloading Google Font List...';
        terminalOutput.appendChild(line2);

        // Third line: accent output
        const line3 = document.createElement('div');
        line3.className = 'out-accent';
        line3.textContent = 'Inter variants processed';
        terminalOutput.appendChild(line3);

        // Line break
        terminalOutput.appendChild(document.createElement('br'));

        // Fourth line: prompt and cursor block
        const line4 = document.createElement('div');
        const prompt2 = document.createElement('span');
        prompt2.className = 'prompt';
        prompt2.textContent = 'tinsever@Air-von-Tin';
        const cmd2 = document.createElement('span');
        cmd2.className = 'cmd';
        cmd2.textContent = 'hello-there % ';
        const cursor = document.createElement('span');
        cursor.style.background = 'var(--accent)';
        cursor.style.width = '8px';
        cursor.style.height = '15px';
        cursor.style.display = 'inline-block';
        cursor.style.verticalAlign = 'middle';
        line4.appendChild(prompt2);
        line4.appendChild(document.createTextNode(' '));
        line4.appendChild(cmd2);
        line4.appendChild(cursor);
        terminalOutput.appendChild(line4);
    }

    // Initial update
    updateSpecimen();
});
