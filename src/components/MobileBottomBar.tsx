'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Vote, CalendarCheck, FileBadge, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileBottomBar() {
    const pathname = usePathname();

    const navLinks = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/vote', label: 'Vote', icon: Vote },
        { href: '/attendance', label: 'Attend', icon: CalendarCheck },
        { href: '/certificate', label: 'Certs', icon: FileBadge },
        { href: '/share', label: 'Share', icon: Share2 },
    ];

    return (
        <nav
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
            className="md:hidden bg-background/80 backdrop-blur-xl border-t border-primary/20 pb-safe"
        >
            <div className="flex justify-around items-center h-16 px-2">
                {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative group",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                            )}
                        >
                            <div className="relative p-1">
                                <link.icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-indicator"
                                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(245,208,0,0.5)]"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                    />
                                )}
                            </div>
                            <span className="text-[10px] font-display uppercase tracking-wider font-medium">
                                {link.label}
                            </span>

                            {/* Active background glow */}
                            {isActive && (
                                <div className="absolute inset-0 bg-primary/5 -z-10 rounded-lg blur-md" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
