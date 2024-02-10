import ffprobe from "@ffprobe-installer/ffprobe";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export const GENERATORNAME = `POD GENERATOR`;

const DOCS = `POD GENERATOR
v0.1a

jimmy, 2024`;

async function getVersion(): Promise<string> {
  return (
    JSON.parse(await fs.readFile("package.json", "utf-8")) as {
      version: string;
    }
  ).version;
}



const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Type, duration in seconds, and size in bytes
 */
export interface AudioMetadata {
  type: string;
  duration: number;
  size: number;
}

export async function getAudioMetadata(filePath: string, emit: boolean = false): Promise<AudioMetadata> {
  const ffprobePath = ffprobe.path;
  const ffprobeProcess = spawn(ffprobePath, ["-show_format", filePath]);
  const promise = new Promise<AudioMetadata>((res, rej) => {
    ffprobeProcess.stdout.on("data", (data) => {
      const result = String(data);
      if (emit) {
        console.log(result);
        fs.writeFile(path.join(__dirname, "audioData.txt"), result);
      }
      const durationMatch = /duration=([0-9\.]+)/.exec(result);
      const sizeMatch = /size=([0-9]+)/.exec(result);
      const duration = Number(durationMatch[1]);
      const size = Number(sizeMatch[1]);
      if (!isNaN(duration) && !isNaN(size)) {
        res({
          size,
          duration,
          type: "",
        });
      }
      rej(() => {
        console.error(`Invalid. Received: { duration: ${durationMatch}, size: ${size} }`);
      });
    });
  });
  return promise;
}

export async function importJSON<T>(path: string): Promise<T> {
  try {
    const fileContents = await fs.readFile(path, "utf-8");
    return (await JSON.parse(fileContents)) as T;
  } catch {
    throw new Error(`File ${path} could not be imported`);
  }
}

//// Format

export function formatDateISO8601(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getDate()}`;
}

export function dateToRFC2822(date: Date): string {
  const weekday = String(weekdays[date.getDay()]);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(months[date.getMonth()]);
  const year = String(date.getFullYear());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const timezone = String(date.getTimezoneOffset()).padStart(4, "0");

  return `${weekday}, ${day} ${month} ${year} ${hour}:${minute}:${second} ${date.getTimezoneOffset() >= 0 ? "+" : "-"}${timezone}`;
}

export function formatDurationHHMMSS(timeInSeconds: number): string {
  timeInSeconds = Math.floor(timeInSeconds);
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

export function formatEpCode(season: number, episode: number): string {
  return `s${String(season).padStart(2, "0")}-e${String(episode).padStart(2, "0")}`;
}
