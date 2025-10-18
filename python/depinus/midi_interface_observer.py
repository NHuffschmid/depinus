import asyncio
import mido

class MidiInterfaceObserver:
    """
    Periodically observes available MIDI output interfaces.
    """
    def __init__(self, interval=5):
        self.interval = interval  # seconds
        self._task = None
        self._running = False
        self._observers = []
        self._last_interfaces = None

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
            if output_names != self._last_interfaces:
                self._last_interfaces = output_names.copy()
                for callback in self._observers:
                    await callback(output_names)
            await asyncio.sleep(self.interval)

    def start(self):
        if not self._task:
            self._task = asyncio.create_task(self._observe())

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
