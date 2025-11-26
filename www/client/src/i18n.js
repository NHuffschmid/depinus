import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "About": "About",
            "Add new composer to archive": "Add new composer to archive",
            "Add midifile to archive": "Add MIDI file to archive",
            "Add to playlist": "Add to playlist",
            "Archive": "Archive",
            "Are you sure?": "Are you sure?",
            "Change order": "Change order",
            "Cancel": "Cancel",
            "Close": "Close",
            "Color": "Color",
            "Create new playlist": "Create new playlist",
            "Delete": "Delete",
            "Delete composer": "Delete composer",
            "Delete composer (and associated midi files) from archive permanently?": "Delete composer (and associated MIDI files) from archive permanently?",
            "Delete from archive permanently?": "Delete from archive permanently?",
            "Delete playlist": "Delete playlist",
            "Delete playlist permanently?": "Delete playlist permanently?",            "Demo": "Demo",
            "Demo": "Demo",
            "Dynamics": "Dynamics",
            "Edit": "Edit",
            "Edit composer": "Edit composer",
            "Export": "Export",
            "ExportArchive": "Export archive",
            "FirstName": "First name",
            "ImageFile": "Image file",
            "ImportArchive": "Import archive",
            "Language": "Language",
            "MidiOut": "MIDI Out",
            "No": "No",
            "Out of service": "Out of service",
            "Play": "Play",
            "Playlist": "Playlist",
            "Playlist already exists": "Playlist already exists",
            "Please go to archive to fill this playlist": "Please go to archive to fill this playlist",
            "Remote control": "Remote control",
            "Remove from playlist": "Remove from playlist",
            "Rename": "Rename",
            "Rename playlist": "Rename playlist",
            "Repeat": "Repeat",
            "Save": "Save",
            "Select composer": "Select composer",
            "Select playlist": "Select playlist",
            "Settings": "Settings",
            "Shuffle": "Shuffle",
            "Skrjabin mode": "Scriabin mode", // Skrjabin is german spelling 
            "Surname": "Surname",
            "Shutdown": "Shutdown",
            "Start playlist from here": "Start playlist from here",
            "Tempo": "Tempo",
            "Title": "Title",
            "Transposition": "Transposition",
            "UpdateFailed": "Update failed",
            "UploadFailed": "Upload failed",
            "Yes": "Yes"
        }
    },
    de: {
        translation: {
            "About": "Über",
            "Add new composer to archive": "Neuen Komponisten zum Archiv hinzufügen",
            "Add midifile to archive": "MIDI-Datei zum Archiv hinzufügen",
            "Add to playlist": "Zur Playlist hinzufügen",
            "Archive": "Archiv",
            "Are you sure?": "Sind sie sicher?",
            "Cancel": "Abbrechen",
            "Change order": "Reihenfolge ändern",
            "Close": "Schließen",
            "Color": "Farbe",
            "Create new playlist": "Neue Wiedergabeliste erstellen",
            "Delete": "Löschen",
            "Delete composer": "Komponisten löschen",
            "Delete composer (and associated midi files) from archive permanently?": "Komponist (und zugehörige MIDI Dateien) dauerhaft aus dem Archiv löschen?",
            "Delete from archive permanently?": "Dauerhaft aus dem Archiv löschen?",
            "Delete playlist": "Wiedergabeliste löschen",
            "Delete playlist permanently?": "Wiedergabeliste dauerhaft löschen?",
            "Demo": "Demo",
            "Dynamics": "Dynamik",
            "Edit": "Bearbeiten",
            "Edit composer": "Komponisten bearbeiten",
            "Export": "Exportieren",
            "ExportArchive": "Archiv exportieren",
            "FirstName": "Vorname",
            "ImageFile": "Bilddatei",
            "ImportArchive": "Archiv importieren",
            "Language": "Sprache",
            "MidiOut": "MIDI Ausgang",
            "No": "Nein",
            "Out of service": "Außer Betrieb",
            "Play": "Spielen",
            "Playlist": "Wiedergabeliste",
            "Playlist already exists": "Wiedergabeliste existiert bereits",
            "Please go to archive to fill this playlist": "Bitte gehen Sie zum Archiv, um diese Wiedergabeliste zu füllen",
            "Remote control": "Fernsteuerung",
            "Remove from playlist": "Aus der Wiedergabeliste entfernen",
            "Rename": "Umbenennen",
            "Rename playlist": "Wiedergabeliste umbenennen",
            "Repeat": "Wiederholen",
            "Save": "Speichern",
            "Select composer": "Wähle Komponisten",
            "Select playlist": "Wähle Wiedergabeliste",
            "Settings": "Einstellungen",
            "Shuffle": "Zufällige Wiedergabe",
            "Skrjabin mode": "Skrjabin Modus",
            "Surname": "Familienname",
            "Shutdown": "Herunterfahren",
            "Start playlist from here": "Wiedergabeliste von hier starten",
            "Tempo": "Tempo",
            "Title": "Titel",
            "Transposition": "Transposition",
            "UpdateFailed": "Aktualisierung fehlgeschlagen",
            "UploadFailed": "Hochladen fehlgeschlagen",
            "Yes": "Ja"
        }
    }
};

const DETECTION_OPTIONS = {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage']
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        detection: DETECTION_OPTIONS,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
