import { EventEmitter } from "events";

// Singleton — ponte entre rotas e Socket.io
export const eventosTorneio = new EventEmitter();
