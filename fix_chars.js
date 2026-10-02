const fs = require('fs');
let d = fs.readFileSync('pdf-generator-old.js', 'utf8');
const replacements = {
  'Ã©': 'é', 'Ã¨': 'è', 'Ã ': 'à', 'Ãª': 'ê', 'â€™': "'", 'Ã§': 'ç', 'Ã‰': 'É', 'â€“': '-', 'Ã´': 'ô', 'Ã»': 'û', 'â‚¬': '€', 'Ã¢': 'â', 'Ã®': 'î', 'Ã¯': 'ï', 'Ãoe': 'Œ', 'Â°': '°', 'â€œ': '"', 'â€\x9d': '"', 'Â²': '²', 'Ã': 'à'
};
for (const [bad, good] of Object.entries(replacements)) {
  d = d.split(bad).join(good);
}
fs.writeFileSync('pdf-generator.js', d, 'utf8');
