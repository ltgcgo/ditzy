# Binary format
## Concepts
### MIDI
MIDI is a standard for real-time communication between devices. It's originally designed for musical instruments, but has found its places in other fields requiring synchronization and/or automation as well, such as stage lighting systems.

### System Exclusive Messages
System Exclusive (SysEx) messages are a type of MIDI message, that's customly defined by vendors, and will typically only have any effect on specific vendors.

### Variable Length Value
Variable Length Value (VLV) is a way of encoding integer values. With VLV, integer values can be as large as they want.

VLV is defined as a part of Standard MIDI File (SMF) Format Specification.

A VLV can take multiple bytes, and all data encoded are stored in Big-Endian format. VLV bytes use the first bit of each byte to indicate whether or not to continue decoding, and the rest to carry actual values.

Examples below.

| Value (hex) | Value (binary) | VLV (binary) | VLV (hex) |
| ----------- | -------------- | ------------ | --------- |
| `43` | `01000011` | `01000011` | `43` |
| `1c57` | `00011100`<br/>`01010111` | `10111000`<br/>`01010111` | `b857` |
| `ad41296` | `00001010`<br/>`11010100`<br/>`00010010`<br/>`10010110` | `11010110`<br/>`11010000`<br/>`10100101`<br/>`01010110` | `d6d0a556` |

## Structure