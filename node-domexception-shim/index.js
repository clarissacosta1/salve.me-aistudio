// In modern Node.js environments (v18+), DOMException is globally available.
// This shim provides reference to globalThis.DOMException without any deprecated dependencies.
module.exports = globalThis.DOMException;
