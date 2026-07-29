#!/usr/bin/env python3
# =============================================================================
# generate-sounds.py — synthèse des sons PAR DÉFAUT de la table Kýdos Belote.
# -----------------------------------------------------------------------------
# Génère tous les fichiers de mobile/public/sounds/ : effets sonores (jouer une
# carte, émoji, belote, passe, contré, surcontré, hausse d'annonce…) et
# mélodies d'ambiance (une par type de table).
#
# ⚠️ Droits d'auteur : les mélodies sont des compositions du DOMAINE PUBLIC
# (Beethoven, mort en 1827) synthétisées ici par ce script — aucune
# interprétation ni aucun enregistrement protégé n'est utilisé.
#
# Pour REMPLACER un son : déposez simplement votre fichier .wav sous le MÊME NOM
# dans mobile/public/sounds/ (voir docs/SOUNDS.md). Pour régénérer les défauts :
#     python3 mobile/scripts/generate-sounds.py
# =============================================================================
import math
import os
import struct
import wave

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sounds")
SR_FX = 22050      # effets : courts, un peu plus fins
SR_MEL = 16000     # mélodies : plus longues, taille contenue

# ── Synthèse de base ─────────────────────────────────────────────────────────

def note_freq(name: str) -> float:
    """'A4' → 440.0 ; gère les dièses (#) et bémols (b)."""
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    letter, rest = name[0], name[1:]
    semitone = names[letter]
    if rest.startswith("#"): semitone += 1; rest = rest[1:]
    if rest.startswith("b"): semitone -= 1; rest = rest[1:]
    octave = int(rest)
    midi = 12 * (octave + 1) + semitone
    return 440.0 * (2 ** ((midi - 69) / 12))

def tone(freq, dur, sr, vol=0.5, harmonics=(1.0, 0.35, 0.12), attack=0.008, release=None):
    """Une note douce : sinus + harmoniques, enveloppe attaque + décroissance expo."""
    n = int(dur * sr)
    release = release if release is not None else dur
    out = []
    for i in range(n):
        t = i / sr
        env = min(1.0, t / attack) * math.exp(-3.2 * t / release)
        s = sum(a * math.sin(2 * math.pi * freq * (k + 1) * t) for k, a in enumerate(harmonics))
        out.append(vol * env * s / sum(harmonics))
    return out

def silence(dur, sr):
    return [0.0] * int(dur * sr)

def mix(*layers):
    n = max(len(l) for l in layers)
    out = [0.0] * n
    for l in layers:
        for i, v in enumerate(l):
            out[i] += v
    return out

def concat(*parts):
    out = []
    for p in parts:
        out.extend(p)
    return out

def overlap(seq, step, sr):
    """Superpose des notes avec un pas (legato) : seq = [(samples, start_s), ...]."""
    total = int(max(start + len(s) / sr for s, start in seq) * sr) + 1
    out = [0.0] * total
    for s, start in seq:
        base = int(start * sr)
        for i, v in enumerate(s):
            out[base + i] += v
    return out

def write_wav(path, samples, sr):
    peak = max(1e-9, max(abs(s) for s in samples))
    norm = min(1.0, 0.89 / peak)
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * norm)) * 32767)) for s in samples))
    print(f"  ✓ {os.path.relpath(path, OUT)}  ({len(samples)/sr:.2f}s, {os.path.getsize(path)//1024} Ko)")

# ── Effets sonores ───────────────────────────────────────────────────────────

def card_snap(freq_a, freq_b, vol):
    """Claquement de carte : bruit bref filtré + petit 'toc' tonal."""
    import random
    random.seed(7)
    sr = SR_FX
    n = int(0.09 * sr)
    noise = []
    prev = 0.0
    for i in range(n):
        t = i / sr
        env = math.exp(-55 * t)
        raw = random.uniform(-1, 1)
        prev = 0.72 * prev + 0.28 * raw          # léger passe-bas
        noise.append(0.55 * vol * env * prev)
    tick = tone(freq_a, 0.06, sr, vol=0.5 * vol, attack=0.001, release=0.05)
    tock = tone(freq_b, 0.05, sr, vol=0.3 * vol, attack=0.001, release=0.04)
    return mix(noise, tick, concat(silence(0.018, sr), tock))

