import pdfplumber
from pypdf import PdfReader
import re
import json
import sys
import argparse
from pathlib import Path

def parse_montant(val_str):
    if val_str is None:
        return None
    
    # Remove currency symbols and common words
    clean = re.sub(r'(?i)(FCFA|F CFA|CFA|F|€)', '', str(val_str)).strip()
    
    # Remove spaces (including non-breaking spaces)
    clean = re.sub(r'[\s\u00a0\u202f]+', '', clean)
    
    if not clean:
        return None
    
    # Handle formats like 1.234.567,89 -> 1234567.89
    # If there's a comma and a period, the comma is likely the decimal separator
    if ',' in clean and '.' in clean:
        clean = clean.replace('.', '')
        clean = clean.replace(',', '.')
    elif ',' in clean:
        # Check if comma is used as thousand separator (e.g. 1,234,567.89 is rare in french but possible)
        # Assuming standard French format: 1 234,56
        clean = clean.replace(',', '.')
    
    try:
        return float(clean)
    except ValueError:
        return None

def infer_nature(text):
    if not text:
        return "inconnu"
    text_lower = text.lower()
    
    if re.search(r'fournit.*pose|fourni.*pos(e|é)|f/p', text_lower):
        return "fourniture_et_pose"
    elif re.search(r'fourniture.*seule|fourniture.*uniquement', text_lower):
        return "fourniture_seule"
    elif re.search(r'main d[\'’]?[oœ]uvre|pose seule', text_lower):
        return "main_oeuvre_seule"
    
    return "inconnu"

def calculate_confidence(line_data, source_type):
    confidence = 0.9 if source_type == 'table' else 0.4
    
    if line_data.get('quantite') is None:
        confidence -= 0.1
    if line_data.get('pu_ht') is None:
        confidence -= 0.1
    if not line_data.get('unite'):
        confidence -= 0.1
    if not line_data.get('lot'):
        confidence -= 0.1
    if not line_data.get('numero_prix'):
        confidence -= 0.1
        
    return max(0.3 if source_type == 'table' else 0.0, min(1.0, confidence))

def extract_acroform(pdf_path):
    data = {}
    try:
        reader = PdfReader(pdf_path)
        fields = reader.get_fields()
        if fields:
            for key, field in fields.items():
                val = field.get('/V')
                if val:
                    data[key] = val
    except Exception as e:
        pass
    return data

