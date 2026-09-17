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
1. Si un plan ou croquis est joint : analyse la géométrie, estime le nombre de poteaux et travées, et ventile les besoins théoriques niveau par niveau selon le BAEL.
2. Si un devis est joint : analyse ligne par ligne les sacs de ciment, tonnes d'acier HA, agrégats et coût de main-d'œuvre. Compare-les aux ratios BAEL stricts et relève les surfacturations (> 10%) ou sous-dimensionnements.

Format impératif : Réponds UNIQUEMENT avec un objet JSON valide, sans bloc de code markdown.
{
  "analyse_geometrique": {
    "surface_par_niveau": number,
    "nombre_poteaux_estime": number,
    "observations": string
  },
  "recapitulatif_bael": [
    {
      "niveau": string,
      "ciment_sacs": number,
      "acier_kg": number,
      "sable_m3": number,
      "gravier_m3": number
    }
  ],
  "audit_devis": [
    {
      "poste": string,
      "quantite_devis": string,
      "quantite_bael": string,
      "statut": "Conforme" | "Surfacturation" | "Sous-dimensionnement",
      "explication": string
    }
  ],
  "alertes_chantier": [string, string, string]
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
