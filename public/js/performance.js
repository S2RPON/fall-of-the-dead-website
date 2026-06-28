document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('checkSpecsBtn');
    const resultDiv = document.getElementById('perfResult');

    if (checkBtn) {
        // Make the function asynchronous so we can wait for the Storage API
        checkBtn.addEventListener('click', async () => {
            let cpuScore = 0, gpuScore = 0, ramScore = 0;
            let detectedRam = "Unknown";
            let detectedCores = "Unknown";
            let detectedGpu = "Unknown";
            let detectedStorage = "Checking...";

            // 1. RAM
            if (navigator.deviceMemory) {
                detectedRam = `${navigator.deviceMemory} GB`;
                if (navigator.deviceMemory >= 16) ramScore = 2;
                else if (navigator.deviceMemory >= 12) ramScore = 1;
                else ramScore = 0;
            } else { ramScore = 1; }

            // 2. CPU (Browsers block exact CPU names, but we get threads)
            if (navigator.hardwareConcurrency) {
                detectedCores = `${navigator.hardwareConcurrency} Logical Threads`;
                if (navigator.hardwareConcurrency >= 12) cpuScore = 2;
                else if (navigator.hardwareConcurrency >= 8) cpuScore = 1;
                else cpuScore = 0;
            } else { cpuScore = 1; }

            // 3. GPU
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    let rawGpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    let gpuMatch = rawGpu.match(/(RTX \d{3,4} Ti|RTX \d{3,4}|GTX \d{3,4} Ti|GTX \d{3,4})/i);
                    if (gpuMatch) {
                        detectedGpu = gpuMatch[0].toUpperCase(); 
                    } else { detectedGpu = rawGpu; }

                    if (/RTX 30[6-9]|RTX 40[0-9]/.test(detectedGpu)) { gpuScore = 2; } 
                    else if (/RTX 3050|RTX 20[6-9]|GTX 1660|GTX 1080/.test(detectedGpu)) { gpuScore = 1; }
                    else { gpuScore = 0; }
                } else { detectedGpu = "Unknown (Browser Blocked)"; gpuScore = 1; }
            } else { gpuScore = 0; }

                        // 4. Storage Check 
            // (Browsers block total disk space and SSD/HDD detection for privacy. We can only see the site's allowed quota).
            if (navigator.storage && navigator.storage.estimate) {
                try {
                    const estimate = await navigator.storage.estimate();
                    const quotaGB = (estimate.quota / 1073741824).toFixed(0);
                    detectedStorage = `~${quotaGB} GB (Site Quota)`;
                } catch (e) {
                    detectedStorage = "Unknown";
                }
            } else {
                detectedStorage = "Not Supported";
            }

            // Calculate Result
            let recommendation = "";
            let color = "var(--text-main)";
            const totalScore = Math.min(cpuScore, gpuScore, ramScore); 

            if (totalScore >= 2) { recommendation = "Recommended Settings (Ultra/High)"; color = "#00ff00"; } 
            else if (totalScore >= 1) { recommendation = "Playable Settings (Medium/High)"; color = "#ffa500"; } 
            else { recommendation = "Below Minimum Specs"; color = "#ff0000"; }

            // Generate Cards
            resultDiv.innerHTML = `
                <div class="specs-container">
                    <div class="spec-box min">
                        <h4>Minimum</h4>
                        <p><strong>GPU</strong> <span>RTX 2060</span></p>
                        <p class="cpu-name"><strong>CPU</strong> <span>i7 7th Gen</span></p>
                        <p><strong>RAM</strong> <span>12 GB</span></p>
                        <p class="storage-name"><strong>Storage</strong> <span>100 GB</span></p>
                    </div>
                    <div class="spec-box rec">
                        <h4>Recommended</h4>
                        <p><strong>GPU</strong> <span>RTX 3060 Ti</span></p>
                        <p class="cpu-name"><strong>CPU</strong> <span>i7 10th Gen K</span></p>
                        <p><strong>RAM</strong> <span>16 GB</span></p>
                        <p class="storage-name"><strong>Storage</strong> <span>100 GB SSD</span></p>
                    </div>
                    <div class="spec-box you">
                        <h4>Your PC</h4>
                        <p><strong>GPU</strong> <span>${detectedGpu}</span></p>
                        <p class="cpu-name"><strong>CPU</strong> <span>${detectedCores} <br><em style="color:#666; font-size:0.75rem;">(Exact model hidden by browser)</em></span></p>
                        <p><strong>RAM</strong> <span>${detectedRam}</span></p>
                        <p class="storage-name"><strong>Storage</strong> <span>${detectedStorage} <br><em style="color:#666; font-size:0.75rem;">(Total disk space &amp; SSD/HDD type are hidden by browser security)</em></span></p>
                    </div>
                </div>
                <div class="perf-result-text">
                    <p style="font-size:1.5rem; color:${color};"><strong>Estimated Recommendation: ${recommendation}</strong></p>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top: 0.5rem;">*This is an estimate based on browser capabilities, not actual in-game FPS.</p>
                </div>
            `;
        });
    }
});