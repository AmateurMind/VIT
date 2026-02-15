'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Clock, Globe, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CertificateRecord {
    fileName: string;
    hash: string;
    txId: string;
    timestamp: string;
}

interface ShareCertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: CertificateRecord | null;
}

const DURATIONS = [
    { label: '5 Seconds', value: 5 * 1000 },
    { label: '10 Seconds', value: 10 * 1000 },
    { label: '15 Seconds', value: 15 * 1000 },
    { label: '1 Minute', value: 60 * 1000 },
    { label: '1 Hour', value: 60 * 60 * 1000 },
    { label: '1 Day', value: 24 * 60 * 60 * 1000 },
    { label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
];

export function ShareCertificateModal({ isOpen, onClose, record }: ShareCertificateModalProps) {
    const [selectedDuration, setSelectedDuration] = useState<number>(DURATIONS[0].value);
    const [isCustom, setIsCustom] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('0');
    const [customSeconds, setCustomSeconds] = useState('0');
    const [copied, setCopied] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');

    const generateLink = () => {
        if (!record) return;

        let duration = selectedDuration;
        if (isCustom) {
            const mins = parseInt(customMinutes) || 0;
            const secs = parseInt(customSeconds) || 0;
            duration = (mins * 60 + secs) * 1000;
            if (duration <= 0) return; // Prevent 0 duration
        }

        const data = {
            fileName: record.fileName,
            hash: record.hash,
            txId: record.txId,
            timestamp: record.timestamp,
            expires: Date.now() + duration
        };

        const encoded = btoa(JSON.stringify(data));
        const link = `${window.location.origin}/certificate/share/${encoded}`;
        setGeneratedLink(link);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setGeneratedLink('');
        setCopied(false);
        setIsCustom(false);
        setCustomMinutes('0');
        setCustomSeconds('0');
        onClose();
    };

    if (!isOpen || !record) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md"
                >
                    <Card className="relative overflow-hidden border-primary/20 shadow-2xl bg-card">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4"
                            onClick={handleClose}
                        >
                            <X className="w-4 h-4" />
                        </Button>

                        <div className="p-6">
                            <h2 className="text-xl font-display font-bold mb-1">Share Certificate</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Generate a temporary, view-only link for <strong>{record.fileName}</strong>.
                            </p>

                            {!generatedLink ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Link Duration</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                            {DURATIONS.map((duration) => (
                                                <Button
                                                    key={duration.label}
                                                    variant={!isCustom && selectedDuration === duration.value ? "default" : "outline"}
                                                    onClick={() => {
                                                        setSelectedDuration(duration.value);
                                                        setIsCustom(false);
                                                    }}
                                                    className="justify-start text-xs"
                                                >
                                                    <Clock className="w-3 h-3 mr-2" />
                                                    {duration.label}
                                                </Button>
                                            ))}
                                            <Button
                                                variant={isCustom ? "default" : "outline"}
                                                onClick={() => setIsCustom(true)}
                                                className="justify-start text-xs"
                                            >
                                                <Clock className="w-3 h-3 mr-2" />
                                                Custom
                                            </Button>
                                        </div>

                                        {isCustom && (
                                            <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-muted/50 rounded-lg border border-border">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] uppercase text-muted-foreground font-bold">Minutes</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={customMinutes}
                                                        onChange={(e) => setCustomMinutes(e.target.value)}
                                                        className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-center"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] uppercase text-muted-foreground font-bold">Seconds</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={customSeconds}
                                                        onChange={(e) => setCustomSeconds(e.target.value)}
                                                        className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-center"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-600 dark:text-yellow-400 flex gap-2">
                                        <ShieldAlert className="w-4 h-4 shrink-0" />
                                        <p>Link will automatically expire. Viewers cannot print or copy text.</p>
                                    </div>

                                    <Button onClick={generateLink} className="w-full">
                                        <Globe className="w-4 h-4 mr-2" /> Generate Link
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Your Temporary Link</label>
                                        <div className="flex gap-2">
                                            <code className="flex-1 p-2 rounded bg-muted font-mono text-xs truncate border border-border">
                                                {generatedLink}
                                            </code>
                                            <Button size="icon" onClick={copyToClipboard} variant={copied ? "default" : "outline"}>
                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        This link is valid for {isCustom ? `${customMinutes}m ${customSeconds}s` : DURATIONS.find(d => d.value === selectedDuration)?.label}.
                                    </p>
                                    <Button variant="ghost" onClick={() => setGeneratedLink('')} className="w-full text-xs">
                                        Generate New Link
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
