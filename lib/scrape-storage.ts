"use client";
import type { ScrapeProject } from "./scrape-types";

const DB_NAME = "sitetransformer-scrapes";
const DB_VERSION = 1;
const STORE = "projects";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB konnte nicht geoeffnet werden."));
  });
}

export async function saveScrapeProject(project: ScrapeProject) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Scrape-Projekt konnte nicht gespeichert werden."));
  });
  db.close();
}

export async function loadScrapeProject(id: string): Promise<ScrapeProject | null> {
  const db = await openDb();
  const project = await new Promise<ScrapeProject | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve((request.result as ScrapeProject | undefined) || null);
    request.onerror = () => reject(request.error || new Error("Scrape-Projekt konnte nicht geladen werden."));
  });
  db.close();
  return project;
}

export async function deleteScrapeProject(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Scrape-Projekt konnte nicht geloescht werden."));
  });
  db.close();
}