def fx_all():
    sr = SR_FX
    fx = {}
    # Jouer MA carte : claquement net.
    fx["card-play"] = card_snap(880, 660, 1.0)
    # Carte d'un AUTRE joueur/robot : même claquement, plus doux et plus grave.
    fx["card-other"] = card_snap(620, 470, 0.62)
    # Émoji qui apparaît : petit 'pop' montant.
    fx["emote"] = overlap([(tone(520, 0.07, sr, 0.5, attack=0.002), 0.0),
                           (tone(880, 0.09, sr, 0.45, attack=0.002), 0.05)], 0, sr)
    # Annonce de belote : double carillon clair (belote… rebelote).
    fx["belote"] = overlap([(tone(note_freq("E5"), 0.22, sr, 0.5), 0.0),
                            (tone(note_freq("G5"), 0.30, sr, 0.5), 0.16),
                            (tone(note_freq("C6"), 0.34, sr, 0.35), 0.32)], 0, sr)
    # Passe : blip discret descendant.
    fx["pass"] = overlap([(tone(360, 0.10, sr, 0.4), 0.0),
                          (tone(300, 0.12, sr, 0.32), 0.07)], 0, sr)
    # Hausse d'annonce : deux notes montantes affirmées.
    fx["bid-raise"] = overlap([(tone(note_freq("C5"), 0.11, sr, 0.5), 0.0),
                               (tone(note_freq("E5"), 0.16, sr, 0.5), 0.09)], 0, sr)
    # Hausse AVEC réflexion : montée précédée d'un 'hmm' vibré (hésitation).
    think = []
    for i in range(int(0.28 * sr)):
        t = i / sr
        env = min(1.0, t / 0.02) * math.exp(-2.2 * t / 0.28)
        f = 300 + 26 * math.sin(2 * math.pi * 5.2 * t)   # vibrato lent = réflexion
        think.append(0.34 * env * math.sin(2 * math.pi * f * t))
    fx["bid-reflexion"] = concat(think, silence(0.03, sr),
                                 overlap([(tone(note_freq("C5"), 0.11, sr, 0.5), 0.0),
                                          (tone(note_freq("E5"), 0.16, sr, 0.5), 0.09)], 0, sr))
    # Contré : alerte à deux tons secs.
    fx["contre"] = overlap([(tone(note_freq("A4"), 0.10, sr, 0.55, harmonics=(1, 0.5, 0.25)), 0.0),
                            (tone(note_freq("Eb5"), 0.16, sr, 0.55, harmonics=(1, 0.5, 0.25)), 0.10)], 0, sr)
    # Surcontré : trois tons, plus haut, plus tendu.
    fx["surcontre"] = overlap([(tone(note_freq("A4"), 0.09, sr, 0.55, harmonics=(1, 0.5, 0.25)), 0.0),
                               (tone(note_freq("Eb5"), 0.09, sr, 0.55, harmonics=(1, 0.5, 0.25)), 0.09),
                               (tone(note_freq("A5"), 0.18, sr, 0.55, harmonics=(1, 0.5, 0.25)), 0.18)], 0, sr)
    # Ramassage du pli : petit balayage descendant.
    sweep = []
    for i in range(int(0.22 * sr)):
        t = i / sr
        env = min(1.0, t / 0.01) * math.exp(-9 * t)
        f = 900 - 2200 * t
        sweep.append(0.4 * env * math.sin(2 * math.pi * max(120, f) * t))
    fx["trick-collect"] = sweep
    return fx

# ── Mélodies (compositions domaine public, synthèse originale) ───────────────

