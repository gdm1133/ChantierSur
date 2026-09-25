const https = require('https');

function uploadFile(base64Data) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        
        const base64Str = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const fileBuffer = Buffer.from(base64Str, 'base64');
        
        const postData = [];
        postData.push(Buffer.from(`--${boundary}\r\n`));
        postData.push(Buffer.from(`Content-Disposition: form-data; name="purpose"\r\n\r\nocr\r\n`));
        postData.push(Buffer.from(`--${boundary}\r\n`));
        postData.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="image.jpg"\r\n`));
        postData.push(Buffer.from(`Content-Type: image/jpeg\r\n\r\n`));
        postData.push(fileBuffer);
        postData.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        
        const body = Buffer.concat(postData);

        const options = {
            hostname: 'api.mistral.ai',
            port: 443,
            path: '/v1/files',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
                } else {
                    reject(new Error(`Upload failed: ${res.statusCode} ${data}`));
                }
            });
        });
        
        req.on('error', e => reject(e));
        req.write(body);
        req.end();
    });
}

function processOCR(fileId) {
    return new Promise((resolve, reject) => {
        const bodyData = JSON.stringify({
            model: 'mistral-ocr-latest',
            document: { type: 'document_url', document_url: `https://api.mistral.ai/v1/files/${fileId}` }
        });
        
        const options = {
            hostname: 'api.mistral.ai',
            port: 443,
            path: '/v1/ocr',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
                } else {
                    reject(new Error(`OCR failed: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', e => reject(e));
        req.write(bodyData);
        req.end();
    });
}

function parseMarkdownTable(markdownText) {
    const lines = markdownText.split('\n');
    let results = [];
    let currentLot = "Lot Général";
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line.match(/^#+\s*(lot|chapitre)\s*(.*)/i)) {
            currentLot = line.replace(/^#+\s*(lot|chapitre)\s*(\d*:?-?)/i, '').trim() || currentLot;
        } else if (line.match(/^(lot|chapitre)\s*\d+[\s:-]/i)) {
             currentLot = line.replace(/^(lot|chapitre)\s*\d+[\s:-]/i, '').trim();
        }

        if (line.includes('|')) {
            const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
            
            if (line.match(/\|[-\s:]+\|/)) {
                inTable = true;
                continue;
            }
            if (!inTable) {
                inTable = true; 
                continue;
            }

            if (cells.length > 3) {
                const isNumber = (val) => /[\d]/.test(val);
                let qte = 1, pu = 0, total = 0, des = "", u = "u", num = "";
                
                if (cells.length >= 6) {
                    num = cells[0]; des = cells[1]; u = cells[2];
                    qte = parseFloat(cells[3].replace(/[^\d,\.]/g, '').replace(',', '.')) || 1;
                    pu = parseFloat(cells[4].replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
                    total = parseFloat(cells[5].replace(/[^\d,\.]/g, '').replace(',', '.')) || (qte * pu);
                } else if (cells.length === 5) {
                    des = cells[0]; u = cells[1];
                    qte = parseFloat(cells[2].replace(/[^\d,\.]/g, '').replace(',', '.')) || 1;
                    pu = parseFloat(cells[3].replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
                    total = parseFloat(cells[4].replace(/[^\d,\.]/g, '').replace(',', '.')) || (qte * pu);
                } else {
                    des = cells[0];
                    let numbers = cells.filter(c => isNumber(c));
                    if (numbers.length > 0) total = parseFloat(numbers[numbers.length - 1].replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
                    if (numbers.length > 1) pu = parseFloat(numbers[numbers.length - 2].replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
                    if (numbers.length > 2) qte = parseFloat(numbers[numbers.length - 3].replace(/[^\d,\.]/g, '').replace(',', '.')) || 1;
                }

                if (des.length > 3 && !des.toLowerCase().includes('total') && total > 0) {
                    results.push({
                        lot: currentLot, numero_prix: num,
                        designation: des.replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, '').trim(),
                        unite: u, quantite: qte, pu_ht: pu, montant_indique: total, conf: "high"
                    });
                }
            }
        } else {
            inTable = false;
        }
    }
    return results;
}

exports.handler = async function(event, context) {
    if (!process.env.MISTRAL_API_KEY) {
        console.error("MISTRAL_API_KEY manquante");
        return { 
            statusCode: 503, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ error: "missing_key", message: "Le service d'analyse n'est pas configuré — contactez l'administrateur." }) 
        };
    }

    if (event.httpMethod === 'GET') {
        return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
    }

    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const body = JSON.parse(event.body);
        if (!body.images || !body.images.length) {
            return { statusCode: 400, body: JSON.stringify({ error: "Aucune image fournie." }) };
        }

        let allLines = [];
        
        for (const base64Data of body.images) {
            const fileData = await uploadFile(base64Data);
            const ocrResult = await processOCR(fileData.id);
            
            try {
                const delReq = https.request({
                    hostname: 'api.mistral.ai', port: 443, path: `/v1/files/${fileData.id}`,
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` }
                });
                delReq.end();
            } catch (e) { /* ignore cleanup error */ }

            let markdownPage = '';
            if (ocrResult.pages && ocrResult.pages.length > 0) {
                markdownPage = ocrResult.pages.map(p => p.markdown).join('\n');
            }
            
            const parsedLines = parseMarkdownTable(markdownPage);
            allLines = allLines.concat(parsedLines);
        }

        if (allLines.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ error: "Aucune ligne de devis détectée." }) };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ lines: allLines })
        };

    } catch (error) {
        console.error("Mistral OCR Error:", error.stack || error);
        
        let userMsg = "Erreur interne lors du traitement OCR.";
        if (error.message && error.message.includes('401')) {
            console.error("MISTRAL_API_KEY invalide (Erreur 401).");
            userMsg = "Le service d'analyse n'est pas configuré — contactez l'administrateur.";
        }
        
        return {
            statusCode: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ error: "ocr_failed", message: userMsg })
        };
    }
};
