

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const data = JSON.parse(event.body);
        const { email, ref, service, pdfData } = data;

        if (!email || !ref || !pdfData) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters' })
            };
        }

        // Clean up datauristring for attachment (remove 'data:application/pdf;filename=generated.pdf;base64,')
        const base64Data = pdfData.split(',')[1] || pdfData;

        // Send via Resend API
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            console.error("RESEND_API_KEY is not defined");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'ChantierSur.com <dossiers@chantiersur.com>',
                to: email,
                subject: `[ChantierSur] Votre Dossier Technique - Réf: ${ref}`,
                html: `
                    <div style="font-family: sans-serif; color: #0B1325; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #F59E0B;">ChantierSur.com - Ingénierie & BTP</h2>
                        <p>Bonjour,</p>
                        <p>Nous vous remercions pour votre confiance. Vous trouverez en pièce jointe votre dossier technique <strong>${service.toUpperCase()}</strong> (Réf: ${ref}) généré par nos systèmes.</p>
                        <p>Ce document est certifié conforme aux normes BAEL 91 R99 et au droit sénégalais (COCC).</p>
                        <p>En cas de perte, vous pouvez revérifier son authenticité sur notre plateforme à l'aide de votre numéro de référence.</p>
                        <p>Cordialement,<br/><strong>L'équipe Ingénierie ChantierSur</strong></p>
                    </div>
                `,
                attachments: [
                    {
                        filename: `${ref}_${service.toUpperCase()}.pdf`,
                        content: base64Data
                    }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Resend API error:", err);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to send email' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Email sent successfully' })
        };
    } catch (error) {
        console.error("Error in send-backup-email:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
