// Virus Signature Database
const virusSignatures = [
    { name: 'Trojan.Generic.1', type: 'malware', pattern: /trojan|backdoor|payload/i, riskLevel: 'critical' },
    { name: 'Worm.AutoRun', type: 'malware', pattern: /worm|autorun|autoexec|propagate/i, riskLevel: 'critical' },
    { name: 'Win32.Adware', type: 'pup', pattern: /adware|advertising|banner|popup|sponsor/i, riskLevel: 'high' },
    { name: 'PUP.Unwanted', type: 'pup', pattern: /unwanted|toolbar|extension|plugin|browser.hijack/i, riskLevel: 'medium' },
    { name: 'Suspicious.Heur', type: 'suspicious', pattern: /suspicious|heuristic|behavior|anomaly/i, riskLevel: 'medium' },
    { name: 'Ransomware.Crypto', type: 'malware', pattern: /ransomware|crypto|encrypt|crypt|bitcoin|payment/i, riskLevel: 'critical' },
    { name: 'Rootkit.Generic', type: 'malware', pattern: /rootkit|kernel|privilege|escalation|admin|driver/i, riskLevel: 'critical' },
    { name: 'Spyware.Monitor', type: 'suspicious', pattern: /spyware|keylog|monitor|surveillance|tracking|spy/i, riskLevel: 'high' },
];

// Windows System Files Database
const windowsSystemFiles = {
    'C:\\Windows\\System32': [
        'kernel32.dll', 'ntdll.dll', 'msvcrt.dll', 'advapi32.dll', 'user32.dll',
        'gdi32.dll', 'shell32.dll', 'ole32.dll', 'oleaut32.dll', 'rpcrt4.dll',
        'svchost.exe', 'lsass.exe', 'csrss.exe', 'services.exe', 'winlogon.exe',
        'explorer.exe', 'notepad.exe', 'calc.exe', 'mspaint.exe', 'wordpad.exe',
        'update_trojan.exe', 'rootkit_patch.sys', 'crypto_payment.exe', 'monitor.exe'
    ],
    'C:\\Program Files': [
        'Google\\Chrome\\chrome.exe', 'Mozilla Firefox\\firefox.exe', 
        'Microsoft Office\\WINWORD.EXE', 'Microsoft Office\\EXCEL.EXE',
        '7-Zip\\7z.exe', 'VLC\\vlc.exe', 'Adobe\\Acrobat\\acrobat.exe',
        'setup_unwanted.exe', 'adware_install.exe', 'banner.exe'
    ],
    'C:\\Users\\AppData\\Local': [
        'Temp\\cache.tmp', 'Temp\\random.tmp', 'Temp\\update_malware.exe',
        'Microsoft\\Windows\\IECache\\file1.tmp', 'Google\\Chrome\\Cache\\data_001',
        'Mozilla\\Firefox\\Profiles\\cache.bin', 'Temp\\trojan_payload.exe'
    ],
    'C:\\Users\\Downloads': [
        'document.pdf', 'image.jpg', 'video.mp4', 'archive.zip', 
        'setup.exe', 'installer.msi', 'game.iso',
        'worm_infected.exe', 'ransomware_crypto.exe', 'unwanted_toolbar.exe'
    ],
    'C:\\ProgramData': [
        'Microsoft\\Windows\\Caches\\data.dat', 'Windows\\DeviceMetrics.dat',
        'rootkit_driver.sys', 'suspicious_service.exe', 'bitcoin_miner.exe'
    ],
    'C:\\Windows\\Drivers': [
        'etc\\hosts', 'etc\\services', 'etc\\protocol',
        'ntfs.sys', 'fat32.sys', 'atapi.sys',
        'rootkit.sys', 'keylogger_driver.sys', 'privilege_escalation.sys'
    ]
};

// Global State
let isScanningActive = false;
let scanStartTime = 0;
let scanStats = {
    filesScanned: 0,
    threatsFound: 0,
    cleanFiles: 0,
    allThreats: []
};
let scanHistory = [
    {
        date: 'Feb 01, 2024 10:30',
        type: 'Quick Scan',
        filesScanned: 5240,
        threatsFound: 3,
        duration: '4m 32s',
        status: 'Completed'
    }
];

// Get all Windows files
function getAllWindowsFiles() {
    let files = [];
    for (const [path, filenames] of Object.entries(windowsSystemFiles)) {
        files = files.concat(filenames.map(f => path + '\\' + f));
    }
    return files;
}

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabName).classList.remove('hidden');
    
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('bg-blue-600'));
    event.target.classList.add('bg-blue-600');
}

