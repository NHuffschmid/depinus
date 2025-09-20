import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "About": "About",
            "Add new composer to archive": "Add new composer to archive",
            "Add midifile to archive": "Add midifile to archive",
            "Add to playlist": "Add to playlist",
            "Archive": "Archive",
            "Are you sure?": "Are you sure?",
            "Cancel": "Cancel",
            "Close": "Close",
            "Color": "Color",
            "Create new playlist": "Create new playlist",
            "Delete": "Delete",
            "Delete composer": "Delete composer",
            "Delete composer (and associated midi files) from archive permanently?": "Delete composer (and associated midi files) from archive permanently?",
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
            "MidiOut": "Midi Out",
            "No": "No",
            "Out of service": "Out of service",
            "Play": "Play",
            "Playlist": "Playlist",
            "Playlist already exists": "Playlist already exists",
            "Please go to archive to fill this playlist": "Please go to archive to fill this playlist",
            "Remote control": "Remote control",
            "Rename": "Rename",
            "Rename playlist": "Rename playlist",
            "Repeat": "Repeat",
            "Save": "Save",
            "Select composer": "Select composer",
            "Settings": "Settings",
            "Shuffle": "Shuffle",
            "Surname": "Surname",
            "Shutdown": "Shutdown",
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
            "Add midifile to archive": "Midifile zum Archiv hinzufügen",
            "Add to playlist": "Zur Playlist hinzufügen",
            "Archive": "Archiv",
            "Are you sure?": "Sind sie sicher?",
            "Cancel": "Abbrechen",
            "Close": "Schließen",
            "Color": "Farbe",
            "Create new playlist": "Neue Wiedergabeliste erstellen",
            "Delete": "Löschen",
            "Delete composer": "Komponisten löschen",
            "Delete composer (and associated midi files) from archive permanently?": "Komponist (und zugehörige Midi Dateien) dauerhaft aus dem Archiv löschen?",
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
            "MidiOut": "Midi Ausgang",
            "No": "Nein",
            "Out of service": "Außer Betrieb",
            "Play": "Spielen",
            "Playlist": "Wiedergabeliste",
            "Playlist already exists": "Wiedergabeliste existiert bereits",
            "Please go to archive to fill this playlist": "Bitte gehen Sie zum Archiv, um diese Wiedergabeliste zu füllen",
            "Remote control": "Fernsteuerung",
            "Rename": "Umbenennen",
            "Rename playlist": "Wiedergabeliste umbenennen",
            "Repeat": "Wiederholen",
            "Save": "Speichern",
            "Select composer": "Wähle Komponisten",
            "Settings": "Einstellungen",
            "Shuffle": "Zufällige Wiedergabe",
            "Surname": "Familienname",
            "Shutdown": "Herunterfahren",
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
