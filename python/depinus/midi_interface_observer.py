import asyncio
import mido

from depinus import logger


class MidiInterfaceObserver:
    """
    Periodically observes the available MIDI interfaces.
    """
    def __init__(self, interval=5):
        self.interval = interval  # seconds
        self._task = None
        self._running = False
        self._observers = []
        self._last_output_interfaces = None
        self._last_input_interfaces = None

    def register(self, callback):
        """Register a callback to be notified when interfaces change."""
        if callback not in self._observers:
            self._observers.append(callback)

    def unregister(self, callback):
        if callback in self._observers:
            self._observers.remove(callback)

    async def _observe(self):
        self._running = True
        while self._running:

            output_names = mido.get_output_names()
            input_names = mido.get_input_names()

            # Filter out virtual RtMidi client ports
            output_names = [name for name in output_names if not name.startswith('RtMidiIn Client:') and not name.startswith('Midi Through:')]
            input_names = [name for name in input_names if not name.startswith('RtMidiOut Client:') and not name.startswith('Midi Through:')]

            changed = False
            if output_names != self._last_output_interfaces:
                self._last_output_interfaces = output_names.copy()
                logger.info('MIDI output interfaces changed: %s', output_names)
                changed = True
            if input_names != self._last_input_interfaces:
                self._last_input_interfaces = input_names.copy()
                logger.info('MIDI input interfaces changed: %s', input_names)
                changed = True
            if changed:
                midi_ports = {
                    'outputs': output_names,
                    'inputs': input_names
                }
                for callback in self._observers:
                    await callback(midi_ports)
            await asyncio.sleep(self.interval)

    def start(self):
        if not self._task:
            self._task = asyncio.create_task(self._observe())

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
