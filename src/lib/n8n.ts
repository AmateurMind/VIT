/**
 * n8n Webhook Integration
 * Sends event data to n8n for Telegram notifications
 */

// Base URL for n8n webhooks (e.g., from ngrok)
const BASE_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

export type EventType = 'VOTE_CAST' | 'ATTENDANCE_MARKED' | 'CERTIFICATE_STORED';

interface VoteData {
    voter: string;
    option: string;
    explorerUrl: string;
}

interface AttendanceData {
    studentName: string;
    sessionId: string;
    locationVerified: boolean;
    explorerUrl: string;
}

interface CertificateData {
    fileName: string;
    hash: string;
    explorerUrl: string;
}

export async function notifyVoteCast(data: VoteData) {
    await sendWebhook('vote-cast', data);
}

export async function notifyAttendanceMarked(data: AttendanceData) {
    await sendWebhook('attendance-marked', data);
}

export async function notifyCertificateStored(data: CertificateData) {
    await sendWebhook('certificate-stored', data);
}

async function sendWebhook(path: string, payload: any) {
    if (!BASE_WEBHOOK_URL) return;

    try {
        const url = `${BASE_WEBHOOK_URL}/${path}`;
        console.log(`[n8n] Sending to ${url}:`, payload);

        // Fire and forget
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error(`[n8n] Failed to send to ${path}`, err));
    } catch (error) {
        console.error(`[n8n] Error preparing webhook for ${path}`, error);
    }
}
