import React, { useEffect, useRef, useState } from "react";
import { 
  ShieldAlert, 
  Gamepad2, 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Cpu, 
  Zap, 
  Compass, 
  ShieldAlert as SentinelIcon,
  Play,
  Award
} from "lucide-react";

// SFX engine using Web Audio API (totally pure, zero dependency)
class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playExplosion() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playLaserChain() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playImpact() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.setValueAtTime(40, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playSelect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(330, this.ctx.currentTime);
    osc.frequency.setValueAtTime(440, this.ctx.currentTime + 0.06);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
}

const sfx = new SoundEngine();

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

interface Blast {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  speed: number;
  color: string;
  size: number;
}

interface Anomaly {
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  size: number;
  color: string;
  angle: number;
  amplitude: number;
  freq: number;
  timeOffset: number;
}

interface Beacon {
  x: number;
  y: number;
  type: "pathfinder" | "sentinel" | "conductor";
  angle: number;
  cooldown: number;
  range: number;
  level: number;
}

interface SwarmGameProps {
  isDark: boolean;
}

export const SwarmGame: React.FC<SwarmGameProps> = ({ isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // React-accessible levels and triggers
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(100); // core health %
  const [score, setScore] = useState<number>(0);
  const [credits, setCredits] = useState<number>(150); // currency
  const [selectedTool, setSelectedTool] = useState<"blast" | "pathfinder" | "sentinel" | "conductor">("blast");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("swarm-game-high-score") || "0");
    } catch {
      return 0;
    }
  });

  // Hot reference states for frame ticking
  const stateRef = useRef({
    isPlaying: false,
    confidence: 100,
    score: 0,
    credits: 150,
    selectedTool: "blast" as "blast" | "pathfinder" | "sentinel" | "conductor",
    width: 400,
    height: 280,
    anomalies: [] as Anomaly[],
    blasts: [] as Blast[],
    beacons: [] as Beacon[],
    particles: [] as Particle[],
    wave: 1,
    spawnTimer: 0,
    spawnInterval: 120, // frames
    screenShake: 0,
  });

  // Track state changes to synch back to React for panels
  const updateReactState = () => {
    setConfidence(Math.round(stateRef.current.confidence));
    setScore(stateRef.current.score);
    setCredits(stateRef.current.credits);
  };

  // Set initial dimensions based on parent container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const d = containerRef.current.getBoundingClientRect();
        const w = d.width || 400;
        const h = d.height || 280;
        canvasRef.current.width = w;
        canvasRef.current.height = h;
        stateRef.current.width = w;
        stateRef.current.height = h;
      }
    };

    handleResize();
    const observer = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Update sound settings
  useEffect(() => {
    sfx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Handle local state sync
  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.selectedTool = selectedTool;
  }, [isPlaying, selectedTool]);

  // Main game controller loop
  useEffect(() => {
    let animFrame: number;

    const gameTick = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrame = requestAnimationFrame(gameTick);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animFrame = requestAnimationFrame(gameTick);
        return;
      }

      const st = stateRef.current;
      const themeColors = {
        core: isDark ? "#3b82f6" : "#2563eb",
        shield: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.15)",
        grid: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(15, 23, 42, 0.03)",
        text: isDark ? "#94a3b8" : "#475569",
        bg: isDark ? "#080c14" : "#f8fafc",
      };

      // 1. Clear Screen & Draw Grid with optional shockwave screen shake
      ctx.save();
      if (st.screenShake > 0) {
        const dx = (Math.random() - 0.5) * st.screenShake;
        const dy = (Math.random() - 0.5) * st.screenShake;
        ctx.translate(dx, dy);
        st.screenShake *= 0.88; // decay
        if (st.screenShake < 0.2) st.screenShake = 0;
      }

      ctx.fillStyle = themeColors.bg;
      ctx.fillRect(0, 0, st.width, st.height);

      // Background grid lines
      ctx.strokeStyle = themeColors.grid;
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let x = 0; x < st.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, st.height);
        ctx.stroke();
      }
      for (let y = 0; y < st.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(st.width, y);
        ctx.stroke();
      }

      const coreX = st.width / 2;
      const coreY = st.height / 2;
      const coreRadius = 24;

      if (!st.isPlaying) {
        // IDLE PROTOCOL / GAME OVER / START SCREEN
        ctx.restore();

        // Beautiful floating particle cloud in background
        if (Math.random() < 0.05) {
          st.particles.push({
            x: Math.random() * st.width,
            y: Math.random() * st.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            color: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.1)",
            size: Math.random() * 3 + 1,
            alpha: 1,
            decay: 0.005,
          });
        }

        // Draw and update idle ambient particles
        st.particles.forEach((p, index) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;
          if (p.alpha <= 0) {
            st.particles.splice(index, 1);
            return;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });

        // Draw central core in stand-by pulsing ring
        const standbyPulse = 1 + Math.sin(Date.now() * 0.003) * 0.15;
        ctx.beginPath();
        ctx.arc(coreX, coreY, coreRadius * standbyPulse, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(coreX, coreY, 12, 0, Math.PI * 2);
        ctx.fillStyle = themeColors.core;
        ctx.fill();

        animFrame = requestAnimationFrame(gameTick);
        return;
      }

      // --- GAME IS ACTIVE SYSTEM ---

      // 2. Spawn Data Drift Anomalies
      st.spawnTimer++;
      const currentSpawnInterval = Math.max(30, st.spawnInterval - Math.floor(st.score / 150) * 10);
      if (st.spawnTimer >= currentSpawnInterval) {
        st.spawnTimer = 0;
        
        // Spawn randomly around the outer perimeter boundary
        let spawnX = 0;
        let spawnY = 0;
        const side = Math.floor(Math.random() * 4);
        const padding = 20;

        if (side === 0) { // Top
          spawnX = Math.random() * st.width;
          spawnY = -padding;
        } else if (side === 1) { // Right
          spawnX = st.width + padding;
          spawnY = Math.random() * st.height;
        } else if (side === 2) { // Bottom
          spawnX = Math.random() * st.width;
          spawnY = st.height + padding;
        } else { // Left
          spawnX = -padding;
          spawnY = Math.random() * st.height;
        }

        // Setup progressive threat speeds
        const waveSpeedFactor = 1 + (st.score / 1000) * 0.2;
        const bugHp = 1 + Math.floor(st.score / 400); // tougher enemies later
        const colorPalette = ["#f43f5e", "#ff007f", "#ec4899", "#d946ef"];
        const waveColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

        st.anomalies.push({
          x: spawnX,
          y: spawnY,
          speed: (0.45 + Math.random() * 0.5) * waveSpeedFactor,
          hp: bugHp,
          maxHp: bugHp,
          size: 7 + Math.random() * 5 + (bugHp * 1.5),
          color: waveColor,
          angle: Math.random() * Math.PI * 2,
          amplitude: 15 + Math.random() * 20, // wavy motion coefficients
          freq: 0.02 + Math.random() * 0.03,
          timeOffset: Math.random() * 1000,
        });
      }

      // 3. Draw & Process Central Core (The Decision Hearth)
      const pulseRate = 1 + Math.sin(Date.now() * 0.004) * 0.08;
      
      // Draw pulsating network shielding field
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.shield;
      ctx.fill();
      ctx.strokeStyle = isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.1)";
      ctx.stroke();

      // Main core ball
      const coreHue = st.confidence < 30 ? "#ef4444" : (st.confidence < 60 ? "#f59e0b" : themeColors.core);
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreRadius * pulseRate, 0, Math.PI * 2);
      ctx.fillStyle = coreHue;
      ctx.shadowBlur = 15;
      ctx.shadowColor = coreHue;
      ctx.fill();
      ctx.shadowBlur = 0; // reset shadow

      // Shield overlay indicator
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreRadius * pulseRate + 3, 0, Math.PI * 2 * (st.confidence / 100));
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Core text labeling
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CORE", coreX, coreY + 3);

      // 4. Update & Draw Beacons (Autonomous Bots deployed by owner)
      st.beacons.forEach((b) => {
        // Draw connection fiber back to core
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(coreX, coreY);
        ctx.strokeStyle = isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(37, 99, 235, 0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Increment rotation angular velocity
        b.angle += 0.015;

        // Visual layout of the turret body
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        // Core base platform
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        if (b.type === "pathfinder") {
          ctx.fillStyle = "#10b981"; // emerald launcher
          ctx.fill();
          // Barrel indicator
          ctx.fillStyle = isDark ? "#000000" : "#ffffff";
          ctx.fillRect(0, -2, 13, 4);
        } else if (b.type === "sentinel") {
          ctx.fillStyle = "#f59e0b"; // amber shield creator
          ctx.fill();
          // Revolving shields indicators
          ctx.beginPath();
          ctx.arc(0, 0, 11, -0.6, 0.6);
          ctx.arc(0, 0, 11, Math.PI - 0.6, Math.PI + 0.6);
          ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (b.type === "conductor") {
          ctx.fillStyle = "#8b5cf6"; // purple lightning machine
          ctx.fill();
          // Electric coil details
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#c084fc";
          ctx.beginPath();
          ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
          ctx.moveTo(-6, 6); ctx.lineTo(6, -6);
          ctx.stroke();
        }
        ctx.restore();

        // Handle reloading / gun cool downs
        if (b.cooldown > 0) {
          b.cooldown--;
        } else {
          // Autonomous target scanning protocol: Find closest valid anomaly in target range
          let closestAnomaly: Anomaly | null = null;
          let minDistance = b.range;

          st.anomalies.forEach((a) => {
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < minDistance) {
              minDistance = dist;
              closestAnomaly = a;
            }
          });

          // Action triggered!
          if (closestAnomaly) {
            if (b.type === "pathfinder") {
              // Standard homing blaster core
              const dx = (closestAnomaly as Anomaly).x - b.x;
              const dy = (closestAnomaly as Anomaly).y - b.y;
              const angleToThreat = Math.atan2(dy, dx);
              b.angle = angleToThreat; // point barrel

              const speed = 4.5;
              st.blasts.push({
                x: b.x,
                y: b.y,
                targetX: (closestAnomaly as Anomaly).x,
                targetY: (closestAnomaly as Anomaly).y,
                vx: Math.cos(angleToThreat) * speed,
                vy: Math.sin(angleToThreat) * speed,
                speed,
                color: "#10b981",
                size: 3.5,
              });
              b.cooldown = 35; // shoot rate delay
              sfx.playLaser();
            } else if (b.type === "conductor") {
              // Purple lightning chain strike
              b.cooldown = 70; // high cooldown
              sfx.playLaserChain();

              // Shoot electric arcs down the target stream
              const maxBounces = 3;
              let currentSource = b;
              let struckList = new Set<Anomaly>();

              for (let bounce = 0; bounce < maxBounces; bounce++) {
                let currentTarget: Anomaly | null = null;
                let nearDist = 90;

                st.anomalies.forEach((cand) => {
                  if (struckList.has(cand)) return;
                  const dist = Math.hypot(cand.x - currentSource.x, cand.y - currentSource.y);
                  if (dist < nearDist) {
                    nearDist = dist;
                    currentTarget = cand;
                  }
                });

                if (currentTarget) {
                  // Damage enemy
                  (currentTarget as Anomaly).hp -= (1.5 + (b.level * 0.5));
                  struckList.add(currentTarget);

                  // Add flashy lightning rendering trail
                  st.particles.push({
                    x: (currentSource.x + (currentTarget as Anomaly).x) / 2,
                    y: (currentSource.y + (currentTarget as Anomaly).y) / 2,
                    vx: 0,
                    vy: 0,
                    color: "rgba(167, 139, 250, 0.8)",
                    size: 4,
                    alpha: 1.0,
                    decay: 0.12, // fast flash
                  });

                  // Render direct zap line in this single tick
                  ctx.beginPath();
                  ctx.moveTo(currentSource.x, currentSource.y);
                  ctx.lineTo((currentTarget as Anomaly).x, (currentTarget as Anomaly).y);
                  ctx.strokeStyle = "#a78bfa";
                  ctx.lineWidth = 3;
                  ctx.stroke();

                  // Next bounce propagates from this victim
                  currentSource = currentTarget as any;
                } else {
                  break;
                }
              }
            } else if (b.type === "sentinel") {
              // Sentinel launches self-rotating minor shield walls that absorb anomalies on impact
              // Let Sentinel spin shield, absorbs 40 units radius around it
              b.angle += 0.08; // speed spin
            }
          }
        }
      });

      // 5. Update & Draw Defensive Verification Blasts
      st.blasts.forEach((bl, bIdx) => {
        bl.x += bl.vx;
        bl.y += bl.vy;

        // Draw laser shot trails
        ctx.beginPath();
        ctx.arc(bl.x, bl.y, bl.size, 0, Math.PI * 2);
        ctx.fillStyle = bl.color;
        ctx.fill();

        // Bounce/out of bounds safety cleanup
        if (bl.x < -10 || bl.x > st.width + 10 || bl.y < -10 || bl.y > st.height + 10) {
          st.blasts.splice(bIdx, 1);
        }
      });

      // 6. Update, Move & Collide Data Drift Anomalies (Threats)
      st.anomalies.forEach((a, aIdx) => {
        // Find direction towards central core (coreX, coreY)
        const dx = coreX - a.x;
        const dy = coreY - a.y;
        const distToCore = Math.hypot(dx, dy);

        // Sine wave displacement to make movement wiggly and exciting!
        const dirX = dx / distToCore;
        const dirY = dy / distToCore;
        
        // Orthogonal offset vector for wavy glide
        const orthoX = -dirY;
        const orthoY = dirX;

        const cycleTime = Date.now() / 1000 + a.timeOffset;
        const wiggle = Math.sin(cycleTime * Math.PI * 2 * a.freq) * a.amplitude * 0.015;

        a.x += dirX * a.speed + orthoX * wiggle;
        a.y += dirY * a.speed + orthoY * wiggle;

        // Collision with rotating Sentinel Beacons
        st.beacons.forEach((b) => {
          if (b.type === "sentinel") {
            const distToBeacon = Math.hypot(a.x - b.x, a.y - b.y);
            if (distToBeacon < 28) { // Sentinel absolute protective bubble hit!
              a.hp -= 2; // high damage
              // Spawn shield protection sparks
              for (let i = 0; i < 6; i++) {
                st.particles.push({
                  x: a.x,
                  y: a.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  color: "#f59e0b",
                  size: Math.random() * 2.5 + 1.2,
                  alpha: 1,
                  decay: 0.05,
                });
              }
              sfx.playImpact();
            }
          }
        });

        // Collision checks with Verification laser Blasts
        st.blasts.forEach((bl, bIdx) => {
          const hitDist = Math.hypot(a.x - bl.x, a.y - bl.y);
          if (hitDist <= a.size + bl.size + 2) {
            // Remove blast projectile
            st.blasts.splice(bIdx, 1);
            
            // Damage threat
            a.hp -= 1;
            
            // Kinetic bullet sparks
            for (let i = 0; i < 4; i++) {
              st.particles.push({
                x: bl.x,
                y: bl.y,
                vx: (Math.random() - 0.5) * 2 - bl.vx * 0.1,
                vy: (Math.random() - 0.5) * 2 - bl.vy * 0.1,
                color: bl.color,
                size: Math.random() * 2.2 + 1,
                alpha: 1,
                decay: 0.06,
              });
            }
            sfx.playImpact();
          }
        });

        // If HP depleted, explode, score credits!
        if (a.hp <= 0) {
          st.anomalies.splice(aIdx, 1);
          st.score += 10;
          st.credits += 15; // Earn currency
          st.screenShake = Math.max(st.screenShake, 2.5);

          // Rich digital blast debris
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = 0.5 + Math.random() * 3.5;
            st.particles.push({
              x: a.x,
              y: a.y,
              vx: Math.cos(angle) * velocity,
              vy: Math.sin(angle) * velocity,
              color: a.color,
              size: Math.random() * 3.2 + 1,
              alpha: 1.0,
              decay: 0.03 + Math.random() * 0.03,
            });
          }

          sfx.playExplosion();
          updateReactState();
          return;
        }

        // Damage central core if anomaly slips through bounds
        if (distToCore <= coreRadius + a.size * 0.5) {
          st.anomalies.splice(aIdx, 1);
          st.confidence = Math.max(0, st.confidence - 8); // hit damage
          st.screenShake = Math.max(st.screenShake, 10.0); // high shake

          // Red alarm diagnostic wave
          for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2.0 + Math.random() * 4.0;
            st.particles.push({
              x: coreX,
              y: coreY,
              vx: Math.cos(angle) * velocity,
              vy: Math.sin(angle) * velocity,
              color: "#f43f5e",
              size: Math.random() * 4 + 1.5,
              alpha: 1.0,
              decay: 0.04,
            });
          }

          sfx.playExplosion();
          updateReactState();

          // Check for core shutdown termination (Game Over)
          if (st.confidence <= 0) {
            st.isPlaying = false;
            setIsPlaying(false);
            
            // Save high score if qualified
            if (st.score > highScore) {
              setHighScore(st.score);
              try {
                localStorage.setItem("swarm-game-high-score", String(st.score));
              } catch (e) {
                console.error(e);
              }
            }
          }
          return;
        }

        // Render anomaly character
        const scaleFactor = 1 + Math.sin(cycleTime * 10) * 0.12;
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(cycleTime * 1.5);

        // Core central body spikes
        ctx.fillStyle = a.color;
        ctx.beginPath();
        const numVertices = 5;
        const innerRadius = a.size * 0.45 * scaleFactor;
        const outerRadius = a.size * scaleFactor;
        let rotAngle = Math.PI / 2 * 3;
        const step = Math.PI / numVertices;

        ctx.moveTo(0, -outerRadius);
        for (let i = 0; i < numVertices; i++) {
          ctx.lineTo(Math.cos(rotAngle) * outerRadius, Math.sin(rotAngle) * outerRadius);
          rotAngle += step;
          ctx.lineTo(Math.cos(rotAngle) * innerRadius, Math.sin(rotAngle) * innerRadius);
          rotAngle += step;
        }
        ctx.closePath();
        ctx.fill();

        // Inner core light indicator
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();
      });

      // 7. Render dynamic graphical blast and decay particles
      st.particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          st.particles.splice(index, 1);
          return;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      });

      // Render score and wave overlays in active canvas
      ctx.restore(); // Restore shake transforms

      // Draw active UI overlays manually
      ctx.fillStyle = themeColors.text;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SWARM CREDITS: ${st.credits}EC`, 10, st.height - 10);
      
      ctx.textAlign = "right";
      ctx.fillText(`SCORE: ${st.score}`, st.width - 10, st.height - 10);

      animFrame = requestAnimationFrame(gameTick);
    };

    animFrame = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, isDark, highScore]);

  // Click on canvas triggers firing a verification pulse or placing user Beacons
  const handleCanvasAction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const st = stateRef.current;
    const coreX = st.width / 2;
    const coreY = st.height / 2;

    if (selectedTool === "blast") {
      // Fire blaster projectile from core towards pointer click
      sfx.playLaser();
      const dx = clickX - coreX;
      const dy = clickY - coreY;
      const angle = Math.atan2(dy, dx);
      const speed = 6.0;

      st.blasts.push({
        x: coreX,
        y: coreY,
        targetX: clickX,
        targetY: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        color: isDark ? "#38bdf8" : "#2563eb",
        size: 4.5,
      });
      
    } else {
      // Placing defensive Agent Beacons at target coordinate
      let cost = 0;
      let type: "pathfinder" | "sentinel" | "conductor" = "pathfinder";
      let range = 100;

      if (selectedTool === "pathfinder") {
        cost = 60;
        type = "pathfinder";
        range = 140;
      } else if (selectedTool === "sentinel") {
        cost = 90;
        type = "sentinel";
        range = 45;
      } else if (selectedTool === "conductor") {
        cost = 120;
        type = "conductor";
        range = 100;
      }

      // Check credit balances
      if (st.credits < cost) {
        // Visual buzz feed error indicator
        st.screenShake = 3;
        sfx.playImpact();
        return;
      }

      // Check distance from Core. CANNOT build directly inside core
      const distFromCore = Math.hypot(clickX - coreX, clickY - coreY);
      if (distFromCore < 30) return; // too close

      // Place the beacon card
      st.beacons.push({
        x: clickX,
        y: clickY,
        type,
        angle: Math.random() * Math.PI,
        cooldown: 0,
        range,
        level: 1,
      });

      st.credits -= cost;
      sfx.playSelect();
      updateReactState();
    }
  };

  // Restarts core engine
  const startActivation = () => {
    sfx.init();
    sfx.playSelect();
    
    // Set parameters
    stateRef.current.confidence = 100;
    stateRef.current.score = 0;
    stateRef.current.credits = 100;
    stateRef.current.anomalies = [];
    stateRef.current.blasts = [];
    stateRef.current.beacons = [];
    stateRef.current.particles = [];
    stateRef.current.screenShake = 0;
    stateRef.current.spawnTimer = 0;

    setIsPlaying(true);
    updateReactState();
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#faeffc]/0 relative" id="swarm-minigame-container">
      {/* HUD DASH HEADER */}
      <div className={`p-2 px-3 border-b flex items-center justify-between backdrop-blur-md select-none ${
        isDark ? "bg-[#0b0f19]/90 border-white/5" : "bg-white/90 border-slate-200"
      }`}>
        <div className="flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span className={`text-[10px] font-bold font-mono tracking-wider ${isDark ? "text-gray-300" : "text-slate-800"}`}>
            SWARM DEFENDER v1.0
          </span>
        </div>
        
        {/* SCORE BOARD & HIGH RECORD */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1 text-[10px] font-mono font-bold">
            <span className={isDark ? "text-gray-500" : "text-slate-400"}>HIGH:</span>
            <span className="text-amber-500 flex items-center gap-0.5">
              <Award className="w-3 h-3" />
              {highScore}
            </span>
          </div>

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className={`p-1 rounded cursor-pointer transition-colors ${
              isDark ? "hover:bg-white/5 text-gray-400" : "hover:bg-slate-100 text-slate-500"
            }`}
            title={soundEnabled ? "Mute SFX" : "Unmute SFX"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-red-500" />}
          </button>
        </div>
      </div>

      {/* RENDER CANVAS STAGE AREA */}
      <div 
        ref={containerRef} 
        className="flex-1 min-h-[200px] h-full relative cursor-crosshair group select-none overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasAction}
          className="w-full h-full block"
        />

        {/* WELCOME / PLAY AGAIN INTERACTION GATES */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
            
            <div className="max-w-xs flex flex-col items-center justify-center gap-2 select-none animate-fade-in animate-duration-300">
              <div className="w-10 h-10 rounded-full bg-blue-500/15 border border-blue-500 flex items-center justify-center text-blue-400 mb-1">
                <Cpu className="w-5 h-5 animate-spin" />
              </div>

              <h4 className="text-white text-xs font-bold font-mono tracking-wider uppercase">
                COGNITIVE DRIFT THREAT DETECTED
              </h4>
              <p className="text-[10px] text-gray-300 font-sans leading-relaxed">
                Protect the central neural core! Click to blast errors, or earn Swarm Credits to deploy diagnostic bots on the grid.
              </p>

              {score > 0 && (
                <div className="my-1.5 p-1.5 bg-white/5 border border-white/10 rounded-lg text-center w-full">
                  <div className="text-[9px] font-mono text-gray-400">FINALS COGNITION VERDICTS</div>
                  <div className="text-yellow-400 font-bold text-xs font-mono">Score: {score} pts</div>
                </div>
              )}

              <button
                onClick={startActivation}
                className="mt-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                {score > 0 ? "RE-ARM SWARM DEFENSES" : "ENGAGE SIMULATOR"}
              </button>
            </div>
          </div>
        )}

        {/* LOW CORE CONFIDENCE ALARM HUD PANEL */}
        {isPlaying && confidence <= 40 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono font-bold text-[9px] px-3 py-1 rounded-full animate-bounce flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 animate-pulse text-red-500" />
            CRITICAL INTEGRITY DRIFT: {confidence}% CF
          </div>
        )}
      </div>

      {/* GAME BOTTOM TOOLBAR: BEACON BLUEPRINTS */}
      {isPlaying && (
        <div className={`p-2 border-t grid grid-cols-4 gap-1.5 select-none ${
          isDark ? "bg-[#090d16] border-white/5" : "bg-slate-50 border-slate-200"
        }`}>
          {/* TOOL 0: BLASTER ACTION */}
          <button
            onClick={() => {
              setSelectedTool("blast");
              sfx.playSelect();
            }}
            className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
              selectedTool === "blast"
                ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400"
                : (isDark ? "border-transparent text-gray-400 hover:bg-white/5" : "border-transparent text-slate-600 hover:bg-slate-100")
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[8px] font-mono px-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">FREE</span>
            </div>
            <span className="text-[9px] font-bold mt-1 font-mono leading-none">Blaster</span>
          </button>

          {/* TOOL 1: PATHFINDER TURRET */}
          <button
            onClick={() => {
              setSelectedTool("pathfinder");
              sfx.playSelect();
            }}
            className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
              selectedTool === "pathfinder"
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : (isDark ? "border-transparent text-gray-400 hover:bg-white/5" : "border-transparent text-slate-600 hover:bg-slate-100")
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span className={`text-[8px] font-mono px-1 rounded ${
                credits >= 60 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}>60EC</span>
            </div>
            <span className="text-[9px] font-bold mt-1 font-mono leading-none">Pathfinder</span>
          </button>

          {/* TOOL 2: SENTINEL SHIELD */}
          <button
            onClick={() => {
              setSelectedTool("sentinel");
              sfx.playSelect();
            }}
            className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
              selectedTool === "sentinel"
                ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                : (isDark ? "border-transparent text-gray-400 hover:bg-white/5" : "border-transparent text-slate-600 hover:bg-slate-100")
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <SentinelIcon className="w-3.5 h-3.5 text-amber-500" />
              <span className={`text-[8px] font-mono px-1 rounded ${
                credits >= 90 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
              }`}>90EC</span>
            </div>
            <span className="text-[9px] font-bold mt-1 font-mono leading-none">Sentinel</span>
          </button>

          {/* TOOL 3: CONDUCTOR TESLA GUN */}
          <button
            onClick={() => {
              setSelectedTool("conductor");
              sfx.playSelect();
            }}
            className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
              selectedTool === "conductor"
                ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400"
                : (isDark ? "border-transparent text-gray-400 hover:bg-white/5" : "border-transparent text-slate-600 hover:bg-slate-100")
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <Zap className="w-3.5 h-3.5 text-purple-500 animate-bounce" />
              <span className={`text-[8px] font-mono px-1 rounded ${
                credits >= 120 ? "bg-purple-100 text-purple-800" : "bg-rose-100 text-rose-800"
              }`}>120EC</span>
            </div>
            <span className="text-[9px] font-bold mt-1 font-mono leading-none">Conductor</span>
          </button>
        </div>
      )}
    </div>
  );
};
