const fs = require('fs');
const html = fs.readFileSync('app_privee.html', 'utf8');
const newPane3 = fs.readFileSync('../brain/372eee46-324a-4111-af73-8f37147edce4/scratch/new_pane3.html', 'utf8');
const newJs = fs.readFileSync('../brain/372eee46-324a-4111-af73-8f37147edce4/scratch/new_js.js', 'utf8');

let startIndex = html.indexOf('<!-- FORMULAIRE 3 : Audit Devis BTP -->');
if (startIndex === -1) {
  startIndex = html.indexOf('<!-- FORMULAIRE 3 : Audit Devis');
}
let endIndex = html.indexOf('<!-- FORMULAIRE 4 : FINITIONS', startIndex);
if(endIndex === -1) {
  endIndex = html.indexOf('<!-- FORMULAIRE 4', startIndex);
}

let newHtml = html.substring(0, startIndex) + newPane3 + "\n\n        " + html.substring(endIndex);

let jsStartIndex = newHtml.indexOf('window.addDevisLine = function()');
let jsEndIndex = newHtml.indexOf('// 8. LOGIQUE GLOBALE DE PAIEMENT');
if (jsEndIndex === -1) jsEndIndex = newHtml.indexOf('</script>'); // fallback

// The old JS starts around "let devisLineCount = 0;"
let actualJsStart = newHtml.lastIndexOf('let devisLineCount', jsStartIndex);
if(actualJsStart !== -1) jsStartIndex = actualJsStart;

newHtml = newHtml.substring(0, jsStartIndex) + newJs + "\n" + newHtml.substring(jsEndIndex);

fs.writeFileSync('app_privee.html', newHtml, 'utf8');
console.log('Replacement done.');
