# ScoreView - MIDI-zu-Notation Visualisierung

## Ziel
Entwicklung der **ScoreView** React-Komponente, die MIDI-Daten in klassische Notenschrift mit Notenlinien, Taktangaben, Schlüsseln etc. konvertiert und parallel zur piano-keyboard Komponente in Echtzeit anzeigt.

## Technische Entscheidungen

### Notation Library: VexFlow
- **Gewählt:** VexFlow (JavaScript/SVG-basiert)
- **Vorteile:** 
  - Direkte JavaScript API - keine Zwischenformate (MusicXML) nötig
  - SVG-Rendering für scharfe Darstellung
  - Große Community, gut dokumentiert
  - Unterstützt alle wichtigen Notationselemente

### React Integration: Eigene Komponente
- **Entscheidung:** Eigene VexFlow-basierte Komponente implementieren
- **Grund:** Verfügbare React-VexFlow Wrapper (`@vexflow/react`, `react-vexflow`, `react-music-score`) sind nicht ausgereift genug
- **Vorteile:**
  - Perfekte Integration mit bestehendem MIDI-System
  - Maßgeschneidert für Real-time Sync
  - Vollständige Kontrolle über Performance und Features
  - Einfachere Wartung ohne externe Dependencies

## Technische Herausforderungen

### 1. MIDI-zu-Notation Konvertierung
- **Input:** MIDI `note_on/note_off` Events mit Timestamps
- **Output:** Notenschrift mit Tonhöhe, Rhythmuswerten, Takte, Pausen
- **Kernproblem:** Quantisierung der MIDI-Timings in saubere Notenwerte

### 2. Multi-Voice Handling
- Violinschlüssel (rechte Hand) + Bassschlüssel (linke Hand)
- Automatische Stimmentrennung basierend auf Tonhöhe
- Polyphonie innerhalb einer Stimme

### 3. Real-time Synchronisation
- Scrolling der Notation parallel zur `play_time`
- Highlighting der aktuell gespielten Noten
- Integration mit bestehendem Timing-System

## Geplante Architektur

```
ScoreView Component
├── MidiParser (MIDI → Note Events)
├── NotationEngine (VexFlow Integration) 
├── QuantizationEngine (Timing → Rhythm)
├── LayoutManager (Multi-Voice, Pagination)
└── SyncController (Real-time Highlighting)
```

## Workflow
```
MIDI Events → Parse & Quantize → VexFlow Objects → SVG Notation
                                        ↓
Real-time Sync ← Current play_time ← Piano Player
```

## Implementierungsstrategie

### Phase 1: Grundlagen
1. Basis React Component mit VexFlow Canvas
2. Einfacher MIDI Parser für Note-Events  
3. Statische Notation für einzelne Töne
4. VexFlow Integration und Rendering

### Phase 2: Timing & Synchronisation
1. Quantisierung-Engine für Rhythmus-Konvertierung
2. Integration mit bestehendem `play_time` System
3. Real-time Highlighting und Scrolling

### Phase 3: Erweiterte Features
1. Multi-Voice Handling (Violin- und Bassschlüssel)
2. Taktangaben und Schlüssel
3. Erweiterte Notation-Elemente
4. Performance-Optimierung

## Integration mit Depinus
- **Bestehende Komponente:** react-piano-keyboard 
- **Neue Komponente:** ScoreView
- **Gemeinsame Datenquelle:** MIDI Events von piano_player.py
- **Gemeinsame Synchronisation:** play_time für Real-time Updates

## Nächste Schritte
1. VexFlow als Dependency hinzufügen
2. Basis React Component erstellen
3. Einfaches MIDI-Parsing implementieren
4. Erste statische Notation rendern
5. Integration mit bestehender Architektur

## Anwendungsbereich
Das Feature macht Depinus zu einem vollwertigen Musiklernsystem mit:
- Visueller Klaviatur (bestehend)
- Klassischer Notendarstellung (neu)
- Synchroner Real-time Wiedergabe beider Ansichten