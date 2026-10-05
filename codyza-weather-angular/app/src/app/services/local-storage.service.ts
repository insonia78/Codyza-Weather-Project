import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  getItem<T>(key: string): T | null {
    if (!this.isAvailable()) {
      return null;
    }

    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch (error) {
      console.error(`Failed to parse localStorage value for key "${key}".`, error);
      localStorage.removeItem(key);
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to persist localStorage value for key "${key}".`, error);
    }
  }

  removeItem(key: string): void {
    if (!this.isAvailable()) {
      return;
    }

    localStorage.removeItem(key);
  }

  removeItems(keys: string[]): void {
    if (!this.isAvailable()) {
      return;
    }

    keys.forEach((key) => {
      localStorage.removeItem(key);
    });
  }

  private isAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