// Toggle Custom Path Input
function toggleCustomPath() {
    const container = document.getElementById('customPathInput');
    container.classList.toggle('hidden');
    if (!container.classList.contains('hidden')) {
        document.getElementById('customPathField').focus();
    }
}

// Scan File Against Signatures
function scanFile(filename) {
    for (const sig of virusSignatures) {
        if (sig.pattern.test(filename)) {
            return {
                file: filename,
                name: sig.name,
                type: sig.type,
                riskLevel: sig.riskLevel,
                scanTime: new Date().toLocaleTimeString(),
                detectionDate: new Date().toLocaleString()
            };
        }
    }
    return null;
}

// Initiate Scan
async function initiateScan(scanType) {
    if (isScanningActive) {
        alert('A scan is already in progress. Please stop it first.');
        return;
    }

    let filesToScan = [];

    switch(scanType) {
        case 'quick':
            filesToScan = getAllWindowsFiles().slice(0, 30);
            break;
        case 'full':
            filesToScan = getAllWindowsFiles();
            break;
        case 'system':
            filesToScan = [
                ...windowsSystemFiles['C:\\Windows\\System32'].map(f => 'C:\\Windows\\System32\\' + f),
                ...windowsSystemFiles['C:\\Windows\\Drivers'].map(f => 'C:\\Windows\\Drivers\\' + f),
                ...windowsSystemFiles['C:\\ProgramData'].map(f => 'C:\\ProgramData\\' + f)
            ];
            break;
        case 'custom':
            const customPath = document.getElementById('customPathField').value.trim();
            if (!customPath) {
                alert('Please enter a valid path');
                return;
            }
            const randomCount = Math.floor(Math.random() * 20) + 10;
            filesToScan = getAllWindowsFiles().slice(0, randomCount).map(f => customPath + '\\' + f);
            document.getElementById('customPathInput').classList.add('hidden');
            break;
    }

    await performScan(filesToScan);
}

// Perform Actual Scan
async function performScan(files) {
    isScanningActive = true;
    scanStats = { filesScanned: 0, threatsFound: 0, cleanFiles: 0, allThreats: [] };
    scanStartTime = Date.now();

    document.getElementById('scanNotRunningContainer').classList.add('hidden');
    document.getElementById('scanProgressContainer').classList.remove('hidden');
    document.getElementById('recentThreatsContainer').innerHTML = '';

    const totalFiles = files.length;
    let elapsedInterval = setInterval(() => {
        if (isScanningActive) {
            const elapsed = Math.floor((Date.now() - scanStartTime) / 1000);
            document.getElementById('statsScanTime').textContent = elapsed + 's';
        }
    }, 1000);

    for (let i = 0; i < totalFiles && isScanningActive; i++) {
        const file = files[i];
        document.getElementById('currentFileScanning').textContent = 'Scanning: ' + file;

        // Simulate scan delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));

        const threat = scanFile(file);
        scanStats.filesScanned++;

        if (threat) {
            scanStats.threatsFound++;
            scanStats.allThreats.push(threat);
            displayRecentThreat(threat);
        } else {
            scanStats.cleanFiles++;
        }

        // Update progress
        const progress = (scanStats.filesScanned / totalFiles) * 100;
        document.getElementById('scanProgressBar').style.width = progress + '%';
        document.getElementById('statsFilesScanned').textContent = scanStats.filesScanned;
        document.getElementById('statsThreats').textContent = scanStats.threatsFound;
        document.getElementById('statsClean').textContent = scanStats.cleanFiles;
    }

    clearInterval(elapsedInterval);

    if (isScanningActive) {
        completeScan();
    }
}

// Display Recent Threat
function displayRecentThreat(threat) {
    const container = document.getElementById('recentThreatsContainer');
    
    if (container.children.length === 0 || container.children[0].textContent.includes('No threats')) {
        container.innerHTML = '';
    }

    const riskColor = threat.riskLevel === 'critical' ? 'bg-red-900 border-red-600' :
                      threat.riskLevel === 'high' ? 'bg-orange-900 border-orange-600' : 'bg-yellow-900 border-yellow-600';

    const threatElement = document.createElement('div');
    threatElement.className = `p-3 rounded border ${riskColor} text-white text-xs`;
    threatElement.innerHTML = `
        <div class="font-bold text-sm">${threat.name}</div>
        <div class="text-gray-300 mt-1 truncate">${threat.file.substring(threat.file.lastIndexOf('\\') + 1)}</div>
        <div class="flex justify-between items-center mt-2">
            <span class="text-gray-400">${threat.riskLevel.toUpperCase()}</span>
            <span class="text-gray-500">${threat.scanTime}</span>
        </div>
    `;

    container.insertBefore(threatElement, container.firstChild);
    
    while (container.children.length > 5) {
        container.removeChild(container.lastChild);
    }

    // Update stats
    document.getElementById('threatsBlocked').textContent = scanStats.allThreats.length;
}

