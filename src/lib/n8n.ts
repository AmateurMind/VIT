/**
 * n8n Webhook Integration
 * Sends event data to n8n for Telegram notifications
 */

// Placeholder URL if not set in environment
const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://primary.n8n.com/webhook-test/strotas-event';

export type EventType = 'VOTE_CAST' | 'ATTENDANCE_MARKED' | 'CERTIFICATE_STORED';

interface NotificationData {
    event: EventType;
    details: {
        studentName?: string;
        wallet: string;
        actionSummary: string;
        txId?: string;
        metadata?: Record<string, any>;
    };
}

export async function notifyN8N(data: NotificationData) {
    if (!WEBHOOK_URL) {
        console.warn('[n8n] Webhook URL not configured');
        return;
    }

    // Don't block the UI - fire and forget
    try {
        const payload = {
            ...data,
            timestamp: new Date().toISOString(),
            source: 'strotas-web-testnet'
        };

        console.log('[n8n] Sending notification:', payload);

        // Use fetch with no-cors if simple fire-and-forget to avoid CORS on some n8n setups,
        // but typically n8n webhooks support CORS if configured.
        // We'll try standard POST first.
        fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }).catch(err => console.error('[n8n] Failed to send notification (background)', err));

    } catch (err) {
        console.error('[n8n] Error preparing notification:', err);
    }
}