def parse_pdf(file_path):
    result = {
        "infos": {
            "numero_devis": None, "date_devis": None,
            "entreprise": None, "ninea_rccm": None,
            "telephone": None, "objet": None,
            "type_batiment": None, "surface_sdp_m2": None, "localisation": None
        },
        "lignes": [],
        "totaux": {
            "total_ht_indique": None, "total_ht_calcule": None,
            "tva_appliquee": False, "tva_taux": None,
            "total_ttc": None, "acompte_pct": None,
            "delai_execution": None, "validite_devis": None,
            "montant_en_lettres": False
        },
        "alertes": []
    }
    
    # 1. Try to get AcroForm data (if it's a fillable PDF)
    acro_data = extract_acroform(file_path)
    # Map acro_data to result if needed (omitted for simplicity, focus on text extraction)
    
    current_lot = None
    has_text = False
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    has_text = True
                
                # --- EN-TÊTE / TOTAUX PARSING ---
                if text:
                    for line in text.split('\n'):
                        line_upper = line.upper()
                        
                        # Lot detection
                        lot_match = re.search(r'^\s*LOT\s*(\d+)?\s*[:\-–.]?\s*(.*)$', line_upper, re.IGNORECASE)
                        if lot_match:
                            current_lot = line.strip()
                            continue
                            
                        # Infos detection
                        if re.search(r'DEVIS N°|N° DEVIS', line_upper):
                            m = re.search(r'DEVIS N°\s*([A-Z0-9\-_]+)', line_upper)
                            if m: result['infos']['numero_devis'] = m.group(1)
                            
                        if re.search(r'\d{2}/\d{2}/\d{4}', line):
                            m = re.search(r'(\d{2}/\d{2}/\d{4})', line)
                            if m: result['infos']['date_devis'] = m.group(1)
                            
                        if 'NINEA' in line_upper:
                            m = re.search(r'NINEA\s*[:\-]?\s*([A-Z0-9]+)', line_upper)
                            if m: result['infos']['ninea_rccm'] = m.group(1)
                            
                        if re.search(r'(\+221|00221)?\s*[783]\d[\s\.\-]?\d{3}[\s\.\-]?\d{2}[\s\.\-]?\d{2}', line):
                            m = re.search(r'(\+221|00221)?\s*[783]\d(?:[\s\.\-]?\d){7}', line)
                            if m: result['infos']['telephone'] = m.group(0).strip()
                            
                        if 'TOTAL HT' in line_upper or 'MONTANT HT' in line_upper:
                            m = re.search(r'(?:TOTAL|MONTANT) HT.*?\s+([\d\s\.,]+)\s*(?:FCFA|F CFA|CFA|F)?', line_upper)
                            if m: result['totaux']['total_ht_indique'] = parse_montant(m.group(1))
                            
                        if 'ACOMPTE' in line_upper:
                            m = re.search(r'ACOMPTE.*?(\d+)\s*%', line_upper)
                            if m: result['totaux']['acompte_pct'] = float(m.group(1))

                # --- TABLE PARSING ---
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            # Clean None values
                            row = [str(cell).replace('\n', ' ').strip() if cell is not None else "" for cell in row]
                            # Filter empty rows
                            if not any(row): continue
                            
                            # Heuristic: find columns with numbers
                            num_cols = [i for i, cell in enumerate(row) if parse_montant(cell) is not None]
                            if len(num_cols) >= 2:
                                # Likely Qty, PU, Montant
                                montant = parse_montant(row[num_cols[-1]])
                                pu = parse_montant(row[num_cols[-2]])
                                qte = parse_montant(row[num_cols[-3]]) if len(num_cols) >= 3 else None
                                
                                # Guess unit
                                unite = None
                                possible_unit_cols = [i for i in range(len(row)) if len(row[i]) <= 5 and not parse_montant(row[i])]
                                if possible_unit_cols:
                                    unite = row[possible_unit_cols[-1]]
                                    
                                # Guess designation (longest text column)
                                text_cols = [i for i, cell in enumerate(row) if i not in num_cols and i not in possible_unit_cols]
                                designation = ""
                                if text_cols:
                                    longest_col = max(text_cols, key=lambda i: len(row[i]))
                                    designation = row[longest_col]
                                    
                                # Guess N° Prix (first text col if short)
                                num_prix = None
                                if text_cols and len(row[text_cols[0]]) <= 10:
                                    num_prix = row[text_cols[0]]
                                    if text_cols[0] == longest_col and len(text_cols) > 1:
                                        longest_col = max(text_cols[1:], key=lambda i: len(row[i]))
                                        designation = row[longest_col]
                                        
                                if designation and montant is not None:
                                    line_data = {
                                        "lot": current_lot,
                                        "numero_prix": num_prix,
                                        "designation": designation,
                                        "nature_prix": infer_nature(designation),
                                        "unite": unite,
                                        "quantite": qte,
                                        "pu_ht": pu,
                                        "montant_indique": montant,
                                        "montant_recalcule": round(qte * pu, 2) if qte is not None and pu is not None else None,
                                        "ecart": None,
                                        "confiance": 0.0
                                    }
                                    
                                    if line_data["montant_recalcule"] is not None:
                                        line_data["ecart"] = line_data["montant_indique"] - line_data["montant_recalcule"]
                                        if abs(line_data["ecart"]) > 1.0:
                                            result["alertes"].append(f"Écart arithmétique sur la ligne: {designation}")
                                            
                                    line_data["confiance"] = calculate_confidence(line_data, 'table')
                                    if line_data["confiance"] < 0.6:
                                        result["alertes"].append(f"Ligne à faible confiance: {designation}")
                                        
                                    result["lignes"].append(line_data)
                
                # --- TEXT FALLBACK (If no tables found or missed lines) ---
                # Simplified for demonstration. In a full implementation, we would avoid duplicating lines found in tables.
                
    except Exception as e:
        result["alertes"].append(f"Erreur d'extraction: {str(e)}")
        
    if not has_text:
        result["alertes"].append("Aucun texte trouvé (Scan probable). Basculer sur OCR Phase 2.")
        
    # Calculate Total
    calc_total = sum(l["montant_recalcule"] for l in result["lignes"] if l["montant_recalcule"] is not None)
    if calc_total > 0:
        result["totaux"]["total_ht_calcule"] = calc_total
        if result["totaux"]["total_ht_indique"]:
            if abs(calc_total - result["totaux"]["total_ht_indique"]) > 10.0:
                result["alertes"].append("Total HT incohérent avec la somme des lignes")
                
    # Uniquify alerts
    result["alertes"] = list(set(result["alertes"]))
        
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse PDF Devis and output JSON")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    args = parser.parse_args()
    
    file_path = args.pdf_path
    if not Path(file_path).exists():
        print(json.dumps({"error": "File not found"}), file=sys.stderr)
        sys.exit(1)
        
    res = parse_pdf(file_path)
    print(json.dumps(res, ensure_ascii=False, indent=2))
