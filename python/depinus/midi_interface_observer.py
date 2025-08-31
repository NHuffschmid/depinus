import asyncio
import mido
from .config_utils import persist_config_setting

class MidiInterfaceObserver:
    """
    Periodically observes available MIDI output interfaces.
    """
    def __init__(self, interval=5):
        self.interval = interval  # seconds
        self._task = None
        self._running = False

    async def _observe(self):
        self._running = True
        while self._running:
            output_names = mido.get_output_names()
            # Save as comma-separated string in depinus.conf under section 'Midi', key 'output_interfaces'
            persist_config_setting('Midi', 'output_interfaces', ','.join(output_names))
            await asyncio.sleep(self.interval)

    def start(self):
        if not self._task:
            self._task = asyncio.create_task(self._observe())

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
