import { app } from "./app";

export async function iniciarServidor() {
  await app();
}

iniciarServidor();
