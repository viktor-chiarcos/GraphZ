"""Linux-native GraphZ port.

The graph model is the source of truth. Blockly will be an editing projection
of it, and the serializer writes the legacy ``.gphz`` format back out.
"""

from .model import Block, Project, ValidationReport
from .parser import ParseError, load, loads
from .serializer import dumps, dump

__all__ = [
    "Block",
    "Project",
    "ValidationReport",
    "ParseError",
    "load",
    "loads",
    "dump",
    "dumps",
]

__version__ = "0.1.0"
