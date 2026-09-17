exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Clé GEMINI_API_KEY absente des variables Netlify.' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { 
      surface = 150, 
      levels = 1, 
      zone = 'dakar_centre', 
      planBase64 = null, 
      planMimeType = 'image/jpeg',
      devisBase64 = null,
      devisMimeType = 'application/pdf'
    } = data;

    const parts = [
      {
        text: `Tu es un ingénieur génie civil sénégalais senior, expert en dimensionnement BAEL 91 révisé 99 et audit de devis gros œuvre à Dakar.

Données du projet :
- Surface développée totale : ${surface} m²
- Nombre de niveaux : ${levels} (0 = RDC seul, 1 = R+1, etc.)
- Zone géographique : ${zone}

Mission :
1. Si un plan ou croquis est joint : analyse la géométrie, extraits les portées critiques, estime le ratio de ferraillage réglementaire (kg/m³) et de ciment (sacs/m²).
2. Si un devis est joint : compare poste par poste les quantités de l'artisan aux ratios BAEL 91 R99 de la zone et quantifie l'écart financier exact en FCFA.

Format impératif : Réponds UNIQUEMENT avec un objet JSON valide (strictement aucun bloc de code markdown, pas de texte avant ni après).
{
  "score_conformite": number,
  "statut_global": string,
  "economie_recommandee": number,
  "analyse_geometrique": {
    "emprise_sol": number,
    "hauteur_totale": number,
    "portee_max": number
  },
  "ventilation_niveaux": [
    {
      "niveau": string,
      "beton_m3": number,
      "ciment_sacs": number,
      "acier_kg": number,
      "sable_m3": number,
      "gravier_m3": number
    }
  ],
  "audit_devis": [
    {
      "poste": string,
      "qte_devis": string,
      "qte_bael": string,
      "ecart": string,
      "diagnostic": string,
      "surcout_fcfa": number
    }
  ],
  "alertes_techniques": [string, string],
  "clauses_sauvegarde": [string, string]
}`
      }
    ];

    if (planBase64) {
      parts.push({
        inlineData: {
          mimeType: planMimeType,
          data: planBase64
        }
      });
    }

    if (devisBase64) {
      parts.push({
        inlineData: {
          mimeType: devisMimeType,
          data: devisBase64
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: result.error?.message || 'Erreur API Gemini' })
      };
    }

    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedJson);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedData)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur analyse : ' + err.message })
    };
  }
};
