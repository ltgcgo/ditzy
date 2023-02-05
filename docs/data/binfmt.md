# Binary format
## Concepts
### MIDI
MIDI is a standard for real-time communication between devices. It's originally designed for musical instruments, but has found its places in other fields requiring synchronization and/or automation as well, such as stage lighting systems.

### System Exclusive Messages
System Exclusive (SysEx) messages are a type of MIDI message, that's customly defined by vendors, and will typically only have any effect on specific vendors.

### Variable Length Value
Variable Length Value (VLV) is a way of encoding integer values to multiple bytes, utilizing as many bits inside as they want. With VLV, integer values can be as large as they want.

VLV is defined as a part of Standard MIDI File (SMF) Format Specification.

A VLV can take multiple bytes, and all data encoded are stored in Big-Endian format. VLV bytes use the bit before actual values of each byte to indicate whether or not to continue decoding, and the rest to carry actual values.

Examples below.

| Bits | Value (hex) | Value (binary) | VLV (binary) | VLV (hex) |
| ---- | ----------- | -------------- | ------------ | --------- |
| 7    | `43` | `01000011` | `01000011` | `43` |
| 6    | `43` | `01000011` | `01000001 00000011` | `4103` |
| 7    | `1c57` | `00011100`<br/>`01010111` | `10111000`<br/>`01010111` | `b857` |
| 7    | `ad41296` | `00001010`<br/>`11010100`<br/>`00010010`<br/>`10010110` | `11010110`<br/>`11010000`<br/>`10100101`<br/>`00010110` | `d6d0a516` |

## Specification
### Structure
Each Ditzy message is structured like follows. As such, Ditzy messages can be stored as `.syx` blobs, and control messages without payloads can be embeded to standard MIDI files.

| Length | Value | Description |
| ------ | ----- | ----------- |
| (any)  | (any) | Any data of any length, as long as they do not contain the start byte sequence. |
| 5 | `0xf0 7e 7f 04 40` | The start sequence of Ditzy payload. |
| ≥4 | (see below) | Control messages. A single control message takes at least 4 bytes. |
| 1 | `0xf7` | SysEx, End of Exclusive. |
| (any) | (any) | Payload data. |

#### Start byte sequence
| Length | Value | Description |
| ------ | ----- | ----------- |
| 1 | `0xf0` | SysEx, Start of Exclusive. |
| 1 | `0x7e` | General MIDI Universal Non-realtime. |
| 1 | `0x7f` | Device ID. Set to `127` for universal broadcast. |
| 1 | `0x04` | Command group: device control. |
| 1 | `0x40` | Command subgroup: Ditzy meek control messages.<br/>This subgroup is considered invalid to most actual synthesizers. |

#### Control message
| Length | Value | Desctiption |
| ------ | ----- | ----------- |
| 1 | (see below) | Command. |
| (variable) | (6-bit VLV) | Connection ID, usually selected between 0 and 2<sup>48</sup> - 1. |
| (variable) | (6-bit VLV) | Command dependent value. |
| (variable) | (6-bit VLV) | Message ID, usually iterated between 0 and 2<sup>24</sup> - 1. |

### Command
#### `0`: New connection
Creates a new connection. Will return an error if said connection already exists.

CDV indicates nothing.

#### `1`: Close connection
Closes a connection, or used as a way to send error messages.

When CDV is `0`, no error messages are sent. Anything greater than `0` is the length of an error message.

#### `2`: Test connection
Tests a connection. CDV indicates a test type.

Responses should have the same message ID as requests.

##### Types
* `0`: Latency test.

#### `3`: Jump
Make the pointer go forward the length set in CDV. If the payload contains junk bytes, this command can be used to skip over these junk bytes.

#### `4`: Send
Send a message from payload, with length set in CDV. A length of `0` effectively means a keep-alive request.

#### `5`: Acknowledge
Acknowledge a sent message. CDV indicates nothing.

#### `6`: Enable feature
Try enabling a feature, with details set in payload, and CDV indicating its length.

#### `7`: Disable feature
Try disabling a feature, with details set in payload, and CDV indicating its length.