// Complete Scan
function completeScan() {
    isScanningActive = false;
    const elapsed = Math.floor((Date.now() - scanStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const duration = `${minutes}m ${seconds}s`;

    // Add to history
    scanHistory.unshift({
        date: new Date().toLocaleString(),
        type: 'Scan',
        filesScanned: scanStats.filesScanned,
        threatsFound: scanStats.threatsFound,
        duration: duration,
        status: 'Completed'
    });

    // Update history table
    updateScanHistory();

    // Update dashboard
    document.getElementById('lastScanTime').textContent = new Date().toLocaleString();
    document.getElementById('totalScans').textContent = scanHistory.length;

    // Show completion message
    const container = document.getElementById('scanProgressContainer');
    if (scanStats.threatsFound === 0) {
        const message = document.createElement('div');
        message.className = 'mt-4 p-4 bg-green-900 border border-green-600 rounded-lg text-green-200 text-center';
        message.innerHTML = '✓ Scan completed successfully! No threats detected.';
        container.appendChild(message);
    } else {
        const message = document.createElement('div');
        message.className = 'mt-4 p-4 bg-red-900 border border-red-600 rounded-lg text-red-200 text-center';
        message.innerHTML = `⚠️ Scan completed! ${scanStats.threatsFound} threat(s) detected and quarantined.`;
        container.appendChild(message);
    }

    // Update quarantine list
    updateQuarantineList();
}

// Stop Scan
function stopScan() {
    isScanningActive = false;
    document.getElementById('scanProgressContainer').classList.add('hidden');
    document.getElementById('scanNotRunningContainer').classList.remove('hidden');
}

// Update Scan History
function updateScanHistory() {
    const tbody = document.getElementById('scanHistoryTable');
    tbody.innerHTML = '';

    scanHistory.forEach(scan => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-700 transition';
        row.innerHTML = `
            <td class="px-4 py-3 text-gray-300">${scan.date}</td>
            <td class="px-4 py-3"><span class="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs">${scan.type}</span></td>
            <td class="px-4 py-3 text-gray-300">${scan.filesScanned.toLocaleString()}</td>
            <td class="px-4 py-3"><span class="${scan.threatsFound > 0 ? 'text-red-400' : 'text-green-400'} font-semibold">${scan.threatsFound}</span></td>
            <td class="px-4 py-3 text-gray-300">${scan.duration}</td>
            <td class="px-4 py-3"><span class="bg-green-900 text-green-200 px-2 py-1 rounded text-xs">${scan.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Update Quarantine List
function updateQuarantineList() {
    const container = document.getElementById('quarantineList');
    container.innerHTML = '';

    if (scanStats.allThreats.length === 0) {
        container.innerHTML = `
            <div class="text-gray-400 text-center py-12">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>No quarantined files</p>
            </div>
        `;
        return;
    }

    scanStats.allThreats.forEach((threat, index) => {
        const riskColor = threat.riskLevel === 'critical' ? 'border-red-600 bg-red-900' :
                         threat.riskLevel === 'high' ? 'border-orange-600 bg-orange-900' : 'border-yellow-600 bg-yellow-900';

        const item = document.createElement('div');
        item.className = `p-4 rounded border ${riskColor} text-white`;
        item.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="font-bold text-lg">${threat.name}</div>
                    <div class="text-gray-300 text-sm mt-1">${threat.file}</div>
                </div>
                <span class="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300">${threat.riskLevel.toUpperCase()}</span>
            </div>
            <div class="flex justify-between items-center text-xs text-gray-400 mb-3">
                <span>Detected: ${threat.detectionDate}</span>
            </div>
            <div class="flex gap-2">
                <button class="flex-1 bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-xs font-semibold transition">
                    Delete Permanently
                </button>
                <button class="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs font-semibold transition">
                    Restore
                </button>
            </div>
        `;
        container.appendChild(item);
    });

    // Update stats
    document.getElementById('filesQuarantined').textContent = scanStats.allThreats.length;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateScanHistory();
});