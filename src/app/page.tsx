'use client';

import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Vote, FileCheck, ShieldCheck, Wallet, Activity, Zap, Lock, Eye, Box, Layers, Wind, Cpu, MonitorPlay, MonitorStop } from 'lucide-react';
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { useState } from 'react';

export default function HomePage() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [show3D, setShow3D] = useState(true);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } }
  };

  return (
    <div className="min-h-screen scanlines">
      {/* === HEADER / NAV === */}
      <header className="flex justify-between items-center py-4 px-6 md:px-12 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display text-lg tracking-[0.2em] text-primary font-bold uppercase">
            Strotas
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground font-medium uppercase tracking-wider">
          <Link href="/vote" className="hover:text-primary transition-colors">Vote</Link>
          <Link href="/attendance" className="hover:text-primary transition-colors">Attend</Link>
          <Link href="/certificate" className="hover:text-primary transition-colors">Certs</Link>
        </nav>

        <div>
          {isConnected ? (
            <div className="flex items-center gap-3 border border-primary/30 px-4 py-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-primary">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <Button onClick={disconnect} variant="destructive" size="sm" className="h-7 px-3 text-xs font-display uppercase tracking-wider">
                DC
              </Button>
            </div>
          ) : (
            <Button
              onClick={connect}
              disabled={isConnecting}
              size="sm"
              className="font-display uppercase tracking-wider text-xs border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5"
            >
              {isConnecting ? '...' : 'Connect'}
              <Wallet className="w-3.5 h-3.5 ml-2" />
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* === HERO === */}
          <motion.section variants={item} className="pt-12 md:pt-20 pb-20 relative min-h-[600px] flex flex-col md:flex-row items-center gap-8">
            <Spotlight
              className="-top-40 left-0 md:left-60 md:-top-20"
              fill="#F5D000"
            />

            {/* Left Content */}
            <div className="flex-1 text-left z-10">
              <Badge variant="outline" className="mb-6 px-4 py-1 text-xs font-display uppercase tracking-[0.3em] border-primary/40 text-primary">
                // SYSTEM ONLINE — TESTNET
              </Badge>

              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/50 text-glow leading-[0.9] mb-6">
                STROTAS
              </h1>
              <h2 className="font-display text-xl md:text-2xl tracking-[0.2em] uppercase text-foreground/80 mb-6">
                Blockchain Secured<br />
                <span className="text-primary/70 text-lg md:text-xl tracking-[0.1em]">Campus Governance</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed mb-8">
                Immutable records for voting, attendance, and certification. Built on Algorand for absolute transparency and trust.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="font-display uppercase tracking-wider text-sm h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary" asChild>
                  <Link href="/vote">
                    Enter System <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="font-display uppercase tracking-wider text-sm h-12 px-8 border-2 border-primary/40 text-primary hover:bg-primary/10" asChild>
                  <Link href="https://explorer.perawallet.app/" target="_blank">
                    Explorer
                  </Link>
                </Button>
              </div>

              {/* Status Bar */}
              <div className="mt-12 flex items-center gap-6 text-[10px] md:text-xs font-mono text-muted-foreground border-t border-border/50 pt-6">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full rounded-full ${show3D ? 'animate-ping bg-green-400' : 'bg-yellow-500'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${show3D ? 'bg-green-500' : 'bg-yellow-600'}`}></span>
                  </span>
                  STATUS: {show3D ? 'HIGH PERF' : 'ECO MODE'}
                </span>
                <span className="hidden md:inline">|</span>
                <span>SECURED BY ALGORAND</span>
              </div>
            </div>

            {/* Right Content - 3D Scene */}
            <div className="flex-1 w-full h-[400px] md:h-[600px] relative group/3d">
              <div className="absolute top-4 right-4 z-20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShow3D(!show3D)}
                  className="bg-background/50 backdrop-blur border-primary/30 hover:border-primary text-xs font-mono gap-2"
                >
                  {show3D ? <MonitorStop className="w-4 h-4" /> : <MonitorPlay className="w-4 h-4" />}
                  {show3D ? 'DISABLE 3D' : 'ENABLE 3D'}
                </Button>
              </div>

              <div className="absolute inset-0 z-0 transition-opacity duration-500">
                {show3D ? (
                  <SplineScene
                    scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center border border-primary/10 rounded-3xl bg-primary/5">
                    <div className="text-center space-y-2">
                      <Box className="w-12 h-12 text-primary/20 mx-auto" />
                      <p className="text-xs font-mono text-primary/40 uppercase tracking-widest">3D Visualization Paused</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Overlay to prevent interaction stealing if needed, or gradient fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            </div>

          </motion.section>

          {/* === MODULES / FEATURE CARDS === */}
          <motion.section variants={item} className="pb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-border" />
              <span className="font-display text-xs uppercase tracking-[0.3em] text-primary">Modules</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {/* Voting */}
              <Link href="/vote" className="group">
                <Card className="h-full bg-card border-border hover:border-primary/50 transition-all duration-300 group-hover:border-glow overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/0 group-hover:bg-primary/60 transition-all duration-300" />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 border border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors">
                        <Vote className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">MOD.01</span>
                    </div>
                    <CardTitle className="text-base font-display uppercase tracking-wider text-foreground">Secure Voting</CardTitle>
                    <CardDescription className="text-xs">On-chain governance protocol</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      One wallet = one vote. Results are mathematically verifiable and tamper-proof.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-primary font-display uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Access <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Attendance */}
              <Link href="/attendance" className="group">
                <Card className="h-full bg-card border-border hover:border-primary/50 transition-all duration-300 group-hover:border-glow overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/0 group-hover:bg-primary/60 transition-all duration-300" />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 border border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">MOD.02</span>
                    </div>
                    <CardTitle className="text-base font-display uppercase tracking-wider text-foreground">Smart Attendance</CardTitle>
                    <CardDescription className="text-xs">Immutable presence records</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Mark attendance directly on the blockchain. Zero proxy, zero dispute.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-primary font-display uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Access <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Certificates */}
              <Link href="/certificate" className="group">
                <Card className="h-full bg-card border-border hover:border-primary/50 transition-all duration-300 group-hover:border-glow overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/0 group-hover:bg-primary/60 transition-all duration-300" />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 border border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors">
                        <FileCheck className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">MOD.03</span>
                    </div>
                    <CardTitle className="text-base font-display uppercase tracking-wider text-foreground">Certificates</CardTitle>
                    <CardDescription className="text-xs">Hash-based verification</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Issue and verify credentials backed by cryptographic proofs on-chain.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-primary font-display uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Access <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </motion.section>

          {/* === TECH STACK === */}
          <motion.section variants={item} className="pb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-border" />
              <span className="font-display text-xs uppercase tracking-[0.3em] text-primary">Powering The System</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {/* Next.js */}
              <div className="flex flex-col items-center gap-3 p-4 border border-transparent hover:border-primary/20 transition-colors rounded-lg group">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold uppercase tracking-wider">Next.js 14</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">App Router & Server Actions</p>
                </div>
              </div>

              {/* Algorand */}
              <div className="flex flex-col items-center gap-3 p-4 border border-transparent hover:border-primary/20 transition-colors rounded-lg group">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold uppercase tracking-wider">Algorand</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">Layer-1 Pure PoS Blockchain</p>
                </div>
              </div>

              {/* Tailwind */}
              <div className="flex flex-col items-center gap-3 p-4 border border-transparent hover:border-primary/20 transition-colors rounded-lg group">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
                  <Wind className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold uppercase tracking-wider">Tailwind CSS</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">Utility-First Styling Engine</p>
                </div>
              </div>

              {/* Three.js */}
              <div className="flex flex-col items-center gap-3 p-4 border border-transparent hover:border-primary/20 transition-colors rounded-lg group">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
                  <Box className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold uppercase tracking-wider">Three.js</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">High-Performance 3D WebGL</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* === HOW IT WORKS === */}
          <motion.section variants={item} className="pb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-border" />
              <span className="font-display text-xs uppercase tracking-[0.3em] text-primary">Protocol</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { num: '01', icon: <Wallet className="w-5 h-5" />, title: 'Connect', desc: 'Link Pera Wallet' },
                { num: '02', icon: <Zap className="w-5 h-5" />, title: 'Execute', desc: 'Vote / Attend / Verify' },
                { num: '03', icon: <Lock className="w-5 h-5" />, title: 'Seal', desc: 'Algorand stores proof' },
                { num: '04', icon: <Eye className="w-5 h-5" />, title: 'Verify', desc: 'Anyone can audit' },
              ].map((step) => (
                <div key={step.num} className="border border-border p-5 relative group hover:border-primary/40 transition-colors">
                  <span className="text-[10px] font-mono text-primary/50 absolute top-2 right-3">{step.num}</span>
                  <div className="text-primary mb-3">{step.icon}</div>
                  <h4 className="font-display text-sm uppercase tracking-wider text-foreground mb-1">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* === STATS === */}
          <motion.section variants={item} className="pb-20">
            <div className="border border-primary/30 p-8 relative corner-bracket">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <h3 className="font-display text-3xl font-bold text-primary text-glow">100%</h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">Uptime</p>
                </div>
                <div>
                  <h3 className="font-display text-3xl font-bold text-primary text-glow">TESTNET</h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">Network</p>
                </div>
                <div>
                  <h3 className="font-display text-3xl font-bold text-primary text-glow">~3.8s</h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">Finality</p>
                </div>
                <div>
                  <h3 className="font-display text-3xl font-bold text-primary text-glow">0.001</h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">ALGO/Tx</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* === FOOTER === */}
          <footer className="border-t border-border py-8 text-center">
            <p className="text-xs font-mono text-muted-foreground">
              © STROTAS 2026 — Built on <span className="text-primary">Algorand</span> — All records are immutable
            </p>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