def melody(notes, bpm, sr=SR_MEL, vol=0.42, gap=0.02, legato=1.25):
    """notes = [(nom|None, durée_en_temps)] ; None = soupir. Boucle propre."""
    beat = 60.0 / bpm
    seq, t = [], 0.0
    for name, beats in notes:
        d = beats * beat
        if name:
            seq.append((tone(note_freq(name), d * legato, sr, vol, release=d * legato), t))
        t += d + gap
    out = overlap(seq, 0, sr)
    out.extend(silence(0.35, sr))                       # respiration avant la boucle
    fade = int(0.05 * sr)                                # anti-clic en bord de boucle
    for i in range(fade):
        out[i] *= i / fade
        out[-1 - i] *= i / fade
    return out

def melodies_all():
    m = {}
    # DÉFAUT — « Ode à la joie » (Beethoven, 9e symphonie) : LA mélodie « la la ».
    ode = [("E4",1),("E4",1),("F4",1),("G4",1),("G4",1),("F4",1),("E4",1),("D4",1),
           ("C4",1),("C4",1),("D4",1),("E4",1),("E4",1.5),("D4",0.5),("D4",2),
           ("E4",1),("E4",1),("F4",1),("G4",1),("G4",1),("F4",1),("E4",1),("D4",1),
           ("C4",1),("C4",1),("D4",1),("E4",1),("D4",1.5),("C4",0.5),("C4",2)]
    m["melody-default"] = melody(ode, bpm=112)
    # ENTRAÎNEMENT (table locale) — « Für Elise » (Beethoven), motif léger.
    elise = [("E5",0.5),("Eb5",0.5),("E5",0.5),("Eb5",0.5),("E5",0.5),("B4",0.5),("D5",0.5),("C5",0.5),
             ("A4",1.5),(None,0.5),("C4",0.5),("E4",0.5),("A4",0.5),("B4",1.5),(None,0.5),
             ("E4",0.5),("G#4",0.5),("B4",0.5),("C5",1.5),(None,0.5)]
    m["melody-training"] = melody(elise, bpm=132, vol=0.36)
    # ÉQUIPE — petite valse originale (composition maison, aucun droit).
    valse = [("C4",1),("E4",0.5),("G4",0.5),("C5",1),("G4",0.5),("E4",0.5),
             ("A3",1),("C4",0.5),("E4",0.5),("A4",1),("E4",0.5),("C4",0.5),
             ("F3",1),("A3",0.5),("C4",0.5),("F4",1),("C4",0.5),("A3",0.5),
             ("G3",1),("B3",0.5),("D4",0.5),("G4",2)]
    m["melody-team"] = melody(valse, bpm=140, vol=0.34)
    # VIP — arpèges lents façon « Clair de lune » (Beethoven, sonate n°14).
    moon = [("G#3",0.5),("C#4",0.5),("E4",0.5)] * 4 + \
           [("A3",0.5),("C#4",0.5),("E4",0.5)] * 2 + \
           [("A3",0.5),("D4",0.5),("F#4",0.5)] * 2 + \
           [("G#3",0.5),("C#4",0.5),("E4",0.5)] * 2 + [("G#3",1.5)]
    m["melody-vip"] = melody(moon, bpm=84, vol=0.30, legato=1.6)
    # COMPÉTITION — motif de la 5e symphonie (Beethoven) : énergique.
    fifth = [("G4",0.5),("G4",0.5),("G4",0.5),("Eb4",2),(None,0.5),
             ("F4",0.5),("F4",0.5),("F4",0.5),("D4",2),(None,0.5),
             ("G4",0.5),("G4",0.5),("G4",0.5),("Eb4",1),("Ab4",0.5),("Ab4",0.5),("Ab4",0.5),("G4",1),
             ("Eb5",0.5),("Eb5",0.5),("Eb5",0.5),("C5",2)]
    m["melody-competition"] = melody(fifth, bpm=118, vol=0.40)
    return m

# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print("Effets sonores :")
    for name, samples in fx_all().items():
        write_wav(os.path.join(OUT, f"{name}.wav"), samples, SR_FX)
    print("Mélodies :")
    for name, samples in melodies_all().items():
        write_wav(os.path.join(OUT, f"{name}.wav"), samples, SR_MEL)
    print("Terminé — fichiers dans mobile/public/sounds/")
