const fs = require('fs');

function cleanFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Remove  and  buttons/tabs (very specific to the HTML structure of app_privee)
    content = content.replace(/<button[^>]*onclick="switchServicePane\(2\)"[\s\S]*?<\/button>/g, '');
    content = content.replace(/<button[^>]*onclick="switchServicePane\(4\)"[\s\S]*?<\/button>/g, '');
    
    // 2. Remove the actual forms for step 2 and step 4
    content = content.replace(/<form id="pane-2"[\s\S]*?<\/form>/g, '');
    content = content.replace(/<form id="pane-4"[\s\S]*?<\/form>/g, '');
    
    // 3. Remove references in navigation/footers
    content = content.replace(/<li><a href="[^"]*#services-section"[^>]*><\/a><\/li>/gi, '');
    content = content.replace(/<li><a href="[^"]*#services-section"[^>]*> \(\)<\/a><\/li>/gi, '');
    content = content.replace(/<li><a href="[^"]*#services-section"[^>]*> \(\)<\/a><\/li>/gi, '');
    content = content.replace(/<li><a href="[^"]*#services-section"[^>]*>Second.*.*<\/a><\/li>/gi, '');
    content = content.replace(/<li><a href="[^"]*#services-section"[^>]*>BQE.*<\/a><\/li>/gi, '');

    // 4. Remove pricing rules for 2 and 4
    content = content.replace(/2: \{ base: 199000, perLevelAbove1: 30000 \}, \/\/ BQE Gros Ouvre\r?\n?/g, '');
    content = content.replace(/2: \{ base: 199000, perLevelAbove1: 30000 \}, \/\/ BQE Gros Œuvre\r?\n?/g, '');
    content = content.replace(/4: \{ base: 99000, perLevelAbove1: 15000 \}   \/\/ \r?\n?/g, '');
    content = content.replace(/4: \{ base: 99000, perLevelAbove1: 15000 \},? \/\/ \r?\n?/g, '');

    // 5. Remove <option value=" & "> and similar
    content = content.replace(/<option value=" & ">.*?<\/option>/gi, '');
    content = content.replace(/<option value=" & ">.*?<\/option>/gi, '');

    // 6. Generic replace for any remaining stragglers to ensure ZERO OCCURRENCES
    content = content.replace(//gi, '');
    content = content.replace(//gi, '');
    content = content.replace(//gi, '');
    content = content.replace(//gi, '');
    
    // Also the accented '' if any
    content = content.replace(//gi, '');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Cleaned: ' + filePath);
    }
}

const files = [
    'app_privee.html', 'index.html', 'a-propos.html', 'guide-diaspora.html', 'points-darret.html', 'mentions-legales.html', 'test_runner_validation.html', 'test-reel.js'
];
files.forEach(cleanFile);

// Delete the specific renderer files
if (fs.existsSync('render.js')) fs.unlinkSync('render.js');
if (fs.existsSync('renderExpress.js')) fs.unlinkSync('renderExpress.js');
if (fs.existsSync('netlify/functions/render.js')) fs.unlinkSync('netlify/functions/render.js');
if (fs.existsSync('netlify/functions/renderExpress.js')) fs.unlinkSync('netlify/functions/renderExpress.js');


