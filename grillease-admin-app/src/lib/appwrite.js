import { Client, Account, Databases, Storage, Realtime } from "appwrite";

console.log('DEBUG: Appwrite endpoint:', import.meta.env.VITE_APPWRITE_ENDPOINT);
console.log('DEBUG: Appwrite project:', import.meta.env.VITE_APPWRITE_PROJECT);

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const realtime = new Realtime(client);

export default client;
