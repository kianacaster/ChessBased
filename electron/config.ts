import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

interface AppConfig {
  enginePath: string | null;
}

const defaultConfig: AppConfig = {
  enginePath: null,
};

export const loadConfig = (): AppConfig => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  return defaultConfig;
};

export const saveConfig = (config: AppConfig): void => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
};
