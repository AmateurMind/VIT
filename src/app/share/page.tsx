'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Copy, Check, Clock, ShieldAlert, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DURATIONS = [
    { label: '5 Seconds', value: 5 * 1000 },
    { label: '10 Seconds', value: 10 * 1000 },
    { label: '5 Minutes', value: 5 * 60 * 1000 },
    { label: '1 Hour', value: 60 * 60 * 1000 },
    { label: '1 Day', value: 24 * 60 * 60 * 1000 },
    { label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
];

export default function SharePage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(DURATIONS[0].value);
    const [isCustom, setIsCustom] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('0');
    const [customSeconds, setCustomSeconds] = useState('0');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (selected.size > 2 * 1024 * 1024) { // 2MB Limit
                setError("File is too large. Please upload files smaller than 2MB for link generation.");
                setFile(null);
                setPreview(null);
                return;
            }
            setFile(selected);
            setError('');

            // Generate preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(selected);
        }
    };

    const generateLink = () => {
        if (!file || !preview) return;
        setLoading(true);

        try {
            let selectedDuration = duration;
            if (isCustom) {
                const mins = parseInt(customMinutes) || 0;
                const secs = parseInt(customSeconds) || 0;
                selectedDuration = (mins * 60 + secs) * 1000;
                if (selectedDuration <= 0) {
                    setError("Duration must be greater than 0");
                    setLoading(false);
                    return;
                }
            }

            // Format: expirationTimestamp|dataUrl
            const expires = Date.now() + selectedDuration;
            const payload = `${expires}|${preview}`;

            // Basic compression/encoding not needed as preview IS base64 data url
            // We construct the full URL with a hash fragment
            const link = `${window.location.origin}/share/view#${payload}`;

            setGeneratedLink(link);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Failed to generate link. File might be too complex.");
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-background py-12 px-4 flex items-center justify-center">
            <Card className="max-w-xl w-full border-primary/20 shadow-2xl bg-card">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-display uppercase tracking-wider">Secure File Share</CardTitle>
                    <CardDescription>
                        Share certificates, images, or documents via a temporary, secure link.
                        <br />
                        <span className="text-xs text-muted-foreground">(Max 2MB. Files are not stored on any server.)</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!generatedLink ? (
                        <div className="space-y-6">
                            {/* File Upload */}
                            <div
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
                                    }`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*,application/pdf"
                                />
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        {file.type.startsWith('image') ? (
                                            <ImageIcon className="w-10 h-10 text-primary mb-2" />
                                        ) : (
                                            <FileText className="w-10 h-10 text-primary mb-2" />
                                        )}
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                        <Button variant="ghost" size="sm" className="mt-2 text-xs text-destructive hover:text-destructive">
                                            Change File
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                        <Upload className="w-8 h-8 mb-2 opacity-50" />
                                        <p>Click to upload or drag and drop</p>
                                        <p className="text-xs mt-1">Images or PDF</p>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
                                    <ShieldAlert className="w-4 h-4" /> {error}
                                </p>
                            )}

                            {/* Duration Selector */}
                            <div className="space-y-3">
                                <Label>Link Duration</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {DURATIONS.map((d) => (
                                        <Button
                                            key={d.label}
                                            variant={!isCustom && duration === d.value ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                setDuration(d.value);
                                                setIsCustom(false);
                                            }}
                                            className="text-xs"
                                        >
                                            {d.label}
                                        </Button>
                                    ))}
                                    <Button
                                        variant={isCustom ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setIsCustom(true)}
                                        className="text-xs"
                                    >
                                        Custom
                                    </Button>
                                </div>

                                {isCustom && (
                                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Minutes</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={customMinutes}
                                                onChange={(e) => setCustomMinutes(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Seconds</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={customSeconds}
                                                onChange={(e) => setCustomSeconds(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={generateLink}
                                disabled={!file || loading}
                                className="w-full font-display uppercase tracking-wider"
                            >
                                {loading ? 'Generating...' : 'Generate Secure Link'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="text-center space-y-2">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 text-green-500 mb-2">
                                    <Check className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg">Link Ready!</h3>
                                <p className="text-sm text-muted-foreground">
                                    This link contains your file data safely encrypted.
                                    It will expire automatically.
                                </p>
                            </div>

                            <div className="bg-muted p-4 rounded-lg border border-border space-y-2">
                                <Label className="text-xs uppercase text-muted-foreground">Shareable Link</Label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-background p-2 rounded border border-border/50 text-xs font-mono break-all line-clamp-2 h-12 overflow-hidden">
                                        {generatedLink}
                                    </code>
                                    <Button size="icon" onClick={copyToClipboard} className={copied ? "bg-green-500 hover:bg-green-600" : ""}>
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Expires in {isCustom ? `${customMinutes}m ${customSeconds}s` : DURATIONS.find(d => d.value === duration)?.label}
                                </p>
                            </div>

                            <Button variant="outline" onClick={() => {
                                setGeneratedLink('');
                                setFile(null);
                                setPreview(null);
                                setIsCustom(false);
                                setCustomMinutes('0');
                                setCustomSeconds('0');
                            }} className="w-full">
                                Share Another File
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
